import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TEST_RECIPIENT = "luminails.xx@gmail.com";
const EMAIL_RETRY_ATTEMPTS = 2;
const EMAIL_SEND_DELAY_MS = 650;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Attachment = { filename: string; content: string };
type EmailPreview = {
  type: string;
  label: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Attachment[];
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "llevisimon@gmail.com";
    const fromEmail = Deno.env.get("FROM_EMAIL") || "Lumi Nails <foglalas@luminails.hu>";
    const replyToEmail = Deno.env.get("REPLY_TO_EMAIL") || Deno.env.get("OWNER_EMAIL") || TEST_RECIPIENT;

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return json({ ok: false, error: "missing_email_environment" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    if (!(await isAdminRequest(req, supabase, adminEmail))) {
      return json({ ok: false, error: "not_authorized" }, 401);
    }

    const previews = buildPreviews(await loadSiteContent(supabase));
    if (previews.length !== 10) {
      return json({ ok: false, error: "preview_count_mismatch" }, 500);
    }

    const delivery: Array<Record<string, unknown>> = [];

    for (let index = 0; index < previews.length; index += 1) {
      const preview = previews[index];
      const subject = `[TESZT ${index + 1}/${previews.length}] ${preview.subject}`;

      try {
        const resendId = await sendEmailWithRetry(
          resendApiKey,
          fromEmail,
          TEST_RECIPIENT,
          replyToEmail,
          subject,
          preview.html,
          preview.text,
          preview.attachments || [],
        );
        delivery.push({ type: preview.type, label: preview.label, ok: true, resend_id: resendId });
      } catch (error) {
        delivery.push({ type: preview.type, label: preview.label, ok: false, error: errorMessage(error) });
      }

      if (index < previews.length - 1) await delay(EMAIL_SEND_DELAY_MS);
    }

    const sent = delivery.filter((item) => item.ok).length;
    const failed = delivery.length - sent;
    return json({ ok: failed === 0, recipient: TEST_RECIPIENT, sent, failed, delivery });
  } catch (error) {
    console.error("send-email-previews unexpected error", errorMessage(error));
    return json({ ok: false, error: errorMessage(error) }, 500);
  }
});

