import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.booking_id || "").trim();

    if (!bookingId) {
      return json({ ok: false, error: "Missing booking_id" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const ownerEmail = Deno.env.get("OWNER_EMAIL") || "szofipetras087@gmail.com";
    const fromEmail = Deno.env.get("FROM_EMAIL") || "Lumi Nails <onboarding@resend.dev>";
    const replyToEmail = Deno.env.get("REPLY_TO_EMAIL") || ownerEmail;

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: "Missing Supabase environment variables" }, 500);
    }

    if (!resendApiKey) {
      return json({ ok: false, email: "missing_resend_api_key" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("customer_name,customer_phone,customer_email,note,starts_at,ends_at,created_at,services(name,price_text)")
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return json({ ok: false, error: "Booking not found" }, 404);
    }

    const serviceName = serviceNameFromRelation(booking.services);
    const startsAt = formatDate(booking.starts_at);
    const endsAt = formatDate(booking.ends_at, true);
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

    const ownerHtml = pageHtml(`
      <h1>Új foglalás érkezett</h1>
      ${detailTable([
        ["Név", booking.customer_name],
        ["Telefon", booking.customer_phone],
        ["Email", booking.customer_email],
        ["Szolgáltatás", serviceName],
        ["Időpont", appointmentText],
        ["Megjegyzés", booking.note || "-"],
      ])}
      <p class="muted">A foglalás az admin felületen is megjelent. Ott tudod visszaigazolni, készre állítani vagy törölni.</p>
    `);

    const customerHtml = pageHtml(`
      <h1>Köszönöm a foglalásodat!</h1>
      <p>Szia ${escapeHtml(booking.customer_name)}!</p>
      <p>Megkaptam az időpontkérésedet. Hamarosan visszajelzek, hogy véglegesítve van-e.</p>
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
      `Megjegyzés: ${booking.note || "-"}`,
    ].join("\n");

    const customerText = [
      `Szia ${booking.customer_name}!`,
      "",
      "Köszönöm a foglalásodat, megkaptam az időpontkérésedet.",
      "Hamarosan visszajelzek, hogy véglegesítve van-e.",
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
      sendEmail(resendApiKey, fromEmail, ownerEmail, replyToEmail, ownerSubject, ownerHtml, ownerText, [calendarAttachment]),
      sendEmail(resendApiKey, fromEmail, booking.customer_email, replyToEmail, customerSubject, customerHtml, customerText),
    ]);

    const failed = results
      .map((result, index) => ({ result, target: index === 0 ? "owner" : "customer" }))
      .filter((item) => item.result.status === "rejected");

    if (failed.length > 0) {
      return json({
        ok: false,
        error: failed.map((item) => `${item.target}: ${String((item.result as PromiseRejectedResult).reason)}`),
      }, 500);
    }

    return json({ ok: true, email: "sent" });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

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
