import { useState } from "react";
import { Ruler } from "lucide-react";
import { useAddFieldMeasurement, useFieldHeightMeasurements } from "@/hooks/useVegiaData";
import { formatDateBR } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Registro de altura medida em campo (régua) para o trecho.
 * É a verdade de campo usada para calibrar o modelo e os pesos da métrica composta.
 */
export const FieldMeasurementForm = ({ segmentId }: { segmentId: string }) => {
  const { data: measurements = [] } = useFieldHeightMeasurements(segmentId);
  const add = useAddFieldMeasurement(segmentId);
  const [altura, setAltura] = useState("");
  const [data, setData] = useState(today());
  const [imagem, setImagem] = useState("");
  const [local, setLocal] = useState("");
  const [obs, setObs] = useState("");

  const valor = Number(altura);
  const valido = Number.isFinite(valor) && valor >= 0 && valor <= 500 && !!data;

  return (
    <section className="bg-surface-lowest rounded-xl p-4 md:p-5 border border-border/40 shadow-card">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider mb-1">
        <Ruler className="h-4 w-4 text-primary" /> Medição de altura em campo
      </h3>
      <p className="text-[11.5px] text-muted-foreground mb-4 leading-relaxed">
        Altura real medida por régua. Essas medições são a única base para calibrar o modelo e os pesos
        da métrica composta — sem elas o sistema não declara acurácia. Informe também a data da imagem de
        satélite usada como referência: é ela que permite identificar dados defasados.
      </p>

      <form
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[110px_140px_140px_140px_1fr_auto] gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valido) return;
          add.mutate(
            {
              alturaCm: valor,
              measuredAt: data,
              observacao: obs,
              satelliteImageDate: imagem || null,
              locationType: local || null,
            },
            { onSuccess: () => { setAltura(""); setObs(""); } }
          );
        }}
      >
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Altura (cm)</span>
          <input
            type="number" min={0} max={500} step={1} required inputMode="numeric"
            value={altura} onChange={(e) => setAltura(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg bg-surface-low border border-border/60 px-3 text-[13px] tabular-nums"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Data da medição</span>
          <input
            type="date" required max={today()}
            value={data} onChange={(e) => setData(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg bg-surface-low border border-border/60 px-3 text-[13px]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Data da imagem</span>
          <input
            type="date" max={today()}
            value={imagem} onChange={(e) => setImagem(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg bg-surface-low border border-border/60 px-3 text-[13px]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Tipo de local</span>
          <select
            value={local} onChange={(e) => setLocal(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg bg-surface-low border border-border/60 px-3 text-[13px]"
          >
            <option value="">—</option>
            <option value="roundabout">Canteiro / rotatória</option>
            <option value="rural">Sítio / rural</option>
            <option value="urbano">Urbano</option>
            <option value="rodovia">Faixa de domínio</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Observação (opcional)</span>
          <input
            type="text" maxLength={200} value={obs} onChange={(e) => setObs(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg bg-surface-low border border-border/60 px-3 text-[13px]"
          />
        </label>
        <button
          type="submit" disabled={!valido || add.isPending}
          className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold uppercase tracking-wider disabled:opacity-50"
        >
          {add.isPending ? "Salvando…" : "Registrar"}
        </button>
      </form>

      {measurements.length > 0 && (
        <ul className="mt-4 divide-y divide-border/40">
          {measurements.slice(0, 5).map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-[12px]">
              <span className="text-muted-foreground">
                {formatDateBR(m.measuredAt)} · {m.autor ?? "—"}
                {m.temporalDifferenceDays != null && m.temporalDifferenceDays > 3 && (
                  <span className="ml-2 text-tertiary">⚠ imagem {m.temporalDifferenceDays} dia(s) antes</span>
                )}
              </span>
              <span className="font-semibold tabular-nums">{m.alturaCm} cm</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
