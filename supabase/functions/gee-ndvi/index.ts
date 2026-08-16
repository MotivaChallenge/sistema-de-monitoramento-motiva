import { corsHeaders } from "../_shared/cors.ts";

/**
 * Google Earth Engine — índices espectrais (NDVI, EVI, SAVI) via Sentinel-2 SR Harmonized.
 *
 * Fluxo: autentica com service account (JWT RS256 -> OAuth2) e chama a REST API
 * do Earth Engine (value:compute) com um grafo de expressão serializado.
 *
 * Bandas: BLUE=B2, RED=B4, NIR=B8 (refletância escalada por 1e-4).
 *   NDVI = (NIR - RED) / (NIR + RED)
 *   EVI  = 2.5 * ((NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1))
 *   SAVI = ((NIR - RED) / (NIR + RED + L)) * (1 + L),  L = 0.5
 *
 * Máscara de nuvens/sombras: banda SCL do Sentinel-2 SR, mantendo apenas as
 * classes 4 (vegetação), 5 (solo exposto), 6 (água), 7 (nuvem baixa prob.) e
 * 11 (neve). Aplicada sobre a composição mediana do período.
 *
 * Composição temporal: mediana das imagens do período com CLOUDY_PIXEL_PERCENTAGE < 60.
 * Estatística zonal: mean, median, min, max, stdDev e count de pixels válidos
 * dentro do buffer (faixa de domínio) na resolução nativa de 10 m.
 *
 * Modo experimental (resample5m=true): reamostragem bilinear para uma grade de
 * 5 m — apenas para visualização/amostragem, NÃO cria informação espectral nova.
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

const f = (functionName: string, args: Record<string, unknown>) => ({
  functionInvocationValue: { functionName, arguments: args },
});
const ref = (k: string) => ({ valueReference: k });
const c = (v: unknown) => ({ constantValue: v });
const arr = (values: unknown[]) => ({ arrayValue: { values } });
/** Constante numérica como Image (o EE não faz cast automático em args de Image). */
const img = (v: number) => f("Image.constant", { value: c(v) });

interface GraphOpts {
  lat: number; lng: number; start: string; end: string; radius: number;
  scale: number; resample: null | "bilinear" | "nearest"; L: number; debug?: boolean;
}

