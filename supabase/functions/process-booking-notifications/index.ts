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
      await sendReminderEmail({ booking, resendApiKey, fromEmail, replyToEmail, siteContent, location, instagramUrl });
      await finishRow(supabase, "finish_booking_reminder", booking.id, true);
    }, async (booking, error) => {
      await finishRow(supabase, "finish_booking_reminder", booking.id, false, errorMessage(error));
    });

    const reviewRequests = await claimRows(supabase, "claim_due_booking_review_requests", limit);
    const reviewResults = await processRows(reviewRequests, async (booking) => {
      await sendReviewRequestEmail({ booking, resendApiKey, fromEmail, replyToEmail, siteContent, location, instagramUrl, reviewUrl });
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
      ["Időpont", appointmentText],
      ["Helyszín", location],
    ])}
    <p class="muted">Ha kérdésed van vagy módosítani szeretnél, kérlek Instagramon írj üzenetet.</p>
    <p style="margin:22px 0;">
      <a href="${escapeAttribute(instagramUrl)}" style="display:inline-block;padding:12px 18px;background:#b9858f;color:#fffaf4;border-radius:999px;text-decoration:none;font-weight:700;">Instagram üzenet</a>
    </p>
    <p>Lumi Nails</p>
  `);

  const text = [
    template.message,
    "",
    `Szolgáltatás: ${serviceName(booking)}`,
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
      <a href="${escapeAttribute(reviewUrl)}" style="display:inline-block;padding:12px 18px;background:#b9858f;color:#fffaf4;border-radius:999px;text-decoration:none;font-weight:700;">Google értékelés írása</a>
    </p>
    ${detailTable([
      ["Szolgáltatás", serviceName(booking)],
      ["Időpont", appointmentText],
    ])}
    <p class="muted">Ha bármi nem volt rendben, kérlek inkább írj Instagramon, és megbeszéljük.</p>
    <p style="margin:22px 0;">
      <a href="${escapeAttribute(instagramUrl)}" style="display:inline-block;padding:12px 18px;background:#fffaf4;color:#5d4d46;border:1px solid #ead4cf;border-radius:999px;text-decoration:none;font-weight:700;">Instagram üzenet</a>
    </p>
    <p>Lumi Nails</p>
  `);

  const text = [
    cleanMessage,
    "",
    `Google értékelés: ${reviewUrl}`,
    "",
    `Szolgáltatás: ${serviceName(booking)}`,
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
  return `${formatDate(booking.starts_at)} - ${formatDate(booking.ends_at, true)}`;
}

function serviceName(booking: BookingNotification) {
  return booking.service_name || "Szolgáltatás";
}

function formatDate(value: string, timeOnly = false) {
  return new Intl.DateTimeFormat("hu-HU", timeOnly
    ? { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" }
    : { year: "numeric", month: "2-digit", day: "2-digit", weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" }
  ).format(new Date(value));
}

function paragraphsHtml(value: string) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function pageHtml(content: string) {
  return `
    <!doctype html>
    <html lang="hu">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="margin:0;background:#fdf4e2;color:#2b2521;font-family:Arial,sans-serif;">
        <div style="max-width:620px;margin:0 auto;padding:28px 18px;">
          <div style="background:#fffaf4;border:1px solid #ead4cf;border-radius:18px;padding:28px;">
            <p style="margin:0 0 12px;color:#b9858f;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Lumi Nails</p>
            ${content}
          </div>
        </div>
      </body>
    </html>
  `;
}

function detailTable(rows: Array<[string, unknown]>) {
  return `
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0ded9;color:#5d4d46;font-weight:700;width:38%;">${escapeHtml(label)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0ded9;color:#2b2521;">${escapeHtml(value)}</td>
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