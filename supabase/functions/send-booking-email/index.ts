import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lumi-internal-secret",
};
const EMAIL_RETRY_ATTEMPTS = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.booking_id || "").trim();
    const mode = String(body.mode || "new_booking").trim();
    const notification = body.notification && typeof body.notification === "object"
      ? body.notification as Record<string, unknown>
      : {};

    if (!bookingId) {
      return json({ ok: false, error: "Missing booking_id" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const ownerEmail = Deno.env.get("OWNER_EMAIL") || "";
    const fromEmail = Deno.env.get("FROM_EMAIL") || "Lumi Nails <foglalas@luminails.hu>";
    const replyToEmail = Deno.env.get("REPLY_TO_EMAIL") || ownerEmail;
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "llevisimon@gmail.com";
    const internalSecret = req.headers.get("x-lumi-internal-secret") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: "Missing Supabase environment variables" }, 500);
    }

    if (!resendApiKey || !ownerEmail) {
      console.error("send-booking-email missing email environment", {
        bookingId,
        mode,
        missingResendApiKey: !resendApiKey,
        missingOwnerEmail: !ownerEmail,
      });
      return json({ ok: false, email: "missing_email_environment" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    if (mode === "admin_update") {
      const adminOk = await isAdminRequest(req, supabase, adminEmail);

      if (!adminOk) {
        return json({ ok: false, error: "not_authorized" }, 401);
      }
    } else if (internalSecret !== serviceRoleKey) {
      console.warn("send-booking-email rejected non-internal request", { bookingId, mode });
      return json({ ok: false, error: "not_authorized" }, 401);
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("customer_name,customer_phone,customer_email,note,starts_at,ends_at,created_at,status,coupon_code,coupon_title,public_reference,services(name,price_text)")
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      console.error("send-booking-email booking not found", { bookingId, mode });
      return json({ ok: false, error: "Booking not found" }, 404);
    }

    console.log("send-booking-email booking loaded", {
      bookingId,
      mode,
      status: booking.status,
      startsAt: booking.starts_at,
    });

    const serviceName = serviceNameFromRelation(booking.services);
    const appointmentDate = formatDate(booking.starts_at);
    const startsAt = formatDate(booking.starts_at, true);
    const endsAt = formatDate(booking.ends_at, true);
    const submittedAt = `${formatDate(booking.created_at)}\n${formatDate(booking.created_at, true)}`;
    const appointmentText = `${appointmentDate}\n${startsAt} – ${endsAt}`;
    const coupon = couponSummary(booking.coupon_code, booking.coupon_title);
    const couponRows: Array<[string, unknown]> = coupon ? [["Kupon", coupon]] : [];
    const bookingReference = String(booking.public_reference || "").trim();
    const bookingManageUrl = bookingReference
      ? `https://luminails.hu/foglalas/?foglalas=${encodeURIComponent(bookingReference)}#foglalas-ellenorzes`
      : "";
    const bookingReferenceRows: Array<[string, unknown]> = bookingReference
      ? [["Foglal\u00e1si azonos\u00edt\u00f3", bookingReference]]
      : [];
    const calendarAttachment = {
      filename: "lumi-nails-foglalas.ics",
      content: base64FromUtf8(calendarEvent({
        id: bookingId,
        customerName: booking.customer_name,
        customerPhone: formatPhone(booking.customer_phone),
        customerEmail: booking.customer_email,
        note: booking.note || "",
        serviceName,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
      })),
    };

    const siteContent = await loadSiteContent(supabase);
    const location = String(siteContent?.kapcsolat?.cim || "2800 Tatabánya, Kós Károly út");
    const instagramUrl = String(siteContent?.kapcsolat?.instagram || "https://www.instagram.com/luminails.xx/");
    const variables = {
      nev: booking.customer_name,
      szolgaltatas: serviceName,
      idopont: appointmentText,
      helyszin: location,
    };
    const ownerSubject = `Új Lumi Nails foglalás - ${booking.customer_name}`;
    const newBookingTemplate = emailTemplate(siteContent?.email?.ujFoglalas, {
      targy: "Lumi Nails foglalásod beérkezett",
      cim: "Köszönöm a foglalásodat!",
      szoveg: "Szia {nev}!\n\nMegkaptam az időpontfoglalásodat, az alábbi adatokkal rögzítettük a rendszerben.",
    }, variables);
    const customerSubject = newBookingTemplate.subject;
    if (mode === "admin_update") {
      const statusChanged = Boolean(notification.status_changed);
      const timeChanged = Boolean(notification.time_changed);
      const status = String(notification.status || booking.status || "");
      const update = adminUpdateMessage(status, statusChanged, timeChanged, siteContent?.email || {}, variables);

      if (!update) {
        return json({ ok: true, email: "skipped" });
      }

      const customerHtml = pageHtml(`
        <h1>${escapeHtml(update.title)}</h1>
        ${paragraphsHtml(update.message)}
        ${detailTable([
          ["Szolgáltatás", serviceName],
          ...couponRows,
          ["Időpont", appointmentText],
          ...bookingReferenceRows,
          ["Helyszín", location],
        ])}
        ${bookingManageUrl ? `<p style="margin:22px 0;"><a href="${escapeHtml(bookingManageUrl)}" class="lumi-email-button" style="display:inline-block;padding:12px 18px;background:#302824;color:#fffaf6;border:1px solid #302824;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.3px;">Foglal&aacute;s ellen&#337;rz&eacute;se vagy lemond&aacute;sa</a></p>` : ""}
        <p class="muted">Ha kérdésed van vagy módosítani szeretnél, kérlek Instagramon írj üzenetet.</p>
        <p style="margin:22px 0;">
          <a href="${instagramUrl}" class="lumi-email-button" style="display:inline-block;padding:12px 18px;background:#302824;color:#fffaf6;border:1px solid #302824;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.3px;">Instagram üzenet</a>
        </p>
        <p>Lumi Nails</p>
      `);

      const customerText = [
      update.message,
        "",
        `Szolgáltatás: ${serviceName}`,
        ...(coupon ? [`Kupon: ${coupon}`] : []),
        `Időpont: ${appointmentText}`,
        ...(bookingReference ? [`Foglal\u00e1si azonos\u00edt\u00f3: ${bookingReference}`] : []),
        `Helyszín: ${location}`,
        ...(bookingManageUrl ? [`Foglal\u00e1s kezel\u00e9se: ${bookingManageUrl}`] : []),
        "",
        `Ha kérdésed van vagy módosítani szeretnél, kérlek Instagramon írj: ${instagramUrl}`,
        "",
        "Lumi Nails",
      ].join("\n");

      await sendEmailWithRetry(resendApiKey, fromEmail, booking.customer_email, replyToEmail, update.subject, customerHtml, customerText);
      console.log("send-booking-email admin_update sent", { bookingId, target: "customer" });
      return json({ ok: true, email: "admin_update_sent" });
    }

    const ownerHtml = pageHtml(`
      <h1>Új foglalás érkezett</h1>
      ${detailTable([
        ["Név", booking.customer_name],
        ["Telefon", formatPhone(booking.customer_phone)],
        ["Email", booking.customer_email],
        ["Szolgáltatás", serviceName],
        ...couponRows,
        ["Időpont", appointmentText],
        ...bookingReferenceRows,
        ["Beküldve", submittedAt],
        ["Megjegyzés", booking.note || "-"],
      ])}
      <p class="muted">A foglalás az admin felületen is megjelent. Ott tudod visszaigazolni, készre állítani vagy törölni.</p>
    `);

    const customerHtml = pageHtml(`
      <h1>${escapeHtml(newBookingTemplate.title)}</h1>
      ${paragraphsHtml(newBookingTemplate.message)}
      ${detailTable([
        ["Szolgáltatás", serviceName],
        ...couponRows,
        ["Időpont", appointmentText],
        ...bookingReferenceRows,
        ["Helyszín", location],
      ])}
      ${bookingManageUrl ? `<p style="margin:22px 0;"><a href="${escapeHtml(bookingManageUrl)}" class="lumi-email-button" style="display:inline-block;padding:12px 18px;background:#302824;color:#fffaf6;border:1px solid #302824;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.3px;">Foglal&aacute;s ellen&#337;rz&eacute;se vagy lemond&aacute;sa</a></p>` : ""}
      <p class="muted">Ha valamit módosítani szeretnél, kérlek Instagramon írj üzenetet.</p>
      <p style="margin:22px 0;">
        <a href="${instagramUrl}" class="lumi-email-button" style="display:inline-block;padding:12px 18px;background:#302824;color:#fffaf6;border:1px solid #302824;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.3px;">Instagram üzenet</a>
      </p>
      <p>Lumi Nails</p>
    `);

    const ownerText = [
      "Új Lumi Nails foglalás",
      `Név: ${booking.customer_name}`,
      `Telefon: ${formatPhone(booking.customer_phone)}`,
      `Email: ${booking.customer_email}`,
      `Szolgáltatás: ${serviceName}`,
      ...(coupon ? [`Kupon: ${coupon}`] : []),
      `Időpont: ${appointmentText}`,
      ...(bookingReference ? [`Foglal\u00e1si azonos\u00edt\u00f3: ${bookingReference}`] : []),
      `Beküldve: ${submittedAt}`,
      `Megjegyzés: ${booking.note || "-"}`,
    ].join("\n");

    const customerText = [
      newBookingTemplate.message,
      "",
      `Szolgáltatás: ${serviceName}`,
      ...(coupon ? [`Kupon: ${coupon}`] : []),
      `Időpont: ${appointmentText}`,
      ...(bookingReference ? [`Foglal\u00e1si azonos\u00edt\u00f3: ${bookingReference}`] : []),
      `Helyszín: ${location}`,
      ...(bookingManageUrl ? [`Foglal\u00e1s kezel\u00e9se: ${bookingManageUrl}`] : []),
      "",
      `Ha valamit módosítani szeretnél, kérlek Instagramon írj: ${instagramUrl}`,
      "",
      "Lumi Nails",
    ].join("\n");

    const results = await Promise.allSettled([
      sendEmailWithRetry(resendApiKey, fromEmail, ownerEmail, replyToEmail, ownerSubject, ownerHtml, ownerText, [calendarAttachment]),
      sendEmailWithRetry(resendApiKey, fromEmail, booking.customer_email, replyToEmail, customerSubject, customerHtml, customerText),
    ]);

    const delivery = results.map((result, index) => {
      const target = index === 0 ? "owner" : "customer";

      if (result.status === "fulfilled") {
        return { target, ok: true };
      }

      return { target, ok: false, error: errorMessage(result.reason) };
    });

    console.log("send-booking-email new_booking delivery", { bookingId, delivery });
    await logEmailDeliveryEvents(supabase, bookingId, delivery);

    const failed = delivery.filter((item) => !item.ok);

    if (failed.length > 0) {
      console.error("send-booking-email new_booking failed", { bookingId, failed });
      return json({
        ok: false,
        email: "partial_or_failed",
        delivery,
        error: failed.map((item) => `${item.target}: ${item.error}`),
      }, 500);
    }

    return json({ ok: true, email: "sent", delivery });
  } catch (error) {
    console.error("send-booking-email unexpected error", errorMessage(error));
    return json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

async function logEmailDeliveryEvents(
  supabase: any,
  bookingId: string,
  delivery: Array<{ target: string; ok: boolean; error?: string }>,
) {
  const rows = delivery.map((item) => ({
    booking_id: bookingId,
    event_type: item.target === "owner" ? "owner_email" : "customer_email",
    channel: "email",
    status: item.ok ? "success" : "error",
    title: item.target === "owner"
      ? (item.ok ? "Tulaj email elkuldve" : "Tulaj email hiba")
      : (item.ok ? "Vendeg email elkuldve" : "Vendeg email hiba"),
    message: item.ok
      ? "Az automatikus email sikeresen atadasra kerult a kuldo szolgaltatonak."
      : `Az automatikus email nem ment ki: ${item.error || "ismeretlen hiba"}`,
    metadata: {
      target: item.target,
      ok: item.ok,
      error: item.error || null,
    },
  }));

  const { error } = await supabase
    .from("booking_events")
    .insert(rows);

  if (error) {
    console.warn("send-booking-email event log failed", error.message);
  }
}

async function sendEmailWithRetry(
  apiKey: string,
  from: string,
  to: string,
  replyTo: string,
  subject: string,
  html: string,
  text: string,
  attachments: Array<{ filename: string; content: string }> = [],
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= EMAIL_RETRY_ATTEMPTS; attempt += 1) {
    try {
      await sendEmail(apiKey, from, to, replyTo, subject, html, text, attachments);
      return;
    } catch (error) {
      lastError = error;
      console.warn("send-booking-email resend attempt failed", {
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

async function sendEmail(
  apiKey: string,
  from: string,
  to: string,
  replyTo: string,
  subject: string,
  html: string,
  text: string,
  attachments: Array<{ filename: string; content: string }> = [],
) {
  const payload: Record<string, unknown> = { from, to, subject, html, text, reply_to: replyTo };

  if (attachments.length > 0) {
    payload.attachments = attachments;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function isAdminRequest(req: Request, supabase: ReturnType<typeof createClient>, adminEmail: string) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return false;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user?.email) {
    return false;
  }

  return data.user.email.toLowerCase() === adminEmail.toLowerCase();
}

function adminUpdateMessage(
  status: string,
  statusChanged: boolean,
  timeChanged: boolean,
  templates: Record<string, any>,
  variables: Record<string, string>,
) {
  if (status === "cancelled") {
    return emailTemplate(templates.lemondas, {
      targy: "Lumi Nails időpontod lemondva",
      cim: "Időpont lemondva",
      szoveg: "Szia {nev}!\n\nA foglalásod lemondásra került. Ha új időpontot szeretnél egyeztetni, kérlek írj üzenetet.",
    }, variables);
  }
  if (status === "confirmed") {
    const key = timeChanged ? "visszaigazolasModositva" : "visszaigazolas";
    return emailTemplate(templates[key], timeChanged ? {
      targy: "Lumi Nails időpontod visszaigazolva és módosítva",
      cim: "Időpont visszaigazolva és módosítva",
      szoveg: "Szia {nev}!\n\nA foglalásod vissza lett igazolva, és az időpont adatai módosultak. Az aktuális részleteket lent találod.",
    } : {
      targy: "Lumi Nails időpontod visszaigazolva",
      cim: "Időpont visszaigazolva",
      szoveg: "Szia {nev}!\n\nA foglalásod vissza lett igazolva. Az aktuális részleteket lent találod.",
    }, variables);
  }
  if (timeChanged) {
    return emailTemplate(templates.idopontModositva, {
      targy: "Lumi Nails időpontod módosult",
      cim: "Időpont módosítva",
      szoveg: "Szia {nev}!\n\nAz időpontod adatai módosultak. Az aktuális részleteket lent találod.",
    }, variables);
  }
  if (statusChanged && status === "pending") {
    return emailTemplate(templates.fuggoben, {
      targy: "Lumi Nails foglalásod státusza módosult",
      cim: "Foglalás státusza módosult",
      szoveg: "Szia {nev}!\n\nA foglalásod státusza módosult. Az aktuális részleteket lent találod.",
    }, variables);
  }
  return null;
}

async function loadSiteContent(supabase: any) {
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", "site_content").maybeSingle();
  if (error) {
    console.warn("send-booking-email site content load failed", error.message);
    return {};
  }
  return data?.value && typeof data.value === "object" ? data.value : {};
}

function emailTemplate(source: any, fallback: any, variables: Record<string, string>) {
  return {
    subject: applyVariables(source?.targy || fallback.targy, variables),
    title: applyVariables(source?.cim || fallback.cim, variables),
    message: applyVariables(source?.szoveg || fallback.szoveg, variables),
  };
}

function applyVariables(value: unknown, variables: Record<string, string>) {
  return String(value || "").replace(/\{(nev|szolgaltatas|idopont|helyszin)\}/g, (_match, key) => variables[key] || "");
}

function paragraphsHtml(value: string) {
  return String(value || "").split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
}
function calendarEvent(adatok: {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  note: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
}) {
  const description = [
    `Vendég: ${adatok.customerName}`,
    `Telefon: ${adatok.customerPhone}`,
    `Email: ${adatok.customerEmail}`,
    `Szolgáltatás: ${adatok.serviceName}`,
    adatok.note ? `Megjegyzés: ${adatok.note}` : "",
  ].filter(Boolean).join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lumi Nails//Booking//HU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-TIMEZONE:Europe/Budapest",
    "BEGIN:VEVENT",
    `UID:${icsText(adatok.id)}@luminails.hu`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(adatok.startsAt)}`,
    `DTEND:${icsDate(adatok.endsAt)}`,
    `SUMMARY:${icsText(adatok.customerName)}`,
    `DESCRIPTION:${icsText(description)}`,
    `LOCATION:${icsText("2800 Tatabánya, Kós Károly út")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function icsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsText(value: string) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function base64FromUtf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
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

function serviceNameFromRelation(value: unknown) {
  if (Array.isArray(value)) {
    return String(value[0]?.name || "Szolgáltatás");
  }

  if (value && typeof value === "object" && "name" in value) {
    return String((value as { name?: unknown }).name || "Szolgáltatás");
  }

  return "Szolgáltatás";
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

function formatDate(value: string, timeOnly = false) {
  return new Intl.DateTimeFormat("hu-HU", timeOnly
    ? { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" }
    : { year: "numeric", month: "2-digit", day: "2-digit", weekday: "long", timeZone: "Europe/Budapest" }
  ).format(new Date(value));
}

function formatPhone(value: unknown) {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  let localNumber = "";

  if (digits.length === 11 && digits.startsWith("36")) {
    localNumber = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("06")) {
    localNumber = digits.slice(2);
  } else if (digits.length === 9) {
    localNumber = digits;
  }

  if (localNumber.length !== 9) {
    return raw;
  }

  return "+36\u00a0"
    + localNumber.slice(0, 2)
    + "\u00a0"
    + localNumber.slice(2, 5)
    + "\u00a0"
    + localNumber.slice(5);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
