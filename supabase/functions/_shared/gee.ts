/**
 * Núcleo compartilhado do Google Earth Engine (Sentinel-2 SR Harmonized).
 * Usado por gee-ndvi (consulta pontual) e gee-refresh-segments (atualização em lote).
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

export async function getAccessToken(sa: Record<string, string>) {
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

export interface GraphOpts {
  lat: number; lng: number; start: string; end: string; radius: number;
  scale: number; resample: null | "bilinear" | "nearest"; L: number; debug?: boolean;
  /** Quando informado, a região é o buffer de `radius` m ao redor desta linha (faixa de domínio). */
  line?: [number, number][];
}

/** Grafo do Earth Engine: NDVI/EVI/SAVI + estatística zonal no buffer do ponto. */
export function indicesExpression(o: GraphOpts) {
  const startMs = Date.parse(`${o.start}T00:00:00Z`);
  const endMs = Date.parse(`${o.end}T23:59:59Z`);
  const band = (name: string) => f("Image.divide", {
    image1: f("Image.select", { input: ref("masked"), bandSelectors: c([name]) }),
    image2: img(10000),
  });

  const values: Record<string, unknown> = {
    point: o.line && o.line.length >= 2
      ? f("GeometryConstructors.LineString", { coordinates: c(o.line) })
      : f("GeometryConstructors.Point", { coordinates: c([o.lng, o.lat]) }),
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

export const num = (v: unknown, digits = 4): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Number(v.toFixed(digits)) : null;

const RANGE: Record<string, [number, number]> = { ndvi: [-1, 1], evi: [-1, 2.5], savi: [-1.5, 1.5] };

export const statsFor = (out: Record<string, unknown>, key: string) => {
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


export interface ZonalStats { mean: number | null; median: number | null; min: number | null; max: number | null; stdDev: number | null; validPixels: number; }

export const loadServiceAccount = () => {
  const raw = Deno.env.get("GEE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GEE_SERVICE_ACCOUNT_JSON não configurado");
  return JSON.parse(raw) as Record<string, string>;
};

/** Executa o grafo no Earth Engine e devolve o dicionário de resultado. */
export async function computeIndices(sa: Record<string, string>, opts: GraphOpts) {
  const token = await getAccessToken(sa);
  const res = await fetch(
    `https://earthengine.googleapis.com/v1/projects/${sa.project_id}/value:compute`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expression: indicesExpression(opts) }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Earth Engine falhou [${res.status}]: ${text}`);
  return (JSON.parse(text)?.result ?? {}) as Record<string, unknown>;
}
