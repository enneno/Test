import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lumi-cron-secret",
};

const EMAIL_RETRY_ATTEMPTS = 3;

type BookingNotification = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  note?: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  status: string;
  service_name?: string;
  service_price_text?: string;
  coupon_code?: string;
  coupon_title?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "Lumi Nails <luminails.xx@gmail.com>";
    const replyToEmail = Deno.env.get("REPLY_TO_EMAIL") || "luminails.xx@gmail.com";
    const cronSecret = Deno.env.get("BOOKING_NOTIFICATIONS_SECRET") || Deno.env.get("CRON_SECRET") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: "missing_supabase_environment" }, 500);
    }

    if (!resendApiKey) {
      return json({ ok: false, error: "missing_resend_api_key" }, 500);
    }

    if (!cronSecret) {
      return json({ ok: false, error: "missing_booking_notifications_secret" }, 500);
    }

    const requestSecret = req.headers.get("x-lumi-cron-secret") || "";
    if (requestSecret !== cronSecret) {
      return json({ ok: false, error: "not_authorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const limit = clampNumber(body.limit, 1, 50, 20);
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const siteContent = await loadSiteContent(supabase);
    const location = String(siteContent?.kapcsolat?.cim || "2800 Tatabánya, Kós Károly út");
    const instagramUrl = String(siteContent?.kapcsolat?.instagramUzenet || siteContent?.kapcsolat?.instagram || "https://www.instagram.com/luminails.xx/");
    const reviewUrl = String(
      Deno.env.get("GOOGLE_REVIEW_URL")
      || siteContent?.kapcsolat?.googleErtekelesUrl
      || siteContent?.kapcsolat?.terkepUrl
      || "https://www.google.com/search?q=Lumi+Nails+Tatab%C3%A1nya+Google+%C3%A9rt%C3%A9kel%C3%A9s"
    );

    const reminders = await claimRows(supabase, "claim_due_booking_reminders", limit);
    const reminderResults = await processRows(reminders, async (booking) => {
      const emailBooking = await enrichBookingCoupon(supabase, booking);
      await sendReminderEmail({ booking: emailBooking, resendApiKey, fromEmail, replyToEmail, siteContent, location, instagramUrl });
      await finishRow(supabase, "finish_booking_reminder", booking.id, true);
    }, async (booking, error) => {
      await finishRow(supabase, "finish_booking_reminder", booking.id, false, errorMessage(error));
    });

    const reviewRequests = await claimRows(supabase, "claim_due_booking_review_requests", limit);
    const reviewResults = await processRows(reviewRequests, async (booking) => {
      const emailBooking = await enrichBookingCoupon(supabase, booking);
      await sendReviewRequestEmail({ booking: emailBooking, resendApiKey, fromEmail, replyToEmail, siteContent, location, instagramUrl, reviewUrl });
      await finishRow(supabase, "finish_booking_review_request", booking.id, true);
    }, async (booking, error) => {
      await finishRow(supabase, "finish_booking_review_request", booking.id, false, errorMessage(error));
    });

    return json({
      ok: true,
      reminders: reminderResults,
      review_requests: reviewResults,
    });
  } catch (error) {
    console.error("process-booking-notifications unexpected error", errorMessage(error));
    return json({ ok: false, error: errorMessage(error) }, 500);
  }
});

