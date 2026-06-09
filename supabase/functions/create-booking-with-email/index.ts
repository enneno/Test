import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const EMAIL_FUNCTION_RETRY_ATTEMPTS = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const serviceId = stringValue(body.service_id);
    const customerName = stringValue(body.customer_name);
    const customerPhone = stringValue(body.customer_phone);
    const customerEmail = stringValue(body.customer_email).toLowerCase();
    const note = stringValue(body.note);
    const startsAt = stringValue(body.starts_at);

    if (!serviceId || !customerName || !customerPhone || !customerEmail || !startsAt) {
      return json({ ok: false, error: "Hiányzó foglalási adat." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("create-booking-with-email missing Supabase env");
      return json({ ok: false, error: "Hiányzó Supabase beállítás." }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: bookingId, error } = await supabase.rpc("create_booking", {
      p_service_id: serviceId,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_email: customerEmail,
      p_note: note,
      p_starts_at: startsAt,
    });

    if (error || !bookingId) {
      console.error("create-booking-with-email booking failed", {
        error: error?.message || "missing booking id",
        startsAt,
      });
      return json({ ok: false, error: cleanError(error?.message || "Nem sikerült létrehozni a foglalást.") }, 400);
    }

    console.log("create-booking-with-email booking created", { bookingId, startsAt });

    const email = await sendBookingEmail(supabaseUrl, serviceRoleKey, String(bookingId));

    if (!email.ok) {
      console.error("create-booking-with-email email failed", { bookingId, email });
    } else {
      console.log("create-booking-with-email email sent", { bookingId, email });
    }

    return json({
      ok: true,
      booking_id: bookingId,
      email,
    });
  } catch (error) {
    console.error("create-booking-with-email unexpected error", errorMessage(error));
    return json({ ok: false, error: errorMessage(error) }, 500);
  }
});

async function sendBookingEmail(supabaseUrl: string, serviceRoleKey: string, bookingId: string) {
  let lastResult: unknown = null;

  for (let attempt = 1; attempt <= EMAIL_FUNCTION_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ booking_id: bookingId }),
      });

      const data = await responseJson(response);

      if (response.ok && data?.ok) {
        return data;
      }

      lastResult = {
        status: response.status,
        data,
      };
      console.warn("create-booking-with-email email function attempt failed", {
        bookingId,
        attempt,
        maxAttempts: EMAIL_FUNCTION_RETRY_ATTEMPTS,
        result: lastResult,
      });
    } catch (error) {
      lastResult = errorMessage(error);
      console.warn("create-booking-with-email email function attempt failed", {
        bookingId,
        attempt,
        maxAttempts: EMAIL_FUNCTION_RETRY_ATTEMPTS,
        error: lastResult,
      });
    }

    if (attempt < EMAIL_FUNCTION_RETRY_ATTEMPTS) {
      await delay(700);
    }
  }

  return { ok: false, error: lastResult };
}

async function responseJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function stringValue(value: unknown) {
  return String(value || "").trim();
}

function cleanError(message: string) {
  return message.replace(/^ERROR:\s*/i, "").trim();
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