/** Grafo do Earth Engine: NDVI/EVI/SAVI + estatística zonal no buffer do ponto. */
function indicesExpression(o: GraphOpts) {
  const startMs = Date.parse(`${o.start}T00:00:00Z`);
  const endMs = Date.parse(`${o.end}T23:59:59Z`);
  const band = (name: string) => f("Image.divide", {
    image1: f("Image.select", { input: ref("masked"), bandSelectors: c([name]) }),
    image2: img(10000),
  });

  const values: Record<string, unknown> = {
    point: f("GeometryConstructors.Point", { coordinates: c([o.lng, o.lat]) }),
    region: f("Geometry.buffer", { geometry: ref("point"), distance: c(o.radius) }),
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
        filters: arr([
          f("Filter.greaterThanOrEquals", { leftField: c("system:time_start"), rightValue: c(startMs) }),
          f("Filter.lessThan", { leftField: c("system:time_start"), rightValue: c(endMs) }),
        ]),
      }),
    }),
    byCloud: f("Collection.filter", {
      collection: ref("byDate"),
      filter: f("Filter.lessThan", { leftField: c("CLOUDY_PIXEL_PERCENTAGE"), rightValue: c(60) }),
    }),
    count: f("Collection.size", { collection: ref("byCloud") }),
    median: f("reduce.median", { collection: ref("byCloud") }),
    // --- máscara de nuvens/sombras via SCL ---
    scl: f("Image.select", { input: ref("median"), bandSelectors: c(["SCL"]) }),
    sclRound: f("Image.round", { value: ref("scl") }),
    keep: f("Image.or", {
      image1: f("Image.or", {
        image1: f("Image.or", {
          image1: f("Image.eq", { image1: ref("sclRound"), image2: img(4) }),
          image2: f("Image.eq", { image1: ref("sclRound"), image2: img(5) }),
        }),
        image2: f("Image.eq", { image1: ref("sclRound"), image2: img(6) }),
      }),
      image2: f("Image.or", {
        image1: f("Image.eq", { image1: ref("sclRound"), image2: img(7) }),
        image2: f("Image.eq", { image1: ref("sclRound"), image2: img(11) }),
      }),
    }),
    maskedRaw: f("Image.updateMask", { image: ref("median"), mask: ref("keep") }),
  };

  values.masked = o.resample
    ? f("Image.resample", { image: ref("maskedRaw"), mode: c(o.resample) })
    : ref("maskedRaw");

  values.nir = band("B8");
  values.red = band("B4");
  values.blue = band("B2");

  // NDVI
  values.ndviRaw = f("Image.divide", {
    image1: f("Image.subtract", { image1: ref("nir"), image2: ref("red") }),
    image2: f("Image.add", { image1: ref("nir"), image2: ref("red") }),
  });
  values.ndvi = f("Image.rename", { input: ref("ndviRaw"), names: c(["ndvi"]) });

  // EVI = 2.5 * ((NIR-RED) / (NIR + 6*RED - 7.5*BLUE + 1))
  values.eviDen = f("Image.add", {
    image1: f("Image.subtract", {
      image1: f("Image.add", {
        image1: ref("nir"),
        image2: f("Image.multiply", { image1: ref("red"), image2: img(6) }),
      }),
      image2: f("Image.multiply", { image1: ref("blue"), image2: img(7.5) }),
    }),
    image2: img(1),
  });
  values.eviRaw = f("Image.multiply", {
    image1: f("Image.divide", {
      image1: f("Image.subtract", { image1: ref("nir"), image2: ref("red") }),
      image2: ref("eviDen"),
    }),
    image2: img(2.5),
  });
  values.evi = f("Image.rename", { input: ref("eviRaw"), names: c(["evi"]) });

  // SAVI = ((NIR-RED)/(NIR+RED+L)) * (1+L)
  values.saviRaw = f("Image.multiply", {
    image1: f("Image.divide", {
      image1: f("Image.subtract", { image1: ref("nir"), image2: ref("red") }),
      image2: f("Image.add", {
        image1: f("Image.add", { image1: ref("nir"), image2: ref("red") }),
        image2: img(o.L),
      }),
    }),
    image2: img(1 + o.L),
  });
  values.savi = f("Image.rename", { input: ref("saviRaw"), names: c(["savi"]) });

  values.stack = f("Image.addBands", {
    dstImg: f("Image.addBands", { dstImg: ref("ndvi"), srcImg: ref("evi"), overwrite: c(true) }),
    srcImg: ref("savi"),
    overwrite: c(true),
  });

  // Reducer combinado: mean + median + min + max + stdDev + count
  values.reducer = f("Reducer.combine", {
    reducer1: f("Reducer.combine", {
      reducer1: f("Reducer.combine", {
        reducer1: f("Reducer.combine", {
          reducer1: f("Reducer.combine", {
            reducer1: f("Reducer.mean", {}),
            reducer2: f("Reducer.median", {}),
            sharedInputs: c(true),
          }),
          reducer2: f("Reducer.min", {}),
          sharedInputs: c(true),
        }),
        reducer2: f("Reducer.max", {}),
        sharedInputs: c(true),
      }),
      reducer2: f("Reducer.stdDev", {}),
      sharedInputs: c(true),
    }),
    reducer2: f("Reducer.count", {}),
    sharedInputs: c(true),
  });

  values.stats = f("Image.reduceRegion", {
    image: ref("stack"),
    reducer: ref("reducer"),
    geometry: ref("region"),
    scale: c(o.scale),
    maxPixels: c(1e9),
    bestEffort: c(true),
  });
  values.result = f("Dictionary.set", { dictionary: ref("stats"), key: c("images"), value: ref("count") });

  if (!o.debug) return { values, result: "result" };

  // --- Modo auditoria: bandas brutas (escala 0-1), área do buffer e contagem SCL ---
  values.bands = f("Image.addBands", {
    dstImg: f("Image.addBands", {
      dstImg: f("Image.rename", { input: ref("red"), names: c(["b4"]) }),
      srcImg: f("Image.rename", { input: ref("nir"), names: c(["b8"]) }),
      overwrite: c(true),
    }),
    srcImg: f("Image.rename", { input: ref("blue"), names: c(["b2"]) }),
    overwrite: c(true),
  });
  values.bandStats = f("Image.reduceRegion", {
    image: ref("bands"),
    reducer: f("Reducer.combine", { reducer1: f("Reducer.mean", {}), reducer2: f("Reducer.count", {}), sharedInputs: c(true) }),
    geometry: ref("region"),
    scale: c(o.scale),
    maxPixels: c(1e9),
    bestEffort: c(true),
  });
  values.areaM2 = f("Geometry.area", {
    geometry: ref("region"),
    maxError: f("ErrorMargin", { value: c(1) }),
  });
  values.withArea = f("Dictionary.set", { dictionary: ref("result"), key: c("bufferAreaM2"), value: ref("areaM2") });
  values.debugOut = f("Dictionary.combine", {
    first: ref("withArea"), second: ref("bandStats"), overwrite: c(true),
  });
  return { values, result: "debugOut" };
}

const num = (v: unknown, digits = 4): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Number(v.toFixed(digits)) : null;

const RANGE: Record<string, [number, number]> = { ndvi: [-1, 1], evi: [-1, 2.5], savi: [-1.5, 1.5] };

