import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lumi-internal-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let activeEmailJobId = "";
  let activeSupabase: any = null;

  try {
    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.booking_id || "").trim();
    const emailJobId = String(body.email_job_id || "").trim();
    activeEmailJobId = emailJobId;

    if (!bookingId) {
      return json({ ok: false, error: "Missing booking_id" }, 400);
    }
    if (!isUuid(emailJobId)) {
      return json({ ok: false, error: "Missing or invalid email_job_id" }, 400);
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

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    activeSupabase = supabase;
    const adminOk = internalSecret === serviceRoleKey || await isAdminRequest(req, supabase, adminEmail);

    if (!adminOk) {
      return json({ ok: false, error: "not_authorized" }, 401);
    }


    const { data: emailJob, error: emailJobError } = await supabase
      .from("booking_email_jobs")
      .select("id,booking_id,kind,status,payload")
      .eq("id", emailJobId)
      .maybeSingle();

    if (emailJobError || !emailJob || emailJob.booking_id !== bookingId || emailJob.kind !== "admin_update") {
      return json({ ok: false, error: "Email job not found" }, 404);
    }

    if (emailJob.status === "sent") {
      return json({ ok: true, email: "already_sent" });
    }

    if (emailJob.status === "failed") {
      return json({ ok: false, email: "retry_limit_reached", queued: false }, 409);
    }

    const notificationSource = emailJob.payload && typeof emailJob.payload === "object"
      ? (emailJob.payload as Record<string, unknown>).notification
      : null;
    const notification = notificationSource && typeof notificationSource === "object"
      ? notificationSource as Record<string, unknown>
      : {};

    if (!resendApiKey || !ownerEmail) {
      await finishEmailJob(supabase, emailJobId, false, "Missing email environment variables");
      return json({ ok: false, email: "missing_email_environment", queued: true }, 500);
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("customer_name,customer_email,starts_at,ends_at,status,coupon_code,coupon_title,services(name)")
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      await finishEmailJob(supabase, emailJobId, false, "Booking not found");
      return json({ ok: false, error: "Booking not found" }, 404);
    }

    const statusChanged = Boolean(notification.status_changed);
    const timeChanged = Boolean(notification.time_changed);
    const status = String(notification.status || booking.status || "");
    const adminMessage = String(notification.message || "").trim();
    const serviceName = serviceNameFromRelation(booking.services);
    const appointmentText = `${formatDate(booking.starts_at)}\n${formatDate(booking.starts_at, true)} – ${formatDate(booking.ends_at, true)}`;
    const coupon = couponSummary(booking.coupon_code, booking.coupon_title);
    const couponRows: Array<[string, unknown]> = coupon ? [["Kupon", coupon]] : [];
    const siteContent = await loadSiteContent(supabase);
    const location = String(siteContent?.kapcsolat?.cim || "2800 Tatabánya, Kós Károly út");
    const instagramUrl = String(siteContent?.kapcsolat?.instagram || "https://www.instagram.com/luminails.xx/");
    const variables = {
      nev: booking.customer_name,
      szolgaltatas: serviceName,
      idopont: appointmentText,
      helyszin: location,
    };
    const update = adminUpdateMessage(status, statusChanged, timeChanged, siteContent?.email || {}, variables);

    if (!update) {
      await finishEmailJob(supabase, emailJobId, true);
      return json({ ok: true, email: "skipped" });
    }

    const customerHtml = pageHtml(`
      <h1>${escapeHtml(update.title)}</h1>
      ${paragraphsHtml(update.message)}
      ${detailTable([
        ["Szolgáltatás", serviceName],
        ...couponRows,
        ["Időpont", appointmentText],
        ["Helyszín", location],
      ])}
      ${adminMessage ? `
        <div style="margin:20px 0;padding:12px 0 12px 14px;border-left:3px solid #bd7f91;">
          <p style="margin:0 0 6px;color:#5d4d46;font-weight:700;">Üzenet</p>
          <p style="margin:0;color:#2b2521;line-height:1.6;">${escapeHtml(adminMessage)}</p>
        </div>
      ` : ""}
      <p>Ha kérdésed van vagy módosítani szeretnél, kérlek Instagramon írj üzenetet.</p>
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
      `Helyszín: ${location}`,
      ...(adminMessage ? ["", `Üzenet: ${adminMessage}`] : []),
      "",
      `Ha kérdésed van vagy módosítani szeretnél, kérlek Instagramon írj: ${instagramUrl}`,
      "",
      "Lumi Nails",
    ].join("\n");

    try {
      await sendEmail(resendApiKey, fromEmail, booking.customer_email, replyToEmail, update.subject, customerHtml, customerText, `booking-admin-update/${emailJobId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await finishEmailJob(supabase, emailJobId, false, message);
      return json({ ok: false, email: "queued_for_retry", queued: true, error: message }, 500);
    }

    await finishEmailJob(supabase, emailJobId, true);
    return json({ ok: true, email: "admin_update_sent" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (activeSupabase && isUuid(activeEmailJobId)) {
      await finishEmailJob(activeSupabase, activeEmailJobId, false, message);
    }
    return json({ ok: false, error: message }, 500);
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
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "site_content")
    .maybeSingle();

  if (error) {
    console.warn("send-booking-update-email site content load failed", error.message);
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
  return String(value || "")
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
async function sendEmail(apiKey: string, from: string, to: string, replyTo: string, subject: string, html: string, text: string, idempotencyKey: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from, to, subject, html, text, reply_to: replyTo }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function finishEmailJob(supabase: any, emailJobId: string, success: boolean, lastError = "") {
  const { error } = await supabase.rpc("finish_booking_email_job", {
    p_job_id: emailJobId,
    p_success: success,
    p_error: lastError,
  });

  if (error) {
    console.warn("send-booking-update-email could not finish email job", {
      emailJobId,
      success,
      error: error.message,
    });
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

function formatDate(value: string, timeOnly = false) {
  return new Intl.DateTimeFormat("hu-HU", timeOnly
    ? { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" }
    : { year: "numeric", month: "2-digit", day: "2-digit", weekday: "long", timeZone: "Europe/Budapest" }
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
