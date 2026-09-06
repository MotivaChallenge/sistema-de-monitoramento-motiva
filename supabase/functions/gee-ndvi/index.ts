import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { getAccessToken, indicesExpression, num, statsFor } from "../_shared/gee.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req);
  if (auth.response) return auth.response;

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
