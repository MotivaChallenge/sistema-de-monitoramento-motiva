import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export interface MonthYearValue {
  month: number; // 0-11
  year: number;
}

interface Props {
  value: MonthYearValue;
  onChange: (v: MonthYearValue) => void;
}

export const formatMonthYear = (v: MonthYearValue) => `${MONTHS_FULL[v.month]} ${v.year}`;

export const MonthYearPicker = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value.year);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-11 px-4 rounded-lg bg-surface-high text-[13px] font-medium inline-flex items-center gap-2 hover:bg-surface-high/80">
          <Calendar className="h-4 w-4" /> {MONTHS_FULL[value.month]} {value.year}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[280px] p-4 bg-surface-lowest border-border">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setViewYear(y => y - 1)}
            className="h-8 w-8 rounded hover:bg-surface-high flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[14px] font-semibold tabular-nums">{viewYear}</span>
          <button
            onClick={() => setViewYear(y => y + 1)}
            className="h-8 w-8 rounded hover:bg-surface-high flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((m, i) => {
            const selected = value.month === i && value.year === viewYear;
            return (
              <button
                key={m}
                onClick={() => {
                  onChange({ month: i, year: viewYear });
                  setOpen(false);
                }}
                className={`h-10 rounded-md text-[13px] font-medium transition ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-low hover:bg-surface-high text-foreground"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => {
            const now = new Date();
            onChange({ month: now.getMonth(), year: now.getFullYear() });
            setViewYear(now.getFullYear());
            setOpen(false);
          }}
          className="w-full mt-3 text-[12px] text-primary font-semibold hover:underline"
        >
          Mês atual
        </button>
      </PopoverContent>
    </Popover>
  );
};