function buildPreviews(siteContent: any): EmailPreview[] {
  const location = String(siteContent?.kapcsolat?.cim || "2800 Tatabánya, Kós Károly út");
  const instagramUrl = String(siteContent?.kapcsolat?.instagramUzenet || siteContent?.kapcsolat?.instagram || "https://www.instagram.com/luminails.xx/");
  const reviewUrl = String(siteContent?.kapcsolat?.googleErtekelesUrl || siteContent?.kapcsolat?.terkepUrl || "https://www.google.com/search?q=Lumi+Nails+Tatab%C3%A1nya+Google+%C3%A9rt%C3%A9kel%C3%A9s");
  const customerName = "Teszt Vendég Hosszabb Névvel";
  const customerPhone = "+36 20 563 6494";
  const customerEmail = "teszt.foglalas.hosszu.email@luminails.hu";
  const service = "Körömépítés – M méret, egyedi díszítéssel";
  const appointment = "2026. augusztus 5., szerda\n12:00 – 13:30";
  const submitted = "2026. július 30., csütörtök\n14:24";
  const coupon = "LUMI1000 – 1000 Ft kedvezmény";
  const note = "Köröm stílus: elegáns, világos árnyalat apró köves díszítéssel.";
  const bookingReference = "LUMI-7K3M";
  const bookingManageUrl = "https://luminails.hu/foglalas/?foglalas=LUMI-7K3M#foglalas-ellenorzes";
  const variables = {
    nev: customerName,
    szolgaltatas: service,
    idopont: appointment,
    helyszin: location,
    instagram: instagramUrl,
    ertekelesLink: reviewUrl,
    honap: "2026. július",
  };
  const customerRows: Array<[string, unknown]> = [
    ["Szolgáltatás", service],
    ["Kupon", coupon],
    ["Időpont", appointment],
    ["Helyszín", location],
  ];
  const bookingCustomerRows: Array<[string, unknown]> = [
    ...customerRows.slice(0, 3),
    ["Foglalási azonosító", bookingReference],
    ...customerRows.slice(3),
  ];

  const ownerHtml = pageHtml(`
    ${testBadgeHtml("Új foglalás – tulajdonos")}
    <h1>Új foglalás érkezett</h1>
    ${detailTable([
      ["Név", customerName],
      ["Telefon", customerPhone],
      ["Email", customerEmail],
      ["Szolgáltatás", service],
      ["Kupon", coupon],
      ["Időpont", appointment],
      ["Beküldve", submitted],
      ["Foglalási azonosító", bookingReference],
      ["Megjegyzés", note],
    ])}
    <p class="muted">Ez egy biztonságos teszt. Nem jött létre valódi foglalás az admin felületen.</p>
  `);

  const previews: EmailPreview[] = [{
    type: "new_booking_owner",
    label: "Új foglalás – tulajdonos",
    subject: `Új Lumi Nails foglalás - ${customerName}`,
    html: ownerHtml,
    text: [
      "TESZT E-MAIL – nem valódi foglalás",
      "Új Lumi Nails foglalás",
      `Név: ${customerName}`,
      `Telefon: ${customerPhone}`,
      `Email: ${customerEmail}`,
      `Szolgáltatás: ${service}`,
      `Kupon: ${coupon}`,
      `Időpont: ${appointment}`,
      `Beküldve: ${submitted}`,
      "Foglalási azonosító: " + bookingReference,
      `Megjegyzés: ${note}`,
    ].join("\n"),
    attachments: [testCalendarAttachment(customerName, customerPhone, customerEmail, service)],
  }];

  const received = emailTemplate(siteContent?.email?.ujFoglalas, {
    targy: "Lumi Nails foglalásod beérkezett",
    cim: "Köszönöm a foglalásodat!",
    szoveg: "Szia {nev}!\n\nMegkaptam az időpontfoglalásodat, az alábbi adatokkal rögzítettük a rendszerben.",
  }, variables);
  previews.push(previewFromTemplate({
    type: "new_booking_customer",
    label: "Foglalás beérkezett – vendég",
    template: received,
    rows: bookingCustomerRows,
    actionUrl: bookingManageUrl,
    actionLabel: "Foglalás ellenőrzése vagy lemondása",
    secondaryActionUrl: instagramUrl,
    secondaryActionLabel: "Instagram üzenet",
  }));

  const updateSpecs = [
    {
      type: "confirmed",
      label: "Visszaigazolva",
      source: siteContent?.email?.visszaigazolas,
      fallback: {
        targy: "Lumi Nails időpontod visszaigazolva",
        cim: "Időpont visszaigazolva",
        szoveg: "Szia {nev}!\n\nA foglalásod vissza lett igazolva. Az aktuális részleteket lent találod.",
      },
    },
    {
      type: "confirmed_modified",
      label: "Visszaigazolva és módosítva",
      source: siteContent?.email?.visszaigazolasModositva,
      fallback: {
        targy: "Lumi Nails időpontod visszaigazolva és módosítva",
        cim: "Időpont visszaigazolva és módosítva",
        szoveg: "Szia {nev}!\n\nA foglalásod vissza lett igazolva, és az időpont adatai módosultak. Az aktuális részleteket lent találod.",
      },
      adminMessage: "Teszt adminüzenet: kérlek, az új időpont előtt 5 perccel érkezz.",
    },
    {
      type: "time_modified",
      label: "Időpont módosítva",
      source: siteContent?.email?.idopontModositva,
      fallback: {
        targy: "Lumi Nails időpontod módosult",
        cim: "Időpont módosítva",
        szoveg: "Szia {nev}!\n\nAz időpontod adatai módosultak. Az aktuális részleteket lent találod.",
      },
    },
    {
      type: "pending",
      label: "Függőben",
      source: siteContent?.email?.fuggoben,
      fallback: {
        targy: "Lumi Nails foglalásod státusza módosult",
        cim: "Foglalás státusza módosult",
        szoveg: "Szia {nev}!\n\nA foglalásod státusza módosult. Az aktuális részleteket lent találod.",
      },
    },
    {
      type: "cancelled",
      label: "Lemondva",
      source: siteContent?.email?.lemondas,
      fallback: {
        targy: "Lumi Nails időpontod lemondva",
        cim: "Időpont lemondva",
        szoveg: "Szia {nev}!\n\nA foglalásod lemondásra került. Ha új időpontot szeretnél egyeztetni, kérlek írj üzenetet.",
      },
    },
  ];

  updateSpecs.forEach((spec) => {
    previews.push(previewFromTemplate({
      type: spec.type,
      label: spec.label,
      template: emailTemplate(spec.source, spec.fallback, variables),
      rows: bookingCustomerRows,
      actionUrl: bookingManageUrl,
      actionLabel: "Foglalás ellenőrzése vagy lemondása",
      secondaryActionUrl: instagramUrl,
      secondaryActionLabel: "Instagram üzenet",
      adminMessage: spec.adminMessage || "",
    }));
  });

  const reminder = emailTemplate(siteContent?.email?.emlekezteto, {
    targy: "Emlékeztető: holnap Lumi Nails időpontod van",
    cim: "Holnap várlak az időpontodon",
    szoveg: "Szia {nev}!\n\nCsak szeretnélek emlékeztetni, hogy holnap várlak a foglalt időpontodra. A részleteket lent találod.\n\nHa bármi közbejönne, kérlek írj Instagramon minél hamarabb.",
  }, variables);
  previews.push(previewFromTemplate({
    type: "reminder",
    label: "Időpont-emlékeztető",
    template: reminder,
    rows: customerRows,
    actionUrl: instagramUrl,
    actionLabel: "Instagram üzenet",
  }));

  const review = emailTemplate(siteContent?.email?.ertekelesKeres, {
    targy: "Köszönöm, hogy nálam jártál",
    cim: "Köszönöm a bizalmadat",
    szoveg: "Szia {nev}!\n\nKöszönöm, hogy nálam jártál. Remélem, elégedett vagy a körmeiddel. Ha van egy perced, nagyon sokat segítene, ha írnál egy rövid Google értékelést.\n\nÉrtékelés link: {ertekelesLink}",
  }, variables);
  review.message = removeReviewLinkLine(review.message);
  previews.push(previewFromTemplate({
    type: "review_request",
    label: "Értékeléskérés",
    template: review,
    rows: [["Szolgáltatás", service], ["Kupon", coupon], ["Időpont", appointment]],
    actionUrl: reviewUrl,
    actionLabel: "Google értékelés írása",
    secondaryActionUrl: instagramUrl,
    secondaryActionLabel: "Instagram üzenet",
  }));

  const monthlyReport = emailTemplate(siteContent?.email?.haviStatisztika, {
    targy: "Lumi Nails havi összesítő - {honap}",
    cim: "{honap} havi összesítő",
    szoveg: "Az előző teljes naptári hónap foglalási összesítője. A riport csak névtelen, összesített adatokat tartalmaz.",
  }, variables);
  previews.push(previewFromTemplate({
    type: "monthly_booking_report",
    label: "Havi statisztika - tulajdonos",
    template: monthlyReport,
    rows: [
      ["Összes időpont", 24],
      ["Online foglalás", 19],
      ["Kézzel rögzített", 5],
      ["Elkészült", 20],
      ["Lemondás", 4],
      ["Egyedi vendégek", 17],
      ["Foglalt idő", "43 óra 30 perc"],
      ["Becsült bevétel", "142 500 Ft"],
    ],
  }));

  return previews;
}

