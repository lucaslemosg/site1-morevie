import { describe, it, expect } from "vitest";
import { containRect, scaleRect } from "../frameScrub";

describe("scaleRect", () => {
  const base = { x: 0, y: 45, width: 1440, height: 810 };

  it("reduz mantendo o mesmo centro", () => {
    const r = scaleRect(base, 0.8);
    expect(r.width).toBeCloseTo(1152);
    expect(r.height).toBeCloseTo(648);
    expect(r.x + r.width / 2).toBeCloseTo(base.x + base.width / 2);
    expect(r.y + r.height / 2).toBeCloseTo(base.y + base.height / 2);
  });

  it("devolve o mesmo retângulo com fator 1", () => {
    expect(scaleRect(base, 1)).toEqual(base);
  });

  it("amplia também, mantendo o centro", () => {
    const r = scaleRect(base, 1.25);
    expect(r.width).toBeCloseTo(1800);
    expect(r.x + r.width / 2).toBeCloseTo(base.x + base.width / 2);
  });

  it("preserva a proporção do retângulo", () => {
    const fit = containRect(1920, 1080, 1440, 900);
    const r = scaleRect(fit, 0.82);
    expect(r.width / r.height).toBeCloseTo(fit.width / fit.height);
  });
});
