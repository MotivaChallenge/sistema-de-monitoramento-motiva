import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { computeIndices, loadServiceAccount, statsFor } from "../_shared/gee.ts";
import { estimateHeight, MODEL_ID, MODEL_VERSION } from "../_shared/height-model.ts";

/**
 * Atualização em lote dos trechos com dados reais do Sentinel-2 (Google Earth Engine).
 *
 * - Região por trecho: buffer de 30 m ao redor da linha formada pelos marcos de KM
 *   dentro do trecho (faixa de domínio), e não um círculo no ponto.
 * - Composição: mediana temporal dos últimos 60 dias, CLOUDY_PIXEL_PERCENTAGE < 60, máscara SCL.
 * - Altura: modelo compartilhado (_shared/height-model.ts) sobre a MEDIANA do NDVI;
 *   incerteza por trecho (resíduo do modelo + variabilidade espacial + saturação).
 * - Nunca sobrescreve um trecho sem leitura válida (< 20 pixels ou 0 cenas).
 * - Cada leitura é gravada em segment_satellite_readings (histórico) e o valor
 *   anterior fica registrado em audit_log.
 *
 * Disparo: usuário autenticado (botão) ou cron com x-cron-token (verify_cron_token).
 */

/** Extensão máxima (km) da linha amostrada por trecho. */
const MAX_LINE_KM = 5;
const BUFFER_M = 30;
const DAYS = 60;
const MIN_PIXELS = 20;
const BATCH = 5;
const PAUSE_MS = 400;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  let body: Record<string, unknown> = {};
  try { body = req.method === "POST" ? await req.json() : {}; } catch { body = {}; }

  // ---- autenticação: cron (token) ou usuário logado ----
  let startedBy: string | null = null;
  let trigger = "manual";
  const cronToken = req.headers.get("x-cron-token");
  if (cronToken) {
    const { data: ok } = await admin.rpc("verify_cron_token", { _token: cronToken });
    if (!ok) return json({ error: "Token de agendamento inválido" }, 401);
    trigger = "cron";
  } else {
    const auth = await requireUser(req);
    if (auth.response) return auth.response;
    startedBy = auth.userId ?? null;
  }

  const rodovia = typeof body.rodovia === "string" && /^[A-Z]{2}-\d{3}[A-Z-]*$/.test(body.rodovia) ? body.rodovia : "SP-021";
  if (rodovia !== "SP-021") return json({ error: "Somente o Rodoanel SP-021 possui atualização orbital habilitada." }, 400);
  const dryRun = body.dryRun === true;
  const onlyIds = Array.isArray(body.segmentIds) ? (body.segmentIds as unknown[]).filter(x => typeof x === "string").slice(0, 60) as string[] : null;

  // ---- trava contra rodadas simultâneas ----
  const { data: running } = await admin
    .from("satellite_refresh_runs")
    .select("id, started_at")
    .eq("rodovia", rodovia)
    .eq("status", "running")
    .gte("started_at", new Date(Date.now() - 20 * 60_000).toISOString())
    .limit(1);
  if (running && running.length) return json({ error: "Já existe uma atualização em andamento. Aguarde alguns minutos." }, 409);

  const { data: run, error: runErr } = await admin
    .from("satellite_refresh_runs")
    .insert({ rodovia, trigger, started_by: startedBy })
    .select("id")
    .single();
  if (runErr || !run) return json({ error: runErr?.message ?? "Falha ao registrar rodada" }, 500);

  const details: Record<string, unknown>[] = [];
  let updated = 0, skipped = 0, failed = 0;

  try {
    const sa = loadServiceAccount();
    const end = new Date();
    const start = new Date(end.getTime() - DAYS * 86_400_000);
    const periodStart = iso(start), periodEnd = iso(end);

    let q = admin.from("segments").select("id, km, km_start, km_end, ndvi, altura, limite, street, ndvi_source").eq("rodovia", rodovia);
    if (onlyIds?.length) q = q.in("id", onlyIds);
    const { data: segs, error: segErr } = await q.order("km_start");
    if (segErr) throw segErr;
    const { data: markers } = await admin.from("km_markers").select("km_value, lat, lng").eq("rodovia", rodovia).order("km_value");

    const total = segs?.length ?? 0;
    await admin.from("satellite_refresh_runs").update({ total }).eq("id", run.id);

    for (let b = 0; b < (segs ?? []).length; b += BATCH) {
      const batch = (segs ?? []).slice(b, b + BATCH);
      await Promise.all(batch.map(async (s) => {
        try {
          const street = (s.street ?? {}) as { lat?: number; lng?: number };
          const ks = Number(s.km_start), ke = Number(s.km_end);
          // Marcos dentro do trecho, na ordem quilométrica (nunca por longitude:
          // a rodovia muda de sentido e a ordenação geográfica cria linhas cruzadas).
          let insideMarkers = (markers ?? [])
            .filter(m => Number(m.km_value) >= ks && Number(m.km_value) <= ke)
            .sort((a, b) => Number(a.km_value) - Number(b.km_value));
          // Trechos muito longos geram amostras enormes e pouco representativas:
          // limitamos a leitura a MAX_LINE_KM centrados no meio do trecho.
          if (ke - ks > MAX_LINE_KM) {
            const mid = (ks + ke) / 2;
            const lo = mid - MAX_LINE_KM / 2, hi = mid + MAX_LINE_KM / 2;
            const clipped = insideMarkers.filter(m => Number(m.km_value) >= lo && Number(m.km_value) <= hi);
            if (clipped.length >= 2) insideMarkers = clipped;
          }
          const inside = insideMarkers.map(m => [Number(m.lng), Number(m.lat)] as [number, number]);
          const pt: [number, number] | null =
            Number.isFinite(Number(street.lng)) && Number.isFinite(Number(street.lat)) ? [Number(street.lng), Number(street.lat)] : null;
          let line = inside;
          if (line.length < 2 && pt) line = [...inside, pt];
          if (line.length < 2 && !pt) { skipped++; details.push({ id: s.id, result: "sem_geometria" }); return; }

          const out = await computeIndices(sa, {
            lat: pt?.[1] ?? line[0][1], lng: pt?.[0] ?? line[0][0],
            start: periodStart, end: periodEnd,
            radius: BUFFER_M, scale: 10, resample: null, L: 0.5,
            line: line.length >= 2 ? line : undefined,
          });
          const ndvi = statsFor(out, "ndvi");
          const evi = statsFor(out, "evi");
          const savi = statsFor(out, "savi");
          const images = typeof out.images === "number" ? Math.round(out.images) : 0;

          const valid = images > 0 && ndvi.median !== null && ndvi.validPixels >= MIN_PIXELS;
          const h = estimateHeight({ ndviMedian: ndvi.median, eviMedian: evi.median, saviMedian: savi.median, ndviStd: ndvi.stdDev, validPixels: ndvi.validPixels, images });

          if (!dryRun) {
            await admin.from("segment_satellite_readings").insert({
              segment_id: s.id, period_start: periodStart, period_end: periodEnd, images,
              valid_pixels: ndvi.validPixels,
              ndvi_median: ndvi.median, ndvi_mean: ndvi.mean, ndvi_std: ndvi.stdDev, ndvi_min: ndvi.min, ndvi_max: ndvi.max,
              evi_median: evi.median, savi_median: savi.median,
              buffer_m: BUFFER_M, model_id: MODEL_ID, model_version: MODEL_VERSION,
              altura_cm: valid ? h.cm : null, uncertainty_cm: valid ? h.uncertaintyCm : null,
              saturated: h.saturated, origin: valid ? "sentinel2" : "sem_leitura_valida",
            });
          }

          if (!valid) {
            skipped++;
            details.push({ id: s.id, result: "sem_leitura_valida", images, validPixels: ndvi.validPixels });
            return;
          }

          if (!dryRun) {
            // Guarda o valor anterior da carga inicial no histórico (uma única vez).
            if (s.ndvi_source === "seed") {
              await admin.from("segment_satellite_readings").insert({
                segment_id: s.id, read_at: new Date(Date.now() - 1000).toISOString(), images: 0, valid_pixels: 0,
                ndvi_median: s.ndvi, altura_cm: s.altura, origin: "carga_inicial", source: "Carga inicial (demonstrativo)",
                model_id: MODEL_ID, model_version: "seed", buffer_m: 0,
              });
            }
            const { error: upErr } = await admin.from("segments").update({
              ndvi: ndvi.median, altura: h.cm, ndvi_source: "sentinel2",
              last_satellite_read_at: new Date().toISOString(),
              uncertainty_cm: h.uncertaintyCm, satellite_images: images, satellite_valid_pixels: ndvi.validPixels,
            }).eq("id", s.id);
            if (upErr) throw upErr;
            await admin.from("audit_log").insert({
              user_id: startedBy, action: "satellite_refresh", entity: "segments", entity_id: s.id,
              before_value: { ndvi: s.ndvi, altura: s.altura, source: s.ndvi_source },
              after_value: { ndvi: ndvi.median, altura: h.cm, uncertainty_cm: h.uncertaintyCm, images, valid_pixels: ndvi.validPixels, source: "sentinel2" },
              origin: trigger === "cron" ? "cron semanal" : "atualização manual",
            });
          }
          updated++;
          details.push({ id: s.id, km: s.km, result: "atualizado", ndvi: ndvi.median, altura: h.cm, uncertainty: h.uncertaintyCm, images, validPixels: ndvi.validPixels, saturated: h.saturated, before: { ndvi: s.ndvi, altura: s.altura } });
        } catch (e) {
          failed++;
          details.push({ id: s.id, result: "erro", error: String((e as Error).message ?? e).slice(0, 300) });
        }
      }));
      await admin.from("satellite_refresh_runs").update({ updated, skipped, failed }).eq("id", run.id);
      if (b + BATCH < (segs ?? []).length) await sleep(PAUSE_MS);
    }

    await admin.from("satellite_refresh_runs").update({
      status: "done", finished_at: new Date().toISOString(), updated, skipped, failed, details: { items: details, dryRun, periodStart, periodEnd },
    }).eq("id", run.id);

    return json({ runId: run.id, rodovia, dryRun, periodo: { de: periodStart, ate: periodEnd }, total, updated, skipped, failed, items: details });
  } catch (e) {
    console.error("gee-refresh-segments error:", e);
    await admin.from("satellite_refresh_runs").update({
      status: "error", finished_at: new Date().toISOString(), updated, skipped, failed, details: { error: String((e as Error).message ?? e), items: details },
    }).eq("id", run.id);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
