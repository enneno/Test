import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "booking-inspirations";
const MAX_FILES = 5;
const MAX_FILE_BYTES = 512 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const uploadedPaths: string[] = [];
  let supabase: any = null;
  let claimedRequestKey = "";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: "Hiányzó Supabase beállítás." }, 500);
    }

    const form = await req.formData();
    const bookingId = stringValue(form.get("booking_id"));
    const requestKey = stringValue(form.get("request_key"));
    const nailStyle = stringValue(form.get("nail_style")).slice(0, 120);
    const nailStyleNote = stringValue(form.get("nail_style_note")).slice(0, 1200);
    const metadata = parseMetadata(form.get("metadata"));
    const files = Array.from(form.entries())
      .filter(([key, value]) => key.startsWith("file_") && value instanceof File)
      .sort(([left], [right]) => left.localeCompare(right, "en", { numeric: true }))
      .map(([, value]) => value as File);

    if (!isUuid(bookingId) || !isUuid(requestKey)) {
      return json({ ok: false, error: "Érvénytelen foglalási feltöltési engedély." }, 400);
    }

    if (!files.length || files.length > MAX_FILES || metadata.length !== files.length) {
      return json({ ok: false, error: "Érvénytelen inspirációs képlista." }, 400);
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_FILE_BYTES) {
        return json({ ok: false, error: "Az egyik előkészített kép típusa vagy mérete nem megfelelő." }, 400);
      }
    }

    supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: requestRow, error: requestError } = await supabase
      .from("booking_request_keys")
      .select("booking_id,created_at")
      .eq("request_key", requestKey)
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (requestError || !requestRow) {
      return json({ ok: false, error: "A feltöltési engedély nem tartozik ehhez a foglaláshoz." }, 403);
    }

    if (Date.now() - new Date(requestRow.created_at).getTime() > 2 * 60 * 60 * 1000) {
      return json({ ok: false, error: "A feltöltési engedély lejárt." }, 410);
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("inspiration_images")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return json({ ok: false, error: "A foglalás nem található." }, 404);
    }

    if (Array.isArray(booking.inspiration_images) && booking.inspiration_images.length > 0) {
      return json({ ok: true, reused: true, images: booking.inspiration_images.length });
    }

    const uploadStartedAt = new Date().toISOString();
    const staleUploadBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: uploadClaim, error: uploadClaimError } = await supabase
      .from("booking_request_keys")
      .update({ inspiration_upload_started_at: uploadStartedAt })
      .eq("request_key", requestKey)
      .eq("booking_id", bookingId)
      .is("inspiration_uploaded_at", null)
      .or(`inspiration_upload_started_at.is.null,inspiration_upload_started_at.lt.${staleUploadBefore}`)
      .select("request_key")
      .maybeSingle();

    if (uploadClaimError) {
      throw new Error(`A képfeltöltés zárolása nem sikerült: ${uploadClaimError.message}`);
    }

    if (!uploadClaim) {
      return json({ ok: false, error: "A képfeltöltés már folyamatban van. Kérlek, próbáld újra rövidesen." }, 409);
    }

    claimedRequestKey = requestKey;

    const images: Array<Record<string, unknown>> = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const extension = extensionForType(file.type);
      const path = `${bookingId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Képfeltöltési hiba: ${uploadError.message}`);
      }

      uploadedPaths.push(path);
      const meta = metadata[index] || {};
      images.push({
        bucket: BUCKET,
        path,
        name: left(meta.name || file.name, 240),
        type: file.type,
        size: file.size,
        originalName: left(meta.originalName || meta.name || file.name, 240),
        originalType: left(meta.originalType || "", 120),
        originalSize: safeInteger(meta.originalSize),
        optimized: true,
      });
    }

    const first = images[0];
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        inspiration_images: images,
        inspiration_image_url: null,
        inspiration_image_path: first.path,
        inspiration_image_name: first.name,
        inspiration_image_type: first.type,
        inspiration_image_size: first.size,
        nail_style: nailStyle,
        nail_style_note: nailStyleNote,
      })
      .eq("id", bookingId);

    if (updateError) {
      throw new Error(`A képek foglaláshoz kapcsolása nem sikerült: ${updateError.message}`);
    }


    const { error: uploadMarkError } = await supabase
      .from("booking_request_keys")
      .update({ inspiration_uploaded_at: new Date().toISOString() })
      .eq("request_key", requestKey);
    if (uploadMarkError) {
      console.warn("upload-booking-inspirations completion mark failed", uploadMarkError.message);
    }
    claimedRequestKey = "";
    return json({ ok: true, images: images.length });
  } catch (error) {
    if (supabase && uploadedPaths.length) {
      const { error: cleanupError } = await supabase.storage.from(BUCKET).remove(uploadedPaths);
      if (cleanupError) {
        console.error("upload-booking-inspirations cleanup failed", cleanupError.message);
      }
    }

    console.error("upload-booking-inspirations failed", errorMessage(error));

    if (supabase && claimedRequestKey) {
      const { error: releaseError } = await supabase
        .from("booking_request_keys")
        .update({ inspiration_upload_started_at: null })
        .eq("request_key", claimedRequestKey)
        .is("inspiration_uploaded_at", null);
      if (releaseError) console.error("upload-booking-inspirations claim release failed", releaseError.message);
    }
    return json({ ok: false, error: errorMessage(error) }, 500);
  }
});

function parseMetadata(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
  } catch {
    return [];
  }
}

function extensionForType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function safeInteger(value: unknown) {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
}

function left(value: unknown, length: number) {
  return String(value || "").trim().slice(0, length);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
