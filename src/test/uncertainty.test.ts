import { describe, it, expect } from "vitest";
import { evaluateDecision, MODEL_UNCERTAINTY_CM } from "@/lib/uncertainty";

describe("zona de decisão", () => {
  it("classifica claramente abaixo do limite", () => {
    const d = evaluateDecision({ altura: 10, limite: 30 });
    expect(d.zone).toBe("baixo");
    expect(d.needsFieldValidation).toBe(false);
  });
  it("27 ± 13 cm com limite 30 cai na zona de validação", () => {
    const d = evaluateDecision({ altura: 27, limite: 30 });
    expect(d.zone).toBe("validar");
    expect(d.summary).toContain(`27 cm ± ${MODEL_UNCERTAINTY_CM} cm`);
    expect(d.needsFieldValidation).toBe(true);
  });
  it("claramente acima do limite exige intervenção", () => {
    expect(evaluateDecision({ altura: 60, limite: 30 }).zone).toBe("alto");
  });
  it("respeita limite específico da cláusula (60 cm)", () => {
    expect(evaluateDecision({ altura: 29, limite: 60 }).zone).toBe("baixo");
  });
  it("sem incerteza calibrada declara isso explicitamente", () => {
    const d = evaluateDecision({ altura: 25, limite: 30, uncertaintyCm: null });
    expect(d.zone).toBe("nao_calibrado");
    expect(d.recommendation).toMatch(/não calibrada/);
  });
  it("medição de campo não recebe faixa de incerteza", () => {
    expect(evaluateDecision({ altura: 25, limite: 30, measured: true }).uncertaintyCm).toBe(0);
  });
});
