import { Segment } from "@/data/mock";
import { ComplianceBadge } from "./ComplianceBadge";
import { useNavigate } from "react-router-dom";

export const AlertCard = ({ alert }: { alert: Segment }) => {
  const navigate = useNavigate();
  const ndviColor = alert.status === "critico" ? "text-destructive" : alert.status === "atencao" ? "text-tertiary" : "text-primary";
  const accent = alert.status === "critico" ? "bg-destructive" : alert.status === "atencao" ? "bg-tertiary" : "bg-primary";
  return (
    <button
      onClick={() => navigate(`/segmento/${alert.id}`)}
      className="w-full text-left relative bg-surface-low hover:bg-surface-high rounded-lg p-4 pl-5 transition-colors animate-fade-in"
    >
      <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r ${accent}`} />
      <div className="flex items-start justify-between mb-3">
        <div className="font-semibold text-[14px]">{alert.km}</div>
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
