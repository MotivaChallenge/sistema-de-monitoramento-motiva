import { Cloud, CloudRain, Droplets, Sprout, Thermometer } from "lucide-react";
import { useWeather } from "@/hooks/useWeather";

const dayLabel = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
};

export const WeatherForecast = () => {
  const { data, isLoading, error } = useWeather();

  const levelColor =
    data?.summary.growthLevel === "alto"
      ? "text-destructive"
      : data?.summary.growthLevel === "moderado"
      ? "text-tertiary"
      : "text-primary";

  return (
    <section className="bg-surface-lowest rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-semibold tracking-wide uppercase flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" /> Clima no Rodoanel & Crescimento Estimado
        </h3>
        {data && (
          <span className={`text-[12px] font-semibold uppercase tracking-wider ${levelColor}`}>
            Crescimento {data.summary.growthLevel}
          </span>
        )}
      </div>

      {isLoading && <div className="text-[12px] text-muted-foreground">Carregando previsão…</div>}
      {error && (
        <div className="text-[12px] text-destructive">Erro ao carregar previsão do tempo.</div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-5 gap-3 mb-5">
            {data.forecast.map((d) => (
              <div key={d.date} className="bg-surface-low rounded-lg p-3 text-center">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{dayLabel(d.date)}</div>
                <img
                  src={`https://openweathermap.org/img/wn/${d.icon}@2x.png`}
                  alt={d.description}
                  className="h-12 w-12 mx-auto"
                />
                <div className="text-[14px] font-semibold">{d.tempAvg}°C</div>
                <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mt-1">
                  <CloudRain className="h-3 w-3" /> {d.rainMm}mm
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] text-primary mt-1 font-medium">
                  <Sprout className="h-3 w-3" /> {d.growthCmPerDay}cm/d
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-primary" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Chuva 5d</div>
                <div className="text-[13px] font-semibold">{data.summary.totalRainMm} mm</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sprout className="h-4 w-4 text-primary" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Crescimento estimado</div>
                <div className="text-[13px] font-semibold">+{data.summary.estimatedGrowthCm} cm</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-tertiary" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Local</div>
                <div className="text-[13px] font-semibold truncate">{data.location}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};