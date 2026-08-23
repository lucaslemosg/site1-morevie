#!/usr/bin/env bash
# Turns the hero source video into the WebP frame sequence the scrub reads.
#
# The hero is not a <video>: Safari/iOS will not seek an MP4 smoothly enough to
# tie playback to the scrollbar, so we ship decoded frames and paint them to a
# canvas instead. This script is what produces them.
#
# Two encodings are produced from one pass:
#   public/hero-frames/       AVIF 1920px  — the detail the canvas actually needs
#   public/hero-frames-webp/  WebP 1440px  — fallback for Safari below 16.4
# AVIF carries 1920px for the bytes a 1440px WebP cost, which is the whole
# reason the hero looks sharp on a retina screen without costing bandwidth.
#
# Usage: scripts/build-hero-frames.sh <video.mp4> [trim_start_frames] [frame_count] [avif_width] [avif_crf]
#
# Requires: ffmpeg (with libsvtav1), cwebp  (brew install ffmpeg webp)

set -euo pipefail

SRC=${1:?informe o mp4 de origem}
TRIM_START=${2:-24}   # frames descartados no começo (trecho parado antes da ação)
TARGET=${3:-120}      # frames finais; casar com HERO_FRAME_COUNT em src/lib/scrollScrub.ts
WIDTH=${4:-1920}      # largura do AVIF
CRF=${5:-36}          # qualidade do AVIF; menor = melhor
FALLBACK_WIDTH=1440   # largura do WebP de fallback
FALLBACK_QUALITY=66

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
OUT="$REPO_ROOT/public/hero-frames"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

for bin in ffmpeg ffprobe cwebp; do
  command -v "$bin" >/dev/null || { echo "faltando: $bin" >&2; exit 1; }
done
ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libsvtav1 || {
  echo "ffmpeg sem libsvtav1 — AVIF não pode ser gerado" >&2; exit 1; }

# O contador tem de bater com HERO_FRAME_COUNT: se divergir, o loader pede um
# frame que não existe e o fallback de vizinho esconde a falha silenciosamente.
DECLARED=$(grep -oE "HERO_FRAME_COUNT = [0-9]+" "$REPO_ROOT/src/lib/scrollScrub.ts" | grep -oE "[0-9]+")
if [ -n "$DECLARED" ] && [ "$DECLARED" != "$TARGET" ]; then
  echo "TARGET=$TARGET diverge de HERO_FRAME_COUNT=$DECLARED em src/lib/scrollScrub.ts" >&2
  exit 1
fi
[ "$TARGET" -ge 2 ] || { echo "TARGET precisa ser >= 2" >&2; exit 1; }

echo "→ extraindo frames de $SRC"
mkdir -p "$WORK/png"
ffmpeg -v error -i "$SRC" -vf "scale=${WIDTH}:-2" -fps_mode passthrough "$WORK/png/p_%04d.png"

TOTAL=$(find "$WORK/png" -name 'p_*.png' | wc -l | tr -d ' ')
echo "→ $TOTAL frames na origem, descartando os $TRIM_START primeiros, amostrando $TARGET"

if [ "$TOTAL" -le "$((TRIM_START + 1))" ]; then
  echo "origem curta demais para o corte pedido" >&2
  exit 1
fi

mkdir -p "$WORK/sel"
python3 - "$WORK" "$TRIM_START" "$TOTAL" "$TARGET" <<'PY'
import shutil, sys
work, trim, total, target = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
first, last = trim + 1, total          # nomes de arquivo são 1-based
span = last - first
for i in range(target):
    src = first + round(i * span / (target - 1))
    shutil.copyfile(f"{work}/png/p_{src:04d}.png", f"{work}/sel/s_{i + 1:03d}.png")
PY

# Codifica num diretório temporário e só publica no fim: um cwebp/ffmpeg que
# falhe sob `set -e` não pode deixar public/hero-frames pela metade.
echo "→ codificando AVIF ${WIDTH}px crf$CRF"
mkdir -p "$WORK/avif" "$WORK/webp"
for f in "$WORK"/sel/*.png; do
  n=$(basename "${f%.png}" | sed 's/^s_//')
  ffmpeg -v error -y -i "$f" -c:v libsvtav1 -crf "$CRF" -frames:v 1 -f avif "$WORK/avif/f_${n}.avif"
done

echo "→ codificando WebP ${FALLBACK_WIDTH}px q$FALLBACK_QUALITY (fallback)"
for f in "$WORK"/sel/*.png; do
  n=$(basename "${f%.png}" | sed 's/^s_//')
  ffmpeg -v error -y -i "$f" -vf "scale=${FALLBACK_WIDTH}:-2" "$WORK/fb.png"
  cwebp -quiet -q "$FALLBACK_QUALITY" -m 6 "$WORK/fb.png" -o "$WORK/webp/f_${n}.webp"
done

rm -rf "$OUT" "$OUT_FALLBACK"
mv "$WORK/avif" "$OUT"
mv "$WORK/webp" "$OUT_FALLBACK"

echo "✓ AVIF: $(find "$OUT" -name '*.avif' | wc -l | tr -d ' ') frames ($(du -sh "$OUT" | cut -f1))"
echo "✓ WebP: $(find "$OUT_FALLBACK" -name '*.webp' | wc -l | tr -d ' ') frames ($(du -sh "$OUT_FALLBACK" | cut -f1))"
