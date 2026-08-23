#!/usr/bin/env python3
"""
Recorta o fundo dos frames da hero, deixando a maquete sobre transparência.

PORQUÊ: antes o fundo era achatado numa cor sólida e o canvas preenchia o resto
com a mesma cor. Isso amarrava a hero a um fundo escuro — sobre uma superfície
clara, a sombra suave em volta da base virava um halo preto em torno do prédio.

Com alfa, a sombra vira translucidez e assenta em qualquer fundo. Some também a
emenda: não há mais preenchimento a casar com a imagem, o fundo da página
aparece por baixo.

A rampa entre DENTRO e FORA é o que preserva a sombra: um corte seco deixaria
a base recortada com serrilha.

Uso: scripts/keyout-bg.py <dir-png> <dir-saida> [dentro] [fora]
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops

src = Path(sys.argv[1])
out = Path(sys.argv[2])
dentro = int(sys.argv[3]) if len(sys.argv) > 3 else 4    # <= isto é fundo puro
fora = int(sys.argv[4]) if len(sys.argv) > 4 else 26     # >= isto é objeto sólido
out.mkdir(parents=True, exist_ok=True)

arquivos = sorted(src.glob("*.png"))
if not arquivos:
    sys.exit(f"nenhum png em {src}")

for f in arquivos:
    im = Image.open(f).convert("RGB")
    w, h = im.size
    # Canto superior direito: fundo puro em todos os frames desta composição.
    fundo = im.crop((int(w * 0.88), int(h * 0.04), int(w * 0.98), int(h * 0.14))) \
              .resize((1, 1), Image.LANCZOS).getpixel((0, 0))

    dif = ImageChops.difference(im, Image.new("RGB", im.size, fundo))
    r, g, b = dif.split()
    dmax = ImageChops.lighter(ImageChops.lighter(r, g), b)
    alpha = dmax.point(
        lambda v: 0 if v <= dentro else (255 if v >= fora else round(255 * (v - dentro) / (fora - dentro)))
    )
    rgba = im.copy()
    rgba.putalpha(alpha)
    rgba.save(out / f.name)

print(f"{len(arquivos)} frames recortados (rampa {dentro}–{fora})")
