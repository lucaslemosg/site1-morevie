# Fontes da hero

`hero-source.mp4` é o take que alimenta o scrub da hero. Ele **não** é servido
ao navegador — a hero pinta frames WebP num canvas, porque Safari/iOS não faz
seek em MP4 com suavidade suficiente para amarrar a reprodução à barra de
rolagem. O vídeo mora aqui para que `public/hero-frames/` possa ser regerado.

## Regerar os frames

Precisa de `ffmpeg` e `cwebp` (`brew install ffmpeg webp`):

    ffmpeg -i assets/hero-source.mp4 -fps_mode passthrough /tmp/f/p_%04d.png
    scripts/keyout-bg.py /tmp/f /tmp/keyed 10 40
    for f in /tmp/keyed/*.png; do
      cwebp -q 72 -alpha_q 88 -m 6 "$f" -o "public/hero-frames/$(basename ${f%.png}).webp"
    done

O vídeo tem 121 frames e a hero consome 120 (`HERO_FRAME_COUNT` em
`src/lib/frameScrub.ts`) — descartar um é suficiente.

## Por que o fundo do vídeo é ciano

Os frames chegam ao navegador **com canal alfa**, e o canvas só desenha a
maquete: o fundo da hero é um degradê de CSS que aparece por baixo. Cor sólida
não serviria, porque só casaria com um fundo sólido.

Para o recorte sair limpo, o fundo do vídeo precisa ser uma cor que não exista
em nenhum material do modelo. Branco não serve — o prédio tem superfícies
brancas e seriam recortadas junto. O ciano saturado resolve, e como fica na
família da água, qualquer resíduo de borda desaparece sobre a hero.

Um take anterior foi gerado sobre fundo escuro e não deu certo: cada pixel
semitransparente de borda carrega a cor do fundo original, então a maquete
ficava com franja preta ao ser composta sobre a hero clara — e aumentar o
limiar do recorte para matar a franja começava a comer partes do prédio.

## Origem

Higgsfield, modelo Seedance 2.5, job `a8d0af4a-07be-4af6-a536-8f1f29f860a7`
(5s, 1080p, 16:9, sem áudio, modo `omni_reference`).

O prompt está em `hero-source-prompt.txt` e `hero-start-frame.png` é o primeiro
frame, passado como `start_image` — é o que garante que o filme comece com o
terreno vazio. Pedir isso só no prompt falhou nas duas primeiras tentativas: o
modelo sempre abria com algo já construído.
