import { corsHeaders } from "../_shared/cors.ts";

/**
 * Google Earth Engine (GEE) — NDVI real via Sentinel-2 SR Harmonized.
 * Autentica com service account (JWT RS256 -> OAuth2) e chama a REST API
 * do Earth Engine (value:compute) com um grafo de expressão serializado.
 */

const SCOPES = [
  "https://www.googleapis.com/auth/earthengine.readonly",
  "https://www.googleapis.com/auth/cloud-platform",
].join(" ");

const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const pemToBytes = (pem: string) => {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: Record<string, string>) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = b64url(new TextEncoder().encode(JSON.stringify({
    iss: sa.client_email,
    scope: SCOPES,
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  })));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
  const jwt = `${header}.${claim}.${b64url(sig)}`;

  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`OAuth falhou [${res.status}]: ${body}`);
  const json = JSON.parse(body);
  cachedToken = { token: json.access_token, exp: now + (json.expires_in ?? 3600) };
  return cachedToken.token;
}

/** Grafo de expressão do Earth Engine: NDVI médio (mediana temporal) num buffer do ponto. */
function ndviExpression(lat: number, lng: number, start: string, end: string, radius: number) {
  const f = (functionName: string, args: Record<string, unknown>) => ({
    functionInvocationValue: { functionName, arguments: args },
  });
  const ref = (k: string) => ({ valueReference: k });
  const c = (v: unknown) => ({ constantValue: v });
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T23:59:59Z`);

  return {
    values: {
      point: f("GeometryConstructors.Point", { coordinates: c([lng, lat]) }),
      region: f("Geometry.buffer", { geometry: ref("point"), distance: c(radius) }),
      col: f("ImageCollection.load", { id: c("COPERNICUS/S2_SR_HARMONIZED") }),
      byBounds: f("Collection.filter", {
        collection: ref("col"),
        filter: f("Filter.intersects", {
          leftField: c(".all"),
          rightValue: f("Feature", { geometry: ref("region") }),
        }),
      }),
      byDate: f("Collection.filter", {
        collection: ref("byBounds"),
        filter: f("Filter.and", {
          filters: {
            arrayValue: {
              values: [
                f("Filter.greaterThanOrEquals", { leftField: c("system:time_start"), rightValue: c(startMs) }),
                f("Filter.lessThan", { leftField: c("system:time_start"), rightValue: c(endMs) }),
              ],
            },
          },
        }),
      }),
      byCloud: f("Collection.filter", {
        collection: ref("byDate"),
        filter: f("Filter.lessThan", { leftField: c("CLOUDY_PIXEL_PERCENTAGE"), rightValue: c(60) }),
      }),
      count: f("Collection.size", { collection: ref("byCloud") }),
      median: f("reduce.median", { collection: ref("byCloud") }),
      ndvi: f("Image.normalizedDifference", { input: ref("median"), bandNames: c(["B8", "B4"]) }),
      stats: f("Image.reduceRegion", {
        image: ref("ndvi"),
        reducer: f("Reducer.mean", {}),
        geometry: ref("region"),
        scale: c(10),
        maxPixels: c(1e9),
        bestEffort: c(true),
      }),
      result: f("Dictionary.set", { dictionary: ref("stats"), key: c("images"), value: ref("count") }),
    },
    result: "result",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const raw = Deno.env.get("GEE_SERVICE_ACCOUNT_JSON");
    if (!raw) throw new Error("GEE_SERVICE_ACCOUNT_JSON não configurado");
    const sa = JSON.parse(raw);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return new Response(JSON.stringify({ error: "lat/lng inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const radius = Math.min(2000, Math.max(20, Number(body.radius) || 150));
    const days = Math.min(365, Math.max(10, Number(body.days) || 60));
    const end = new Date();
    const start = new Date(end.getTime() - days * 86_400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const token = await getAccessToken(sa);
    const project = sa.project_id;
    const res = await fetch(
      `https://earthengine.googleapis.com/v1/projects/${project}/value:compute`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expression: ndviExpression(lat, lng, iso(start), iso(end), radius) }),
      },
    );
    const text = await res.text();
    if (!res.ok) {
      console.error(`Earth Engine falhou [${res.status}]: ${text}`);
      return new Response(JSON.stringify({ error: "Earth Engine falhou", status: res.status, details: text }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const out = JSON.parse(text)?.result ?? {};
    const ndvi = typeof out.nd === "number" ? Number(out.nd.toFixed(3)) : null;

    return new Response(JSON.stringify({
      source: "Sentinel-2 SR Harmonized · Google Earth Engine",
      point: { lat, lng },
      radiusMeters: radius,
      periodo: { de: iso(start), ate: iso(end) },
      imagens: out.images ?? 0,
      ndvi,
      /** Altura estimada (cm) a partir do NDVI — heurística de vegetação rasteira. */
      alturaEstimadaCm: ndvi === null ? null : Math.max(0, Math.round((ndvi - 0.15) * 90)),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("gee-ndvi error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
