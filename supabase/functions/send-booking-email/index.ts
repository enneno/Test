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
    const ownerEmail = Deno.env.get("OWNER_EMAIL") || "szofipetras087@gmail.com";
    const fromEmail = Deno.env.get("FROM_EMAIL") || "Lumi Nails <foglalas@luminails.hu>";
    const replyToEmail = Deno.env.get("REPLY_TO_EMAIL") || ownerEmail;
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "llevisimon@gmail.com";
    const internalSecret = req.headers.get("x-lumi-internal-secret") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: "Missing Supabase environment variables" }, 500);
    }

    if (!resendApiKey) {
      console.error("send-booking-email missing RESEND_API_KEY", { bookingId, mode });
      return json({ ok: false, email: "missing_resend_api_key" });
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
      .select("customer_name,customer_phone,customer_email,note,starts_at,ends_at,created_at,status,services(name,price_text)")
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
    const startsAt = formatDate(booking.starts_at);
    const endsAt = formatDate(booking.ends_at, true);
    const submittedAt = formatDate(booking.created_at);
    const appointmentText = `${startsAt} - ${endsAt}`;
    const calendarAttachment = {
      filename: "lumi-nails-foglalas.ics",
      content: base64FromUtf8(calendarEvent({
        id: bookingId,
        customerName: booking.customer_name,
        customerPhone: booking.customer_phone,
        customerEmail: booking.customer_email,
        note: booking.note || "",
        serviceName,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
      })),
    };

    const ownerSubject = `Új Lumi Nails foglalás - ${booking.customer_name}`;
    const customerSubject = "Lumi Nails foglalásod beérkezett";
    const instagramUrl = "https://www.instagram.com/luminails.xx/";

    if (mode === "admin_update") {
      const statusChanged = Boolean(notification.status_changed);
      const timeChanged = Boolean(notification.time_changed);
      const status = String(notification.status || booking.status || "");
      const update = adminUpdateMessage(status, statusChanged, timeChanged);

      if (!update) {
        return json({ ok: true, email: "skipped" });
      }

      const customerHtml = pageHtml(`
        <h1>${escapeHtml(update.title)}</h1>
        <p>Szia ${escapeHtml(booking.customer_name)}!</p>
        <p>${escapeHtml(update.message)}</p>
        ${detailTable([
          ["Szolgáltatás", serviceName],
          ["Időpont", appointmentText],
          ["Helyszín", "2800 Tatabánya, Kós Károly út"],
        ])}
        <p class="muted">Ha kérdésed van vagy módosítani szeretnél, kérlek Instagramon írj üzenetet.</p>
        <p style="margin:22px 0;">
          <a href="${instagramUrl}" style="display:inline-block;padding:12px 18px;background:#b9858f;color:#fffaf4;border-radius:999px;text-decoration:none;font-weight:700;">Instagram üzenet</a>
        </p>
        <p>Lumi Nails</p>
      `);

      const customerText = [
        `Szia ${booking.customer_name}!`,
        "",
        update.message,
        "",
        `Szolgáltatás: ${serviceName}`,
        `Időpont: ${appointmentText}`,
        "Helyszín: 2800 Tatabánya, Kós Károly út",
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
        ["Telefon", booking.customer_phone],
        ["Email", booking.customer_email],
        ["Szolgáltatás", serviceName],
        ["Időpont", appointmentText],
        ["Beküldve", submittedAt],
        ["Megjegyzés", booking.note || "-"],
      ])}
      <p class="muted">A foglalás az admin felületen is megjelent. Ott tudod visszaigazolni, készre állítani vagy törölni.</p>
    `);

    const customerHtml = pageHtml(`
      <h1>Köszönöm a foglalásodat!</h1>
      <p>Szia ${escapeHtml(booking.customer_name)}!</p>
      <p>Megkaptam az időpontfoglalásodat, az alábbi adatokkal rögzítettük a rendszerben.</p>
      ${detailTable([
        ["Szolgáltatás", serviceName],
        ["Időpont", appointmentText],
        ["Helyszín", "2800 Tatabánya, Kós Károly út"],
      ])}
      <p class="muted">Ha valamit módosítani szeretnél, kérlek Instagramon írj üzenetet.</p>
      <p style="margin:22px 0;">
        <a href="${instagramUrl}" style="display:inline-block;padding:12px 18px;background:#b9858f;color:#fffaf4;border-radius:999px;text-decoration:none;font-weight:700;">Instagram üzenet</a>
      </p>
      <p>Lumi Nails</p>
    `);

    const ownerText = [
      "Új Lumi Nails foglalás",
      `Név: ${booking.customer_name}`,
      `Telefon: ${booking.customer_phone}`,
      `Email: ${booking.customer_email}`,
      `Szolgáltatás: ${serviceName}`,
      `Időpont: ${appointmentText}`,
      `Beküldve: ${submittedAt}`,
      `Megjegyzés: ${booking.note || "-"}`,
    ].join("\n");

    const customerText = [
      `Szia ${booking.customer_name}!`,
      "",
      "Köszönöm a foglalásodat, megkaptam az időpontkérésedet.",
      "Az alábbi adatokkal rögzítettük a rendszerben.",
      "",
      `Szolgáltatás: ${serviceName}`,
      `Időpont: ${appointmentText}`,
      "Helyszín: 2800 Tatabánya, Kós Károly út",
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

function adminUpdateMessage(status: string, statusChanged: boolean, timeChanged: boolean) {
  if (status === "cancelled") {
    return {
      subject: "Lumi Nails időpontod lemondva",
      title: "Időpont lemondva",
      message: "A foglalásod lemondásra került. Ha új időpontot szeretnél egyeztetni, kérlek írj Instagramon.",
    };
  }

  if (status === "confirmed") {
    return {
      subject: timeChanged ? "Lumi Nails időpontod visszaigazolva és módosítva" : "Lumi Nails időpontod visszaigazolva",
      title: timeChanged ? "Időpont visszaigazolva és módosítva" : "Időpont visszaigazolva",
      message: timeChanged
        ? "A foglalásod vissza lett igazolva, és az időpont adatai módosultak. Az aktuális részleteket lent találod."
        : "A foglalásod vissza lett igazolva. Az aktuális részleteket lent találod.",
    };
  }

  if (timeChanged) {
    return {
      subject: "Lumi Nails időpontod módosult",
      title: "Időpont módosítva",
      message: "Az időpontod adatai módosultak. Az aktuális részleteket lent találod.",
    };
  }

  if (statusChanged && status === "pending") {
    return {
      subject: "Lumi Nails foglalásod státusza módosult",
      title: "Foglalás státusza módosult",
      message: "A foglalásod státusza módosult. Az aktuális részleteket lent találod.",
    };
  }

  return null;
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
    : { year: "numeric", month: "2-digit", day: "2-digit", weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" }
  ).format(new Date(value));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
