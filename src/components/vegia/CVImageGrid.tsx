import { useCvResults } from "@/hooks/useVegiaData";

const colorOf = (s: string) =>
  s === "critico" ? "border-destructive bg-destructive text-destructive-foreground"
  : s === "atencao" ? "border-tertiary bg-tertiary text-white"
  : "border-[hsl(var(--on-secondary-container))] bg-secondary-container text-secondary-on-container";

const boxBorder = (s: string) =>
  s === "critico" ? "border-destructive" : s === "atencao" ? "border-tertiary" : "border-[hsl(var(--on-secondary-container))]";

const gradients = [
  "linear-gradient(135deg, #6FB585 0%, #2C5F3F 100%)",
  "linear-gradient(135deg, #4F7942 0%, #1A3A1F 100%)",
  "linear-gradient(135deg, #C9A66B 0%, #6E5028 100%)",
  "linear-gradient(135deg, #E8B57A 0%, #8B5A3C 100%)",
  "linear-gradient(135deg, #4A6B5C 0%, #1F3A2C 100%)",
  "linear-gradient(135deg, #5C8C6F 0%, #2D5A45 100%)",
];

export const CVImageGrid = () => {
  const { data: cvImages = [], isLoading } = useCvResults();
  if (isLoading) return <div className="text-[13px] text-muted-foreground">Carregando análises…</div>;
  return (
    <div className="grid grid-cols-3 gap-5">
      {cvImages.map((img, i) => (
        <div key={img.id} className="bg-surface-lowest rounded-xl overflow-hidden">
          <div className="relative aspect-[4/3]" style={{ background: gradients[i % gradients.length] }}>
            <span className="absolute bottom-3 left-3 bg-black/55 text-white text-[11px] tracking-wider px-2 py-1 rounded font-mono">
              {img.km}
            </span>
            {img.box && (
              <div
                className={`absolute border-2 rounded-sm ${boxBorder(img.status)}`}
                style={{ left: `${img.box.x}%`, top: `${img.box.y}%`, width: `${img.box.w}%`, height: `${img.box.h}%` }}
              >
                <span className={`absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-mono font-semibold whitespace-nowrap ${colorOf(img.status)}`}>
                  {img.label}_{img.confidence.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="label-md">Detecção de ativos</span>
              <span className={`text-[13px] font-semibold ${img.status === "critico" ? "text-destructive" : img.status === "atencao" ? "text-tertiary" : "text-primary"}`}>
                {img.confidence.toFixed(1)}% Conf.
              </span>
            </div>
            <p className="text-[13px] text-foreground/80 leading-snug truncate">{img.caption}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
