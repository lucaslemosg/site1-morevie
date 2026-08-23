import { describe, it, expect } from "vitest";
import { shouldNavBeSolid } from "../navSolid";

describe("shouldNavBeSolid", () => {
  it("fica transparente no topo da página", () => {
    expect(shouldNavBeSolid(0, 1350)).toBe(false);
  });

  it("continua transparente durante toda a hero pinada", () => {
    // a maquete ocupa a tela inteira nesse trecho; uma barra sólida a cobre
    expect(shouldNavBeSolid(60, 1350)).toBe(false);
    expect(shouldNavBeSolid(700, 1350)).toBe(false);
    expect(shouldNavBeSolid(1349, 1350)).toBe(false);
  });

  it("vira sólido quando a hero termina", () => {
    expect(shouldNavBeSolid(1350, 1350)).toBe(true);
    expect(shouldNavBeSolid(2000, 1350)).toBe(true);
  });

  it("cai no limiar simples quando não há hero medida", () => {
    // sem hero, o comportamento antigo (60px) é o correto
    expect(shouldNavBeSolid(10, null)).toBe(false);
    expect(shouldNavBeSolid(80, null)).toBe(true);
  });
});
