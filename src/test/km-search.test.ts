import { describe, it, expect } from "vitest";
import { parseKmQuery, matchesKmQuery, formatKmQuery } from "@/lib/km-search";

const seg = { kmStart: 3, kmEnd: 4, rodovia: "SP-021", text: "km 3 talude 3-000" };

describe("parseKmQuery", () => {
  it("interpreta 3+000 como ponto quilométrico", () => {
    const q = parseKmQuery("3+000");
    expect(q.kmPoint).toBe(3);
    expect(q.rule).toBe("km-point");
  });
  it("interpreta KM 12,5", () => {
    expect(parseKmQuery("KM 12,5").kmPoint).toBe(12.5);
  });
  it("extrai rodovia junto do km", () => {
    const q = parseKmQuery("SP-021 km 3+500");
    expect(q.highway).toBe("SP-021");
    expect(q.kmPoint).toBe(3.5);
    expect(q.rule).toBe("km-point-highway");
  });
  it("mantém texto livre", () => {
    const q = parseKmQuery("talude");
    expect(q.rule).toBe("text");
    expect(q.text).toBe("talude");
  });
});

describe("matchesKmQuery", () => {
  it("casa ponto dentro do intervalo, não por substring", () => {
    expect(matchesKmQuery(parseKmQuery("3+500"), seg)).toBe(true);
    expect(matchesKmQuery(parseKmQuery("30+000"), seg)).toBe(false);
    expect(matchesKmQuery(parseKmQuery("3"), { ...seg, kmStart: 30, kmEnd: 31 })).toBe(false);
  });
  it("respeita a rodovia", () => {
    expect(matchesKmQuery(parseKmQuery("BR-448 km 3"), seg)).toBe(false);
  });
  it("consulta vazia casa tudo", () => {
    expect(matchesKmQuery(parseKmQuery("  "), seg)).toBe(true);
  });
});

describe("formatKmQuery", () => {
  it("formata km decimal", () => {
    expect(formatKmQuery(3.5)).toBe("KM 3+500");
    expect(formatKmQuery(12)).toBe("KM 12+000");
  });
});
