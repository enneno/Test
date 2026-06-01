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
    const { booking_id } = await req.json();

    if (!booking_id) {
      return json({ error: "Missing booking_id" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const ownerEmail = Deno.env.get("OWNER_EMAIL") || "szofipetras087@gmail.com";
    const fromEmail = Deno.env.get("FROM_EMAIL") || "Lumi Nails <onboarding@resend.dev>";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Missing Supabase environment variables" }, 500);
    }

    if (!resendApiKey) {
      return json({ ok: true, email: "skipped" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("customer_name,customer_phone,customer_email,note,starts_at,ends_at,services(name,price_text)")
      .eq("id", booking_id)
      .single();

    if (error || !booking) {
      return json({ error: "Booking not found" }, 404);
    }

    const serviceName = booking.services?.name || "Szolgáltatás";
    const startsAt = formatDate(booking.starts_at);
    const endsAt = formatDate(booking.ends_at, true);

    const ownerHtml = `
      <h2>Új Lumi Nails foglalás</h2>
      <p><strong>Név:</strong> ${escapeHtml(booking.customer_name)}</p>
      <p><strong>Telefon:</strong> ${escapeHtml(booking.customer_phone)}</p>
      <p><strong>Email:</strong> ${escapeHtml(booking.customer_email)}</p>
      <p><strong>Szolgáltatás:</strong> ${escapeHtml(serviceName)}</p>
      <p><strong>Időpont:</strong> ${escapeHtml(startsAt)} - ${escapeHtml(endsAt)}</p>
      ${booking.note ? `<p><strong>Megjegyzés:</strong> ${escapeHtml(booking.note)}</p>` : ""}
    `;

    const customerHtml = `
      <h2>Köszönöm a foglalásodat!</h2>
      <p>Szia ${escapeHtml(booking.customer_name)}!</p>
      <p>Megkaptam az időpontkérésedet. Hamarosan visszajelzek, hogy véglegesítve van-e.</p>
      <p><strong>Szolgáltatás:</strong> ${escapeHtml(serviceName)}</p>
      <p><strong>Időpont:</strong> ${escapeHtml(startsAt)} - ${escapeHtml(endsAt)}</p>
      <p>Lumi Nails</p>
    `;

    await Promise.all([
      sendEmail(resendApiKey, fromEmail, ownerEmail, "Új Lumi Nails foglalás", ownerHtml),
      sendEmail(resendApiKey, fromEmail, booking.customer_email, "Lumi Nails foglalásod beérkezett", customerHtml),
    ]);

    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

async function sendEmail(apiKey: string, from: string, to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
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
    : { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" }
  ).format(new Date(value));
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
