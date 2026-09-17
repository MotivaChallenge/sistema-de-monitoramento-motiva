import { Sparkles } from "lucide-react";

export const AIInsightBubble = ({ children, version = "v2.4" }: { children: React.ReactNode; version?: string }) => (
  <div className="bg-secondary-container/40 rounded-lg border border-primary/10 p-5 flex gap-4">
    <div className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
      <Sparkles className="h-5 w-5" />
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="label-md text-primary">IA — INSIGHT GERADO</span>
        <span className="text-[11px] text-muted-foreground">• Análise Preditiva {version}</span>
      </div>
      <p className="text-[14px] leading-relaxed text-foreground/85">{children}</p>
    </div>
  </div>
);
