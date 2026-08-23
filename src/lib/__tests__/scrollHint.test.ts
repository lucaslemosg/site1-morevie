import { describe, it, expect } from "vitest";
import { scrollHintOpacity } from "../frameScrub";

describe("scrollHintOpacity", () => {
  it("está totalmente visível antes de qualquer rolagem", () => {
    // é a única instrução que diz ao visitante que a maquete reage ao scroll
    expect(scrollHintOpacity(0)).toBe(1);
  });

  it("já começou a sumir assim que a construção arranca", () => {
    expect(scrollHintOpacity(0.06)).toBeLessThan(1);
    expect(scrollHintOpacity(0.06)).toBeGreaterThan(0);
  });

  it("sai de cena bem antes do fim da pista", () => {
    // cumprida a função, o aviso não pode competir com o prédio pronto
    expect(scrollHintOpacity(0.16)).toBe(0);
    expect(scrollHintOpacity(0.5)).toBe(0);
    expect(scrollHintOpacity(1)).toBe(0);
  });

  it("nunca reaparece: decresce em todo o percurso", () => {
    let anterior = 1.0001;
    for (let p = 0; p <= 1.0001; p += 0.02) {
      const atual = scrollHintOpacity(p);
      expect(atual).toBeLessThanOrEqual(anterior + 1e-9);
      anterior = atual;
    }
  });

  it("trata progresso fora da faixa sem devolver valor inválido", () => {
    expect(scrollHintOpacity(-1)).toBe(1);
    expect(scrollHintOpacity(2)).toBe(0);
  });
});
