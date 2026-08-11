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

  try {
    const body = await req.json().catch(() => ({}));
    const requestKey = stringValue(body.request_key);
    const serviceId = stringValue(body.service_id);
    const customerName = stringValue(body.customer_name);
    const customerPhone = stringValue(body.customer_phone);
    const customerEmail = stringValue(body.customer_email).toLowerCase();
    const note = stringValue(body.note);
    const startsAt = stringValue(body.starts_at);
    const couponId = stringValue(body.coupon_id);
    const couponCode = stringValue(body.coupon_code).toUpperCase();

    if (!isUuid(requestKey)) {
      return json({ ok: false, error: "Érvénytelen foglalási műveletazonosító." }, 400);
    }

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
    const bookingRpcBody = {
      p_request_key: requestKey,
      p_service_id: serviceId,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_email: customerEmail,
      p_note: note,
      p_starts_at: startsAt,
      p_coupon_id: couponId || null,
      p_coupon_code: couponCode || null,
    };
    const { data: bookingId, error } = await supabase.rpc("create_booking_idempotent", bookingRpcBody);

    if (error || !bookingId) {
      console.error("create-booking-with-email booking failed", {
        error: error?.message || "missing booking id",
        startsAt,
      });
      return json({ ok: false, error: cleanError(error?.message || "Nem sikerült létrehozni a foglalást.") }, 400);
    }

    console.log("create-booking-with-email booking created", { bookingId, startsAt });
    const { data: bookingReferenceRow, error: bookingReferenceError } = await supabase
      .from("bookings")
      .select("public_reference")
      .eq("id", bookingId)
      .single();
    const bookingReference = String(bookingReferenceRow?.public_reference || "").trim() || null;

    if (bookingReferenceError || !bookingReference) {
      console.warn("create-booking-with-email booking reference lookup failed", {
        bookingId,
        error: bookingReferenceError?.message || "missing public_reference",
      });
    }

    const { data: emailJobs, error: enqueueError } = await supabase.rpc("enqueue_new_booking_email", {
      p_booking_id: bookingId,
    });
    const emailJob = Array.isArray(emailJobs) ? emailJobs[0] : null;

    if (enqueueError || !emailJob?.id) {
      console.error("create-booking-with-email queue creation failed", { bookingId, error: enqueueError?.message || "email_job_missing" });
      return json({
        ok: false,
        booking_created: true,
        booking_id: bookingId,
        booking_reference: bookingReference,
        request_key: requestKey,
        error: "A foglalás létrejött, de az értesítés előkészítése megszakadt. Kérlek, küldd el újra; az időpont nem fog duplázódni.",
      });
    }

    let email: Record<string, unknown>;
    if (emailJob.status === "sent") {
      email = { ok: true, queued: true, reused: true };
    } else {
      email = await sendBookingEmail(
        supabaseUrl,
        serviceRoleKey,
        String(bookingId),
        String(emailJob.id),
      );
    }

    if (!email.ok) {
      console.error("create-booking-with-email email failed", { bookingId, email });
    } else {
      console.log("create-booking-with-email email sent", { bookingId, email });
    }

    return json({
      ok: true,
      booking_id: bookingId,
      booking_reference: bookingReference,
      request_key: requestKey,
      email,
    });
  } catch (error) {
    console.error("create-booking-with-email unexpected error", errorMessage(error));
    return json({ ok: false, error: errorMessage(error) }, 500);
  }
});


async function sendBookingEmail(supabaseUrl: string, serviceRoleKey: string, bookingId: string, emailJobId: string) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "x-lumi-internal-secret": serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ booking_id: bookingId, email_job_id: emailJobId }),
    });
    const data = await responseJson(response);

    if (response.ok && data?.ok) {
      return { ...data, queued: true };
    }

    return {
      ok: false,
      queued: true,
      error: { status: response.status, data },
    };
  } catch (error) {
    return { ok: false, queued: true, error: errorMessage(error) };
  }
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanError(message: string) {
  return message.replace(/^ERROR:\s*/i, "").trim();
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