const statsFor = (out: Record<string, unknown>, key: string) => {
  const inRange = (v: number | null) => {
    if (v === null) return null;
    const [lo, hi] = RANGE[key];
    return v < lo || v > hi ? null : v;
  };
  return {
    mean: inRange(num(out[`${key}_mean`])),
    median: inRange(num(out[`${key}_median`])),
    min: inRange(num(out[`${key}_min`])),
    max: inRange(num(out[`${key}_max`])),
    stdDev: num(out[`${key}_stdDev`]),
    validPixels: typeof out[`${key}_count`] === "number" ? Math.round(out[`${key}_count`] as number) : 0,
  };
};

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
    const L = Math.min(1, Math.max(0, Number.isFinite(Number(body.L)) ? Number(body.L) : 0.5));
    const experimental = body.resample5m === true;
    const debug = body.debug === true;
    const resamplingMethod: "bilinear" | "nearest" =
      body.resamplingMethod === "nearest" ? "nearest" : "bilinear";
    const end = new Date();
    const start = new Date(end.getTime() - days * 86_400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    /** Janela explícita (auditoria/retroativo): start=YYYY-MM-DD & end=YYYY-MM-DD. */
    const isoRe = /^\d{4}-\d{2}-\d{2}$/;
    const startStr = isoRe.test(String(body.start)) ? String(body.start) : iso(start);
    const endStr = isoRe.test(String(body.end)) ? String(body.end) : iso(end);

    const token = await getAccessToken(sa);
    const project = sa.project_id;
    const call = async (scale: number, resample: null | "bilinear" | "nearest") => {
      const res = await fetch(
        `https://earthengine.googleapis.com/v1/projects/${project}/value:compute`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            expression: indicesExpression({
              lat, lng, start: startStr, end: endStr, radius, scale, resample, L, debug,
            }),
          }),
        },
      );
      const text = await res.text();
      if (!res.ok) throw new Error(`Earth Engine falhou [${res.status}]: ${text}`);
      return (JSON.parse(text)?.result ?? {}) as Record<string, unknown>;
    };

    const out = await call(10, null);
    const indices = {
      ndvi: statsFor(out, "ndvi"),
      evi: statsFor(out, "evi"),
      savi: statsFor(out, "savi"),
    };
    const imagens = typeof out.images === "number" ? out.images : 0;
    const ndvi = indices.ndvi.mean;
    const hasData = imagens > 0 && ndvi !== null && indices.ndvi.validPixels > 0;

    let experimentalResult: unknown = null;
    if (experimental) {
      try {
        const out5 = await call(5, resamplingMethod);
        experimentalResult = {
          metadata: {
            native_resolution_m: 10,
            display_resolution_m: 5,
            resampling_method: resamplingMethod,
            is_experimental: true,
            creates_new_information: false,
            valid_native_pixel_count: indices.ndvi.validPixels,
          },
          indices: {
            ndvi: statsFor(out5, "ndvi"),
            evi: statsFor(out5, "evi"),
            savi: statsFor(out5, "savi"),
          },
          aviso:
            "Grade de 5 m obtida por reamostragem da imagem Sentinel-2 (resolução nativa ~10 m). " +
            "Não gera informação espectral nova e não altera altura, conformidade ou alertas oficiais.",
        };
      } catch (e) {
        console.error("modo experimental 5m falhou:", e);
      }
    }

    return new Response(JSON.stringify({
      source: "Sentinel-2 SR Harmonized · Google Earth Engine",
      point: { lat, lng },
      radiusMeters: radius,
      periodo: { de: startStr, ate: endStr },
      imagens,
      hasData,
      /** Compatibilidade: NDVI médio e altura do modelo validado (ndvi_linear_v1). */
      ndvi,
      alturaEstimadaCm: ndvi === null ? null : Math.max(0, Math.round((ndvi - 0.15) * 90)),
      heightModel: "ndvi_linear_v1",
      indices,
      quality: {
        cloudMask: "SCL (4,5,6,7,11) sobre composição mediana",
        composite: "mediana temporal · CLOUDY_PIXEL_PERCENTAGE < 60",
        nativeResolutionM: 10,
        saviL: L,
        validPixels: indices.ndvi.validPixels,
        lowPixelCount: indices.ndvi.validPixels < 20,
      },
      experimental5m: experimentalResult,
      debug: debug
        ? {
            bufferAreaM2: num(out.bufferAreaM2, 1),
            b4_mean: num(out.b4_mean, 6),
            b8_mean: num(out.b8_mean, 6),
            b2_mean: num(out.b2_mean, 6),
            b4_count: out.b4_count ?? null,
            b8_count: out.b8_count ?? null,
            ndvi_from_band_means:
              typeof out.b8_mean === "number" && typeof out.b4_mean === "number"
                ? num(((out.b8_mean as number) - (out.b4_mean as number)) / ((out.b8_mean as number) + (out.b4_mean as number)), 4)
                : null,
            scaleUsedM: 10,
          }
        : undefined,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("gee-ndvi error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
