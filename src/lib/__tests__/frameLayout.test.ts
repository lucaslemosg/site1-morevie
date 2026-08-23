import { describe, it, expect } from "vitest";
import { containRect, shiftRect } from "../frameScrub";

describe("shiftRect", () => {
  const base = { x: 0, y: 100, width: 1000, height: 560 };

  it("desloca no eixo x pela fração pedida da largura do destino", () => {
    expect(shiftRect(base, 1000, 0.44).x).toBeCloseTo(440);
  });

  it("não mexe no eixo y nem no tamanho", () => {
    const r = shiftRect(base, 1000, 0.44);
    expect(r.y).toBe(base.y);
    expect(r.width).toBe(base.width);
    expect(r.height).toBe(base.height);
  });

  it("devolve o mesmo retângulo quando o deslocamento é zero", () => {
    expect(shiftRect(base, 1000, 0)).toEqual(base);
  });

  it("aceita deslocamento negativo, para compor do outro lado", () => {
    expect(shiftRect(base, 1000, -0.2).x).toBeCloseTo(-200);
  });

  it("compõe com containRect sem alterar a escala do encaixe", () => {
    const fit = containRect(1920, 1080, 1440, 900);
    const moved = shiftRect(fit, 1440, 0.44);
    expect(moved.width).toBeCloseTo(fit.width);
    expect(moved.height).toBeCloseTo(fit.height);
  });
});
