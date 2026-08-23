import { describe, it, expect } from "vitest";
import { HERO_FRAME_COUNT, frameIndexFromProgress, framePath } from "../frameScrub";

describe("frameIndexFromProgress", () => {
  it("mapeia o começo da pista no primeiro frame", () => {
    expect(frameIndexFromProgress(0, HERO_FRAME_COUNT)).toBe(0);
  });

  it("mapeia o fim no último frame, sem estourar o array", () => {
    expect(frameIndexFromProgress(1, HERO_FRAME_COUNT)).toBe(HERO_FRAME_COUNT - 1);
  });

  it("mapeia a metade no frame do meio", () => {
    expect(frameIndexFromProgress(0.5, 121)).toBe(60);
  });

  it("limita o índice quando o progresso passa dos limites", () => {
    expect(frameIndexFromProgress(-0.4, 120)).toBe(0);
    expect(frameIndexFromProgress(2.5, 120)).toBe(119);
  });

  it("retorna 0 quando não há frames", () => {
    expect(frameIndexFromProgress(0.5, 0)).toBe(0);
  });
});

describe("framePath", () => {
  it("converte índice 0-based no arquivo 1-based com zero à esquerda", () => {
    expect(framePath(0)).toBe("/hero-frames/f_001.webp");
    expect(framePath(9)).toBe("/hero-frames/f_010.webp");
    expect(framePath(119)).toBe("/hero-frames/f_120.webp");
  });
});
