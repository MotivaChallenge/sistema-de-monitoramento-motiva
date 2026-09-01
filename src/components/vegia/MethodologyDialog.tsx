import { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { METHODOLOGY_SECTIONS } from "@/lib/methodology";

/** Botão + diálogo com a metodologia completa e as limitações declaradas. */
export const MethodologyDialog = ({ trigger }: { trigger?: ReactNode }) => (
  <Dialog>
    <DialogTrigger asChild>
      {trigger ?? (
        <button className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
          <BookOpen className="h-3.5 w-3.5" /> Ver metodologia completa
        </button>
      )}
    </DialogTrigger>
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Metodologia e limitações</DialogTitle>
        <DialogDescription>
          Como o dado é capturado, processado e transformado em decisão operacional.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        {METHODOLOGY_SECTIONS.map(s => (
          <section key={s.title}>
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {s.title}
            </h3>
            <ul className="space-y-1.5">
              {s.items.map((item, i) => (
                <li key={i} className="text-[13px] leading-relaxed text-foreground/90 pl-3 border-l-2 border-border">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);
