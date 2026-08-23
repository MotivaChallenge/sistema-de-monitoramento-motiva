import { describe, it, expect } from "vitest";
import { diffForAudit } from "@/lib/audit";

describe("diffForAudit", () => {
  it("returns null when objects are identical", () => {
    const before = { a: 1, b: "x" };
    const after = { a: 1, b: "x" };
    expect(diffForAudit(before, after)).toBeNull();
  });

  it("captures changed fields only", () => {
    const before = { a: 1, b: "x", c: true };
    const after = { a: 2, b: "x", c: true };
    expect(diffForAudit(before, after)).toEqual({ a: { from: 1, to: 2 } });
  });

  it("captures added fields", () => {
    const before = { a: 1 };
    const after = { a: 1, b: "new" };
    expect(diffForAudit(before, after)).toEqual({ b: { from: undefined, to: "new" } });
  });

  it("captures removed fields", () => {
    const before = { a: 1, b: "old" };
    const after = { a: 1 };
    expect(diffForAudit(before, after)).toEqual({ b: { from: "old", to: undefined } });
  });

  it("handles nested objects by string comparison", () => {
    const before = { nested: { x: 1 } };
    const after = { nested: { x: 2 } };
    expect(diffForAudit(before, after)).toEqual({
      nested: { from: { x: 1 }, to: { x: 2 } },
    });
  });
});