async function claimRows(supabase: any, rpcName: string, limit: number): Promise<BookingNotification[]> {
  const { data, error } = await supabase.rpc(rpcName, { p_limit: limit });

  if (error) {
    throw new Error(`${rpcName}: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

async function enrichBookingCoupon(supabase: any, booking: BookingNotification): Promise<BookingNotification> {
  const { data, error } = await supabase
    .from("bookings")
    .select("coupon_code,coupon_title")
    .eq("id", booking.id)
    .maybeSingle();

  if (error) {
    console.warn("booking coupon load failed", { bookingId: booking.id, error: error.message });
    return booking;
  }

  return {
    ...booking,
    coupon_code: String(data?.coupon_code || ""),
    coupon_title: String(data?.coupon_title || ""),
  };
}

async function finishRow(supabase: any, rpcName: string, bookingId: string, success: boolean, error = "") {
  const { error: rpcError } = await supabase.rpc(rpcName, {
    p_booking_id: bookingId,
    p_success: success,
    p_error: error || null,
  });

  if (rpcError) {
    console.warn(`${rpcName} failed`, { bookingId, success, error: rpcError.message });
  }
}

async function processRows(
  rows: BookingNotification[],
  onSuccess: (booking: BookingNotification) => Promise<void>,
  onError: (booking: BookingNotification, error: unknown) => Promise<void>,
) {
  const results: Array<{ booking_id: string; ok: boolean; error?: string }> = [];

  for (const booking of rows) {
    try {
      await onSuccess(booking);
      results.push({ booking_id: booking.id, ok: true });
    } catch (error) {
      const message = errorMessage(error);
      console.error("booking notification failed", { bookingId: booking.id, error: message });
      await onError(booking, error);
      results.push({ booking_id: booking.id, ok: false, error: message });
    }
  }

  return {
    found: rows.length,
    sent: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

async function sendReminderEmail(options: {
  booking: BookingNotification;
  resendApiKey: string;
  fromEmail: string;
  replyToEmail: string;
  siteContent: any;
  location: string;
  instagramUrl: string;
}) {
  const { booking, resendApiKey, fromEmail, replyToEmail, siteContent, location, instagramUrl } = options;
  const appointmentText = appointmentRange(booking);
  const coupon = couponSummary(booking.coupon_code, booking.coupon_title);
  const couponRows: Array<[string, unknown]> = coupon ? [["Kupon", coupon]] : [];
  const variables = notificationVariables(booking, appointmentText, location, instagramUrl, "");
  const template = emailTemplate(siteContent?.email?.emlekezteto, {
    targy: "Emlékeztető: holnap Lumi Nails időpontod van",
    cim: "Holnap várlak az időpontodon",
    szoveg: "Szia {nev}!\n\nCsak szeretnélek emlékeztetni, hogy holnap vártalak a foglalt időpontodra. A részleteket lent találod.\n\nHa bármi közbejönne, kérlek írj Instagramon minél hamarabb.",
  }, variables);

  const html = pageHtml(`
    <h1>${escapeHtml(template.title)}</h1>
    ${paragraphsHtml(template.message)}
    ${detailTable([
      ["Szolgáltatás", serviceName(booking)],
      ...couponRows,
      ["Időpont", appointmentText],
      ["Helyszín", location],
    ])}
    <p class="muted">Ha kérdésed van vagy módosítani szeretnél, kérlek Instagramon írj üzenetet.</p>
    <p style="margin:22px 0;">
      <a href="${escapeAttribute(instagramUrl)}" class="lumi-email-button" style="display:inline-block;padding:12px 18px;background:#302824;color:#fffaf6;border:1px solid #302824;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.3px;">Instagram üzenet</a>
    </p>
    <p>Lumi Nails</p>
  `);

  const text = [
    template.message,
    "",
    `Szolgáltatás: ${serviceName(booking)}`,
    ...(coupon ? [`Kupon: ${coupon}`] : []),
    `Időpont: ${appointmentText}`,
    `Helyszín: ${location}`,
    "",
    `Instagram: ${instagramUrl}`,
    "",
    "Lumi Nails",
  ].join("\n");

  await sendEmailWithRetry(resendApiKey, fromEmail, booking.customer_email, replyToEmail, template.subject, html, text);
}

async function sendReviewRequestEmail(options: {
  booking: BookingNotification;
  resendApiKey: string;
  fromEmail: string;
  replyToEmail: string;
  siteContent: any;
  location: string;
  instagramUrl: string;
  reviewUrl: string;
}) {
  const { booking, resendApiKey, fromEmail, replyToEmail, siteContent, location, instagramUrl, reviewUrl } = options;
  const appointmentText = appointmentRange(booking);
  const coupon = couponSummary(booking.coupon_code, booking.coupon_title);
  const couponRows: Array<[string, unknown]> = coupon ? [["Kupon", coupon]] : [];
  const variables = notificationVariables(booking, appointmentText, location, instagramUrl, reviewUrl);
  const template = emailTemplate(siteContent?.email?.ertekelesKeres, {
    targy: "Köszönöm, hogy nálam jártál",
    cim: "Köszönöm a bizalmadat",
    szoveg: "Szia {nev}!\n\nKöszönöm, hogy nálam jártál. Remélem, elégedett vagy a körmeiddel. Ha van egy perced, nagyon sokat segítene, ha írnál egy rövid Google értékelést.\n\nÉrtékelés link: {ertekelesLink}",
  }, variables);
  const cleanMessage = removeReviewLinkLine(template.message);

  const html = pageHtml(`
    <h1>${escapeHtml(template.title)}</h1>
    ${paragraphsHtml(cleanMessage)}
    <p style="margin:22px 0;">
      <a href="${escapeAttribute(reviewUrl)}" class="lumi-email-button" style="display:inline-block;padding:12px 18px;background:#302824;color:#fffaf6;border:1px solid #302824;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.3px;">Google értékelés írása</a>
    </p>
    ${detailTable([
      ["Szolgáltatás", serviceName(booking)],
      ...couponRows,
      ["Időpont", appointmentText],
    ])}
    <p class="muted">Ha bármi észrevételed van, vagy úgy érzed, valami nem volt az igazi, nyugodtan írj rám Instagramon, szívesen megbeszéljük.</p>
    <p style="margin:22px 0;">
      <a href="${escapeAttribute(instagramUrl)}" class="lumi-email-button" style="display:inline-block;padding:12px 18px;background:#fffaf6;color:#302824;border:1px solid #cdbdb5;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.3px;">Instagram üzenet</a>
    </p>
    <p>Lumi Nails</p>
  `);

  const text = [
    cleanMessage,
    "",
    `Google értékelés: ${reviewUrl}`,
    "",
    `Szolgáltatás: ${serviceName(booking)}`,
    ...(coupon ? [`Kupon: ${coupon}`] : []),
    `Időpont: ${appointmentText}`,
    "",
    `Ha bármi nem volt rendben, írj Instagramon: ${instagramUrl}`,
    "",
    "Lumi Nails",
  ].join("\n");

  await sendEmailWithRetry(resendApiKey, fromEmail, booking.customer_email, replyToEmail, template.subject, html, text);
}

async function loadSiteContent(supabase: any) {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "site_content")
    .maybeSingle();

  if (error) {
    console.warn("process-booking-notifications site content load failed", error.message);
    return {};
  }

  return data?.value && typeof data.value === "object" ? data.value : {};
}

function notificationVariables(
  booking: BookingNotification,
  appointmentText: string,
  location: string,
  instagramUrl: string,
  reviewUrl: string,
) {
  return {
    nev: booking.customer_name,
    szolgaltatas: serviceName(booking),
    idopont: appointmentText,
    helyszin: location,
    instagram: instagramUrl,
    ertekelesLink: reviewUrl,
  };
}

function normalizeTemplateText(value: unknown) {
  return String(value || "")
    .replace(/\\\\r/g, "\r")
    .replace(/\\\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n");
}
function emailTemplate(source: any, fallback: any, variables: Record<string, string>) {
  return {
    subject: applyVariables(normalizeTemplateText(source?.targy || fallback.targy), variables),
    title: applyVariables(normalizeTemplateText(source?.cim || fallback.cim), variables),
    message: applyVariables(normalizeTemplateText(source?.szoveg || fallback.szoveg), variables),
  };
}

function applyVariables(value: unknown, variables: Record<string, string>) {
  return String(value || "")
    .replace(/\{(nev|szolgaltatas|idopont|helyszin|instagram|ertekelesLink)\}/g, (_match, key) => variables[key] || "")
    .replace(/\{\s*(https?:\/\/[^}\s]+)\s*\}/g, "$1");
}

function removeReviewLinkLine(value: string) {
  return normalizeTemplateText(value)
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      const normalized = trimmed
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      if (normalized.startsWith("ertekeles link:")) return false;
      if (/^\s*link\s*:\s*\{?\s*https?:\/\//i.test(trimmed)) return false;
      if (/^\s*google\s+ertekeles\s*:\s*\{?\s*https?:\/\//i.test(normalized)) return false;

      return true;
    })
    .join("\n")
    .trim();
}
async function sendEmailWithRetry(
  apiKey: string,
  from: string,
  to: string,
  replyTo: string,
  subject: string,
  html: string,
  text: string,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= EMAIL_RETRY_ATTEMPTS; attempt += 1) {
    try {
      await sendEmail(apiKey, from, to, replyTo, subject, html, text);
      return;
    } catch (error) {
      lastError = error;
      console.warn("process-booking-notifications email attempt failed", {
        to,
        subject,
        attempt,
        maxAttempts: EMAIL_RETRY_ATTEMPTS,
        error: errorMessage(error),
      });

      if (attempt < EMAIL_RETRY_ATTEMPTS) {
        await delay(700);
      }
    }
  }

  throw lastError;
}

async function sendEmail(apiKey: string, from: string, to: string, replyTo: string, subject: string, html: string, text: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text, reply_to: replyTo }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appointmentRange(booking: BookingNotification) {
  return `${formatDate(booking.starts_at)}\n${formatDate(booking.starts_at, true)} – ${formatDate(booking.ends_at, true)}`;
}

function serviceName(booking: BookingNotification) {
  return booking.service_name || "Szolgáltatás";
}

function formatDate(value: string, timeOnly = false) {
  return new Intl.DateTimeFormat("hu-HU", timeOnly
    ? { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" }
    : { year: "numeric", month: "2-digit", day: "2-digit", weekday: "long", timeZone: "Europe/Budapest" }
  ).format(new Date(value));
}

function paragraphsHtml(value: string) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function couponSummary(code: unknown, title: unknown) {
  const couponCode = String(code || "").trim();
  const couponTitle = String(title || "").trim();

  if (!couponCode && !couponTitle) {
    return "";
  }

  if (!couponCode || !couponTitle || couponCode.toLowerCase() === couponTitle.toLowerCase()) {
    return couponCode || couponTitle;
  }

  return `${couponCode} – ${couponTitle}`;
}

function pageHtml(content: string) {
  return `
    <!doctype html>
    <html lang="hu">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <style>
          .lumi-email-main h1 {
            margin: 14px 0 20px;
            color: #302824;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 42px;
            font-weight: 400;
            letter-spacing: -0.7px;
            line-height: 1.08;
          }
          .lumi-email-main p {
            margin: 0 0 15px;
            color: #625852;
            font-size: 15px;
            line-height: 1.65;
          }
          .lumi-email-main .muted {
            color: #857771;
            font-size: 13px;
          }
          @media only screen and (max-width: 520px) {
            .lumi-email-outer { padding: 10px 6px !important; }
            .lumi-email-main { padding: 25px 18px 22px !important; }
            .lumi-email-footer { padding: 16px 18px 20px !important; }
            .lumi-email-main h1 { font-size: 32px !important; line-height: 1.1 !important; }
            .lumi-detail-label { width: 92px !important; padding-right: 10px !important; }
            .lumi-detail-value { font-size: 15px !important; }
            .lumi-email-button { display: block !important; text-align: center !important; }
          }
        </style>
      </head>
      <body style="margin:0;background:#f5efe9;color:#302824;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background:#f5efe9;">
          <tr>
            <td class="lumi-email-outer" align="center" style="padding:28px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;margin:0 auto;border-collapse:collapse;background:#fffaf6;border-top:4px solid #bd7f91;border-bottom:1px solid #e5d8d1;">
                <tr>
                  <td class="lumi-email-main" style="padding:34px 40px 30px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
                      <tr>
                        <td style="padding:0;color:#a96379;font-size:12px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;">Lumi Nails</td>
                        <td align="right" style="padding:0;color:#9a8b84;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">Tatabánya</td>
                      </tr>
                    </table>
                    ${content}
                  </td>
                </tr>
                <tr>
                  <td class="lumi-email-footer" style="padding:17px 40px 21px;border-top:1px solid #eadfd9;color:#91817a;font-size:12px;line-height:1.55;">
                    Lumi Nails · Körmös Tatabánya<br>
                    <a href="https://luminails.hu" style="color:#a96379;text-decoration:none;">luminails.hu</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function detailTable(rows: Array<[string, unknown]>) {
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:22px 0 24px;">
      ${rows.map(([label, value]) => `
        <tr>
          <td class="lumi-detail-label" width="116" valign="top" style="width:116px;padding:13px 18px 13px 0;border-bottom:1px solid #eadfd9;color:#9d6878;font-size:11px;font-weight:700;letter-spacing:.9px;line-height:1.45;text-transform:uppercase;white-space:nowrap;">${escapeHtml(label)}</td>
          <td class="lumi-detail-value" valign="top" style="padding:12px 0 13px;border-bottom:1px solid #eadfd9;color:#302824;font-size:16px;line-height:1.45;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(value).replace(/\r?\n/g, "<br>")}</td>
        </tr>
      `).join("")}
    </table>
  `;
}

function escapeAttribute(value: unknown) {
  return escapeHtml(value);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(numeric), min), max);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}