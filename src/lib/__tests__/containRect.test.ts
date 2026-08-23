import { describe, it, expect } from "vitest";
import { containRect } from "../frameScrub";

describe("containRect", () => {
  it("encaixa pela largura quando o destino é mais alto que a fonte", () => {
    // fonte 16:9 num destino 1600x1200 → limita pela largura, sobra em cima e embaixo
    const r = containRect(1920, 1080, 1600, 1200);
    expect(r.width).toBeCloseTo(1600);
    expect(r.height).toBeCloseTo(900);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(150);
  });

  it("encaixa pela altura quando o destino é mais largo que a fonte", () => {
    const r = containRect(1920, 1080, 3000, 1080);
    expect(r.height).toBeCloseTo(1080);
    expect(r.width).toBeCloseTo(1920);
    expect(r.y).toBeCloseTo(0);
    expect(r.x).toBeCloseTo(540);
  });

  it("preenche exatamente quando a proporção bate", () => {
    expect(containRect(1920, 1080, 960, 540)).toEqual({ x: 0, y: 0, width: 960, height: 540 });
  });

  it("nunca corta: a imagem cabe inteira nos dois eixos", () => {
    for (const [dw, dh] of [[400, 900], [1200, 300], [800, 800]]) {
      const r = containRect(1920, 1080, dw, dh);
      expect(r.width).toBeLessThanOrEqual(dw + 1e-9);
      expect(r.height).toBeLessThanOrEqual(dh + 1e-9);
    }
  });
});
