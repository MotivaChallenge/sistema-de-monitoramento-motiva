import { Segment } from "@/types/domain";
import { ComplianceBadge } from "./ComplianceBadge";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export const AlertCard = ({ alert }: { alert: Segment }) => {
  const navigate = useNavigate();
  const ndviColor = alert.status === "critico" ? "text-destructive" : alert.status === "atencao" ? "text-tertiary" : "text-primary";
  const accent = alert.status === "critico" ? "bg-destructive" : alert.status === "atencao" ? "bg-tertiary" : "bg-primary";
  return (
    <button
      onClick={() => navigate(`/segmento/${alert.id}`)}
      className="group w-full text-left relative bg-surface-low hover:bg-surface-lowest hover:shadow-elegant rounded-lg p-4 pl-5 transition-smooth animate-fade-in border border-transparent hover:border-border/60"
    >
      <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r ${accent}`} />
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-[14px]">
          {alert.km}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-smooth" aria-hidden="true" />
        </div>
        <ComplianceBadge status={alert.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="label-md">NDVI</div>
          <div className={`text-[18px] font-semibold ${ndviColor}`}>{alert.ndvi.toFixed(2)}</div>
        </div>
        <div>
          <div className="label-md">Altura est.</div>
          <div className="text-[18px] font-semibold">{(alert.altura/100).toFixed(1)}m</div>
        </div>
      </div>
      <div className="bg-surface-high rounded p-2.5">
        <p className="clause">ARTESP {alert.clausula}: {alert.clauseFull.split('—')[1]?.replace(/"/g,'').trim().slice(0, 110)}...</p>
      </div>
    </button>
  );
};
