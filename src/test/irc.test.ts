import { describe, it, expect } from "vitest";
import { computeIRC, daysSince, ircLevelLabel } from "@/lib/irc";

describe("computeIRC", () => {
  it("retorna baixo para vegetação saudável e recém-roçada", () => {
    const today = new Date().toISOString().slice(0, 10);
    const r = computeIRC({ ndvi: 0.25, altura: 5, limite: 30, ultimaRocada: today, rainMm5d: 0 });
    expect(r.level).toBe("baixo");
    expect(r.score).toBeLessThan(35);
  });

  it("retorna critico em cenário de altura muito acima do limite e sem manutenção", () => {
    const r = computeIRC({
      ndvi: 0.8, altura: 180, limite: 30,
      ultimaRocada: "2026-01-01", rainMm5d: 80,
    });
    expect(r.level).toBe("critico");
    expect(r.score).toBeGreaterThanOrEqual(75);
  });

  it("clampa NDVI fora do intervalo esperado", () => {
    const a = computeIRC({ ndvi: -1, altura: 0, limite: 30, ultimaRocada: new Date().toISOString(), rainMm5d: 0 });
    const b = computeIRC({ ndvi: 0.2, altura: 0, limite: 30, ultimaRocada: new Date().toISOString(), rainMm5d: 0 });
    expect(a.score).toBe(b.score);
  });

  it("trata data invalida sem quebrar", () => {
    expect(daysSince("not-a-date")).toBe(0);
  });

  it("rotulos cobrem todos os niveis", () => {
    expect(ircLevelLabel.baixo).toBe("BAIXO");
    expect(ircLevelLabel.critico).toBe("CRÍTICO");
  });

  it("score limitado entre 0 e 100", () => {
    const r = computeIRC({ ndvi: 99, altura: 9999, limite: 30, ultimaRocada: "1990-01-01", rainMm5d: 9999 });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
