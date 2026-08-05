import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  items: React.ReactNode[];
  ariaLabel: string;
  className?: string;
};

/** Carrossel responsivo de KPIs: 1 card no mobile, 2 no tablet, 4 no desktop. */
export const KpiCarousel = ({ items, ariaLabel, className }: Props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const total = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
    setPages(total);
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, items.length]);

  const goTo = (p: number) => {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.min(Math.max(p, 0), pages - 1);
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setPage(next);
  };

  return (
    <section aria-roledescription="carrossel" aria-label={ariaLabel} className={cn("relative", className)}>
      <div
        ref={trackRef}
        onScroll={e => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1"
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="snap-start shrink-0 [&>*]:h-full basis-[78%] sm:basis-[calc((100%-0.75rem)/2)] lg:basis-[calc((100%-2rem)/3)] xl:basis-[calc((100%-3rem)/4)]"
          >
            {item}
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-2">
          <div className="flex items-center gap-1.5 mr-auto">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para o grupo ${i + 1}`}
                aria-current={i === page}
                onClick={() => goTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-smooth",
                  i === page ? "w-5 bg-primary" : "w-1.5 bg-foreground/20 hover:bg-foreground/40"
                )}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Indicadores anteriores"
            onClick={() => goTo(page - 1)}
            disabled={page === 0}
            className="h-7 w-7 rounded-full border border-border/60 flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-surface-low disabled:opacity-40 transition-smooth"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Próximos indicadores"
            onClick={() => goTo(page + 1)}
            disabled={page >= pages - 1}
            className="h-7 w-7 rounded-full border border-border/60 flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-surface-low disabled:opacity-40 transition-smooth"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
};
