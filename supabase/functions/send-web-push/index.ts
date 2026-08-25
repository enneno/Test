import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushNotification } from "npm:@mmmike/web-push@1.3.0/send";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
};

type BookingRecord = {
  id?: string;
  customer_name?: string;
  starts_at?: string;
  status?: string;
  service_id?: string;
};

serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: "missing_environment" }, 500);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const config = await loadPushConfig(supabase);
    if (!config.publicKey || !config.privateKey || !config.webhookSecret) {
      return json({ ok: false, error: "push_not_configured" }, 503);
    }

    const requestSecret = String(req.headers.get("x-lumi-web-push-secret") || "");
    if (!constantTimeEqual(requestSecret, config.webhookSecret)) {
      return json({ ok: false, error: "not_authorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const eventType = String(body.type || body.event || "").toUpperCase();
    const record = normalizeBooking(body.record);
    const oldRecord = normalizeBooking(body.old_record);

    const notificationKind = bookingNotificationKind(eventType, record, oldRecord);
    if (!notificationKind) return json({ ok: true, skipped: true });

    let serviceName = "Időpont";
    if (record.service_id) {
      const { data } = await supabase
        .from("services")
        .select("name")
        .eq("id", record.service_id)
        .maybeSingle();
      serviceName = String(data?.name || serviceName);
    }

    const payload = createPayload(notificationKind, record, serviceName);
    const { data: rows, error: subscriptionsError } = await supabase
      .from("web_push_subscriptions")
      .select("id,endpoint,p256dh,auth_secret")
      .is("disabled_at", null);

    if (subscriptionsError) {
      console.error("send-web-push subscription lookup failed", subscriptionsError.message);
      return json({ ok: false, error: "subscription_lookup_failed" }, 500);
    }

    const subscriptions = Array.isArray(rows) ? rows as PushSubscriptionRow[] : [];
    const results = [];

    for (const subscription of subscriptions) {
      try {
        const sent = await sendPushNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth_secret },
          },
          payload,
          {
            publicKey: config.publicKey,
            privateKey: config.privateKey,
            subject: config.subject,
          },
        );
        results.push({ id: subscription.id, ok: Boolean(sent) });
      } catch (error) {
        const status = errorStatus(error);
        const message = errorMessage(error);
        console.warn("send-web-push delivery failed", { subscriptionId: subscription.id, status, error: message });

        if (status === 404 || status === 410) {
          await supabase
            .from("web_push_subscriptions")
            .update({ disabled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", subscription.id);
        }
        results.push({ id: subscription.id, ok: false, status, error: message });
      }
    }

    return json({
      ok: true,
      kind: notificationKind,
      found: subscriptions.length,
      sent: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
    });
  } catch (error) {
    console.error("send-web-push unexpected error", errorMessage(error));
    return json({ ok: false, error: "unexpected_error" }, 500);
  }
});

async function loadPushConfig(client: any) {
  const { data, error } = await client.rpc("get_web_push_server_config");
  if (error) throw new Error(`push_config: ${error.message}`);
  const value = data && typeof data === "object" ? data : {};
  return {
    publicKey: String(value.vapid_public_key || "").trim(),
    privateKey: String(value.vapid_private_key || "").trim(),
    subject: String(value.vapid_subject || "mailto:luminails.xx@gmail.com").trim(),
    webhookSecret: String(value.webhook_secret || "").trim(),
  };
}

function bookingNotificationKind(eventType: string, record: BookingRecord, oldRecord: BookingRecord) {
  if (eventType === "INSERT") return "new_booking";
  if (eventType === "UPDATE" && record.status === "cancelled" && oldRecord.status !== "cancelled") return "cancelled";
  return "";
}

function createPayload(kind: string, booking: BookingRecord, serviceName: string) {
  const customer = String(booking.customer_name || "Vendég").trim() || "Vendég";
  const appointment = formatBudapestDate(booking.starts_at);

  if (kind === "cancelled") {
    return {
      title: "Foglalás lemondva",
      body: `${customer} · ${serviceName}${appointment ? ` · ${appointment}` : ""}`,
      icon: "/kepek/favicon-192.png",
      badge: "/kepek/favicon-96.png",
      tag: booking.id ? `booking-cancelled-${booking.id}` : "booking-cancelled",
      data: { url: "/admin/" },
    };
  }

  return {
    title: "Új Lumi Nails foglalás",
    body: `${customer} · ${serviceName}${appointment ? ` · ${appointment}` : ""}`,
    icon: "/kepek/favicon-192.png",
    badge: "/kepek/favicon-96.png",
    tag: booking.id ? `booking-new-${booking.id}` : "booking-new",
    data: { url: "/admin/" },
  };
}

function formatBudapestDate(value: unknown) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeBooking(value: unknown): BookingRecord {
  return value && typeof value === "object" ? value as BookingRecord : {};
}

function constantTimeEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

function errorStatus(error: unknown) {
  if (!error || typeof error !== "object") return 0;
  const source = error as Record<string, unknown>;
  const direct = Number(source.statusCode || source.status || 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const response = source.response && typeof source.response === "object" ? source.response as Record<string, unknown> : {};
  const nested = Number(response.status || 0);
  return Number.isFinite(nested) ? nested : 0;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "unknown_error");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
