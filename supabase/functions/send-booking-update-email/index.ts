import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.booking_id || "").trim();
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

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: "Missing Supabase environment variables" }, 500);
    }

    if (!resendApiKey) {
      return json({ ok: false, email: "missing_resend_api_key" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const adminOk = await isAdminRequest(req, supabase, adminEmail);

    if (!adminOk) {
      return json({ ok: false, error: "not_authorized" }, 401);
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("customer_name,customer_email,starts_at,ends_at,status,services(name)")
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return json({ ok: false, error: "Booking not found" }, 404);
    }

    const statusChanged = Boolean(notification.status_changed);
    const timeChanged = Boolean(notification.time_changed);
    const status = String(notification.status || booking.status || "");
    const adminMessage = String(notification.message || "").trim();
    const update = adminUpdateMessage(status, statusChanged, timeChanged);

    if (!update) {
      return json({ ok: true, email: "skipped" });
    }

    const serviceName = serviceNameFromRelation(booking.services);
    const appointmentText = `${formatDate(booking.starts_at)} - ${formatDate(booking.ends_at, true)}`;
    const instagramUrl = "https://www.instagram.com/luminails.xx/";
    const customerHtml = pageHtml(`
      <h1>${escapeHtml(update.title)}</h1>
      <p>Szia ${escapeHtml(booking.customer_name)}!</p>
      <p>${escapeHtml(update.message)}</p>
      ${detailTable([
        ["Szolgáltatás", serviceName],
        ["Időpont", appointmentText],
        ["Helyszín", "2800 Tatabánya, Kós Károly út"],
      ])}
      ${adminMessage ? `
        <div style="margin:20px 0;padding:14px 16px;background:#fdf4e2;border:1px solid #ead4cf;border-radius:14px;">
          <p style="margin:0 0 6px;color:#5d4d46;font-weight:700;">Üzenet</p>
          <p style="margin:0;color:#2b2521;line-height:1.6;">${escapeHtml(adminMessage)}</p>
        </div>
      ` : ""}
      <p>Ha kérdésed van vagy módosítani szeretnél, kérlek Instagramon írj üzenetet.</p>
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
      ...(adminMessage ? ["", `Üzenet: ${adminMessage}`] : []),
      "",
      `Ha kérdésed van vagy módosítani szeretnél, kérlek Instagramon írj: ${instagramUrl}`,
      "",
      "Lumi Nails",
    ].join("\n");

    await sendEmailWithRetry(resendApiKey, fromEmail, booking.customer_email, replyToEmail, update.subject, customerHtml, customerText);
    return json({ ok: true, email: "admin_update_sent" });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

async function isAdminRequest(req: Request, supabase: any, adminEmail: string) {
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

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await sendEmail(apiKey, from, to, replyTo, subject, html, text);
      return;
    } catch (error) {
      lastError = error;

      if (attempt < 2) {
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
