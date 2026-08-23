import { describe, it, expect } from "vitest";
import { MOBILE_BREAKPOINT, shouldRenderModel } from "../frameScrub";

describe("shouldRenderModel", () => {
  it("não desenha a maquete em telas estreitas", () => {
    // no mobile a hero é só a marca e os botões: lado a lado não cabe,
    // e assim o celular também não baixa a sequência de frames
    expect(shouldRenderModel(390, false)).toBe(false);
    expect(shouldRenderModel(MOBILE_BREAKPOINT, false)).toBe(false);
  });

  it("desenha a partir da primeira largura acima do breakpoint", () => {
    expect(shouldRenderModel(MOBILE_BREAKPOINT + 1, false)).toBe(true);
    expect(shouldRenderModel(1440, false)).toBe(true);
  });

  it("não desenha quando o visitante pediu menos movimento", () => {
    expect(shouldRenderModel(1440, true)).toBe(false);
  });

  it("mantém as duas condições independentes", () => {
    expect(shouldRenderModel(390, true)).toBe(false);
  });
});
