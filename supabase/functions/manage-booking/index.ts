import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERIC_NOT_FOUND = "A megadott adatokkal nem található foglalás.";
const RATE_LIMIT_MESSAGE = "Túl sok próbálkozás. Próbáld újra 1 perc múlva.";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ ok: false, code: "method_not_allowed", message: "Nem támogatott kérés." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, code: "server_error", message: "A foglaláskezelés átmenetileg nem érhető el." }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const clientHash = await sha256(clientIp(req));
    const { data: rateRows, error: rateError } = await supabase.rpc(
      "consume_booking_management_rate_limit",
      { p_client_hash: clientHash },
    );

    if (rateError) {
      console.error("manage-booking rate limit error", rateError.message);
      return json({ ok: false, code: "server_error", message: "A foglaláskezelés átmenetileg nem érhető el." }, 500);
    }

    const rate = Array.isArray(rateRows) ? rateRows[0] : rateRows;
    if (!rate?.allowed) {
      const retryAfter = Math.max(1, Number(rate?.retry_after_seconds) || 60);
      return json(
        { ok: false, code: "rate_limited", message: RATE_LIMIT_MESSAGE, retry_after_seconds: retryAfter },
        429,
        { "Retry-After": String(retryAfter) },
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim().toLowerCase();
    const reference = normalizeReference(body?.reference);
    const contact = String(body?.contact || "").trim();
    const note = String(body?.note || "").trim().slice(0, 500);

    if (!reference || !validContact(contact)) {
      return json({
        ok: false,
        code: "invalid_input",
        message: "Add meg a LUMI azonosítót és a foglalásnál használt e-mail-címet vagy telefonszámot.",
      }, 400);
    }

    if (action === "lookup") {
      const { data, error } = await supabase.rpc("get_booking_status_verified", {
        p_reference: reference,
        p_contact: contact,
      });
      if (error) {
        console.error("manage-booking lookup error", error.message);
        return json({ ok: false, code: "server_error", message: "A foglalás most nem kérhető le. Próbáld újra később." }, 500);
      }
      const booking = Array.isArray(data) ? data[0] : data;
      if (!booking) return json({ ok: false, code: "not_found", message: GENERIC_NOT_FOUND }, 404);
      return json({ ok: true, booking });
    }

    if (action === "cancel") {
      const { data, error } = await supabase.rpc("cancel_booking_by_verified_contact", {
        p_reference: reference,
        p_contact: contact,
        p_note: note,
      });
      if (error) {
        console.error("manage-booking cancel error", error.message);
        return json({ ok: false, code: "server_error", message: "A lemondás most nem végezhető el. Próbáld újra később." }, 500);
      }
      const result = Array.isArray(data) ? data[0] : data;
      if (!result || result.result === "not_found") {
        return json({ ok: false, code: "not_found", message: GENERIC_NOT_FOUND }, 404);
      }
      return json({ ok: Boolean(result.success), code: String(result.result || "unknown"), message: String(result.message || "") }, result.success ? 200 : 400);
    }

    return json({ ok: false, code: "invalid_action", message: "Érvénytelen művelet." }, 400);
  } catch (error) {
    console.error("manage-booking unexpected error", errorMessage(error));
    return json({ ok: false, code: "server_error", message: "A foglaláskezelés átmenetileg nem érhető el." }, 500);
  }
});

function normalizeReference(value: unknown) {
  const compact = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^LUMI[A-Z0-9]{4}$/.test(compact)) return `LUMI-${compact.slice(4)}`;
  if (/^LUMI[A-Z0-9]{20}$/.test(compact)) {
    const rest = compact.slice(4);
    return `LUMI-${rest.match(/.{1,4}/g)?.join("-") || rest}`;
  }
  return "";
}

function validContact(value: string) {
  const contact = value.trim();
  if (!contact || contact.length > 254) return false;
  if (contact.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  return normalizePhone(contact).length === 9;
}

function normalizePhone(value: string) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("0036")) digits = digits.slice(4);
  else if (digits.length === 11 && digits.startsWith("36")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("06")) digits = digits.slice(2);
  return digits.length === 9 ? digits : "";
}

function clientIp(req: Request) {
  return req.headers.get("cf-connecting-ip")?.trim()
    || req.headers.get("x-real-ip")?.trim()
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown-client";
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