function previewFromTemplate(options: {
  type: string;
  label: string;
  template: { subject: string; title: string; message: string };
  rows: Array<[string, unknown]>;
  actionUrl?: string;
  actionLabel?: string;
  secondaryActionUrl?: string;
  secondaryActionLabel?: string;
  adminMessage?: string;
}): EmailPreview {
  const adminMessageHtml = options.adminMessage
    ? `
      <div style="margin:20px 0;padding:12px 0 12px 14px;border-left:3px solid #bd7f91;">
        <p style="margin:0 0 6px;color:#5d4d46;font-weight:700;">üzenet</p>
        <p style="margin:0;">${escapeHtml(options.adminMessage)}</p>
      </div>
    `
    : "";
  const actions = [
    options.actionUrl && options.actionLabel ? actionButton(options.actionUrl, options.actionLabel, false) : "",
    options.secondaryActionUrl && options.secondaryActionLabel
      ? actionButton(options.secondaryActionUrl, options.secondaryActionLabel, true)
      : "",
  ].filter(Boolean).join(" ");

  const html = pageHtml(`
    ${testBadgeHtml(options.label)}
    <h1>${escapeHtml(options.template.title)}</h1>
    ${paragraphsHtml(options.template.message)}
    ${detailTable(options.rows)}
    ${adminMessageHtml}
    ${actions ? `<p style="margin:22px 0;">${actions}</p>` : ""}
    <p class="muted">Ez egy biztonságos teszt e-mail. Nem tartozik valódi foglaláshoz.</p>
    <p>Lumi Nails</p>
  `);

  const text = [
    `TESZT E-MAIL – ${options.label}`,
    "Nem tartozik valódi foglaláshoz.",
    "",
    options.template.title,
    options.template.message,
    "",
    ...options.rows.map(([label, value]) => `${label}: ${String(value ?? "")}`),
    ...(options.adminMessage ? ["", `üzenet: ${options.adminMessage}`] : []),
    ...(options.actionUrl ? ["", `${options.actionLabel}: ${options.actionUrl}`] : []),
    ...(options.secondaryActionUrl ? [`${options.secondaryActionLabel}: ${options.secondaryActionUrl}`] : []),
    "",
    "Lumi Nails",
  ].join("\n");

  return { type: options.type, label: options.label, subject: options.template.subject, html, text };
}

