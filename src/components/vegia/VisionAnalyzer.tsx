import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Loader2, AlertTriangle, Leaf, Car, ShieldAlert, Building2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Detection = {
  class: string;
  category: "vegetacao" | "estrutura" | "veiculo" | "risco";
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  note?: string;
};

type VisionResult = {
  scene: string;
  description: string;
  detections: Detection[];
  vegetation_summary: { estimated_height_cm: number; density: string; artesp_level: 1 | 2 | 3 };
  risk_level: "baixo" | "moderado" | "alto" | "critico";
  recommendation: string;
  counts: { total: number; vegetacao: number; estrutura: number; veiculo: number; risco: number };
  model: string;
};

const CATEGORY_COLOR: Record<Detection["category"], string> = {
  vegetacao: "hsl(var(--primary))",
  estrutura: "hsl(var(--secondary-on-container))",
  veiculo: "hsl(var(--tertiary))",
  risco: "hsl(var(--destructive))",
};

const RISK_BADGE: Record<VisionResult["risk_level"], string> = {
  baixo: "bg-primary/15 text-primary",
  moderado: "bg-tertiary/15 text-tertiary",
  alto: "bg-destructive/15 text-destructive",
  critico: "bg-destructive text-destructive-foreground",
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

export const VisionAnalyzer = ({ context }: { context?: string }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);

  const onPick = async (f: File) => {
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande", { description: "Limite de 8MB." });
      return;
    }
    const url = await fileToDataUrl(f);
    setImageUrl(url);
    setResult(null);
    await analyze(url);
  };

  const analyze = async (url: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vision-detect", {
        body: { imageUrl: url, context },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as VisionResult);
    } catch (e: any) {
      toast.error("Falha na análise visual", { description: e?.message ?? "Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-surface-lowest rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-wider uppercase">Detecção visual com IA</h3>
            <p className="text-[12px] text-muted-foreground">Pipeline equivalente a YOLOv8x · Gemini 2.5 Pro vision</p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {imageUrl ? "Trocar imagem" : "Enviar imagem"}
        </Button>
      </div>

      {!imageUrl && (
        <div className="border-2 border-dashed border-border/60 rounded-xl py-14 text-center text-muted-foreground text-[13px]">
          Envie uma foto aérea, de drone ou terrestre do trecho para detecção automática.
        </div>
      )}

      {imageUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
          <div>
            <div className="relative rounded-xl overflow-hidden bg-black/40 aspect-video">
              <img src={imageUrl} alt="Análise" className="w-full h-full object-contain" />
              {loading && (
                <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white text-[13px] gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Detectando objetos…
                </div>
              )}
              {result?.detections.map((d, i) => (
                <div
                  key={i}
                  className="absolute border-2 rounded-sm pointer-events-none"
                  style={{
                    left: `${d.bbox.x}%`,
                    top: `${d.bbox.y}%`,
                    width: `${d.bbox.w}%`,
                    height: `${d.bbox.h}%`,
                    borderColor: CATEGORY_COLOR[d.category],
                    boxShadow: `0 0 0 1px ${CATEGORY_COLOR[d.category]}33`,
                  }}
                >
                  <span
                    className="absolute -top-5 left-0 text-[10px] font-mono font-semibold text-white px-1.5 py-0.5 rounded-sm whitespace-nowrap"
                    style={{ background: CATEGORY_COLOR[d.category] }}
                  >
                    {d.class} {(d.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
            {result && (
              <p className="text-[12px] text-muted-foreground mt-3">
                {result.scene} · modelo {result.model} · {result.counts.total} objetos
              </p>
            )}
          </div>

          <div className="space-y-4">
            {result && (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="label-md">Risco operacional</span>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${RISK_BADGE[result.risk_level]}`}>
                        {result.risk_level}
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-foreground/85">{result.description}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-4 gap-2">
                  <Stat icon={<Leaf className="h-4 w-4" />} label="Veg." value={result.counts.vegetacao} color="text-primary" />
                  <Stat icon={<Building2 className="h-4 w-4" />} label="Estr." value={result.counts.estrutura} color="text-secondary-on-container" />
                  <Stat icon={<Car className="h-4 w-4" />} label="Veíc." value={result.counts.veiculo} color="text-tertiary" />
                  <Stat icon={<ShieldAlert className="h-4 w-4" />} label="Risco" value={result.counts.risco} color="text-destructive" />
                </div>

                <Card>
                  <CardContent className="p-4">
                    <span className="label-md">Vegetação · ARTESP nível {result.vegetation_summary.artesp_level}</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-[26px] font-bold tabular-nums">{result.vegetation_summary.estimated_height_cm}</span>
                      <span className="text-[12px] text-muted-foreground">cm · densidade {result.vegetation_summary.density}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="label-md text-primary">Recomendação</span>
                    </div>
                    <p className="text-[13.5px] leading-relaxed">{result.recommendation}</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

const Stat = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => (
  <div className="bg-surface-low rounded-lg p-3 text-center">
    <div className={`flex items-center justify-center gap-1 ${color}`}>{icon}<span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span></div>
    <div className={`text-[22px] font-bold tabular-nums ${color}`}>{value}</div>
  </div>
);