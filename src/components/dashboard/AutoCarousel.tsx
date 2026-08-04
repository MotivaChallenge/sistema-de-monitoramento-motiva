import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Slides renderizados; apenas o ativo fica visível. */
  slides: React.ReactNode[];
  /** Intervalo de troca automática em ms. */
  interval?: number;
  className?: string;
  ariaLabel: string;
};

export const AutoCarousel = ({ slides, interval = 5000, className, ariaLabel }: Props) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback((next: number) => {
    if (!count) return;
    setIndex(((next % count) + count) % count);
  }, [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    const id = window.setInterval(() => setIndex(i => (i + 1) % count), interval);
    return () => window.clearInterval(id);
  }, [paused, count, interval]);

  useEffect(() => { if (index >= count) setIndex(0); }, [count, index]);

  if (!count) return null;

  return (
    <section
      aria-roledescription="carrossel"
      aria-label={ariaLabel}
      className={cn("relative overflow-hidden rounded-xl", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div key={index} className="animate-fade-in">{slides[index]}</div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Slide anterior"
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/70 backdrop-blur border border-border/60 flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background transition-smooth"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo slide"
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/70 backdrop-blur border border-border/60 flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background transition-smooth"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para o slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={cn(
                  "h-1.5 rounded-full transition-smooth",
                  i === index ? "w-5 bg-primary" : "w-1.5 bg-foreground/25 hover:bg-foreground/40"
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};