function testBadgeHtml(label: string) {
  return `
    <div style="margin:18px 0 4px;padding:9px 12px;background:#f6e8ed;border-left:3px solid #bd7f91;color:#8f5366;font-size:11px;font-weight:700;letter-spacing:1px;line-height:1.4;text-transform:uppercase;">
      Teszt e-mail · ${escapeHtml(label)} · nem valódi foglalás
    </div>
  `;
}

function actionButton(url: string, label: string, secondary: boolean) {
  const background = secondary ? "#fffaf6" : "#302824";
  const color = secondary ? "#302824" : "#fffaf6";
  const border = secondary ? "#cdbdb5" : "#302824";
  return `<a href="${escapeAttribute(url)}" class="lumi-email-button" style="display:inline-block;margin:0 6px 6px 0;padding:12px 18px;background:${background};color:${color};border:1px solid ${border};border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:.3px;">${escapeHtml(label)}</a>`;
}

function testCalendarAttachment(name: string, phone: string, email: string, service: string): Attachment {
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lumi Nails//Email Preview//HU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:lumi-email-preview@luminails.hu",
    "DTSTAMP:20260730T122400Z",
    "DTSTART:20260805T100000Z",
    "DTEND:20260805T113000Z",
    `SUMMARY:${icsText(name)}`,
    `DESCRIPTION:${icsText(`TESZT – ${phone} – ${email} – ${service}`)}`,
    "LOCATION:2800 Tatabanya",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return { filename: "lumi-nails-teszt-foglalas.ics", content: base64FromUtf8(calendar) };
}

async function isAdminRequest(req: Request, supabase: ReturnType<typeof createClient>, adminEmail: string) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const { data, error } = await supabase.auth.getUser(token);
  return !error && Boolean(data.user?.email) && data.user!.email!.toLowerCase() === adminEmail.toLowerCase();
}

async function loadSiteContent(supabase: any) {
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", "site_content").maybeSingle();
  if (error) {
    console.warn("send-email-previews site content load failed", error.message);
    return {};
  }
  return data?.value && typeof data.value === "object" ? data.value : {};
}

async function sendEmailWithRetry(
  apiKey: string,
  from: string,
  to: string,
  replyTo: string,
  subject: string,
  html: string,
  text: string,
  attachments: Attachment[],
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= EMAIL_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await sendEmail(apiKey, from, to, replyTo, subject, html, text, attachments);
    } catch (error) {
      lastError = error;
      if (attempt < EMAIL_RETRY_ATTEMPTS) await delay(700);
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
  attachments: Attachment[],
) {
  const payload: Record<string, unknown> = { from, to, subject, html, text, reply_to: replyTo };
  if (attachments.length > 0) payload.attachments = attachments;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(responseText || `Resend HTTP ${response.status}`);
  try {
    return String(JSON.parse(responseText)?.id || "");
  } catch (_error) {
    return "";
  }
}

function emailTemplate(source: any, fallback: any, variables: Record<string, string>) {
  return {
    subject: applyVariables(normalizeTemplateText(source?.targy || fallback.targy), variables),
    title: applyVariables(normalizeTemplateText(source?.cim || fallback.cim), variables),
    message: applyVariables(normalizeTemplateText(source?.szoveg || fallback.szoveg), variables),
  };
}

function normalizeTemplateText(value: unknown) {
  return String(value || "").replace(/\\\\r/g, "\r").replace(/\\\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\n/g, "\n");
}

function applyVariables(value: unknown, variables: Record<string, string>) {
  return String(value || "")
    .replace(/\{(nev|szolgaltatas|idopont|helyszin|instagram|ertekelesLink|honap)\}/g, (_match, key) => variables[key] || "")
    .replace(/\{\s*(https?:\/\/[^}\s]+)\s*\}/g, "$1");
}

function removeReviewLinkLine(value: string) {
  return normalizeTemplateText(value).split("\n").filter((line) => {
    const normalized = line.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (normalized.startsWith("ertekeles link:")) return false;
    if (/^\s*link\s*:\s*\{?\s*https?:\/\//i.test(line.trim())) return false;
    if (/^\s*google\s+ertekeles\s*:\s*\{?\s*https?:\/\//i.test(normalized)) return false;
    return true;
  }).join("\n").trim();
}

function paragraphsHtml(value: string) {
  return String(value || "").split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
}

function icsText(value: string) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function base64FromUtf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function escapeAttribute(value: unknown) { return escapeHtml(value); }
function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
