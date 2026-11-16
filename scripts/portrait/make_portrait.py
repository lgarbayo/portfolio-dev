"""
Retrato del hero: de la foto a arte ASCII a color.

El hero (`src/lib/hero-portrait.ts`) no carga la foto: carga una imagen
diminuta en la que cada píxel es un carácter. El píxel lleva el color con el
que se pinta ese carácter, ya preparado para leerse sobre negro:

    RGB  color de la foto en esa celda, con el brillo levantado —la camiseta es
         negra y sin esto desaparecería— y algo más de saturación
    negro puro (0, 0, 0) = fondo: ahí no se pinta nada

Los caracteres van aparte, en `portrait-ascii.json`: la rampa por brillo y, en
los bordes, uno que sigue su dirección. Alrededor de la persona se pinta el
escenario muy apagado, que es lo que pone el color. El alfa va siempre a 255: el canvas premultiplica, y un alfa 0 llegaría a
`getImageData` con el RGB a cero.

Además saca `hero-portrait.webp`: el mismo retrato ya dibujado con letras, que
es lo que se ve sin JS.

La foto original va en `assets-src/portrait/luis-source.jpg`, que no se versiona
(como todo `assets-src/`). La máscara de la persona se cachea al lado, para que
retocar el color no pida GPU ni modelos:

    python scripts/portrait/make_portrait.py            # usa la caché si existe
    python scripts/portrait/make_portrait.py --refresh  # vuelve a pasar el modelo

Modelo: DeepLabV3-ResNet101 de torchvision (BSD-3) para la máscara.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets-src/portrait/luis-source.jpg"
CACHE_MASK = ROOT / "assets-src/portrait/mask.png"
OUT_DATA = ROOT / "public/assets/ui/portrait-ascii.png"
OUT_STATIC = ROOT / "public/assets/ui/hero-portrait.webp"
OUT_META = ROOT / "public/assets/ui/portrait-ascii.json"

# Encuadre sobre la foto original (2000x1333): cabeza, hombros y la mano. Se
# deja aire arriba para que el pelo no toque el borde.
CROP = (500, 90, 1540, 1333)
# Columnas de texto. Con ~110 la cara se reconoce y cada letra sigue siendo una
# letra en un portátil; en el móvil el navegador lee una de cada dos.
COLS = 110
# Ancho entre alto de una celda de monoespaciada. Tiene que coincidir con
# `CELL_ASPECT` de `hero-portrait.ts`.
CELL_ASPECT = 0.55
# De menos a más tinta. La persona nunca baja de «.»: dentro de la máscara no
# hay huecos. El escenario va con la suya, más ligera.
RAMP = ".,:;i1tfLCG08@"
# Opacidad del fondo de cada celda. Tiene que coincidir con `CELL_FILL` de
# `hero-portrait.ts`.
CELL_FILL = 0.3
STAGE_RAMP = ".,:;+"


def run_model(img: Image.Image) -> Image.Image:
    import torch
    from torchvision.models.segmentation import (
        DeepLabV3_ResNet101_Weights,
        deeplabv3_resnet101,
    )

    device = "cuda" if torch.cuda.is_available() else "cpu"
    weights = DeepLabV3_ResNet101_Weights.DEFAULT
    model = deeplabv3_resnet101(weights=weights).eval().to(device)
    batch = weights.transforms()(img).unsqueeze(0).to(device)
    with torch.no_grad():
        logits = model(batch)["out"][0]
    # Clase 15 de VOC = persona.
    person = (logits.argmax(0) == 15).cpu().numpy().astype(np.uint8) * 255
    return Image.fromarray(person).resize(img.size, Image.BILINEAR)


def load_inputs(refresh: bool) -> tuple[Image.Image, Image.Image]:
    img = Image.open(SRC).convert("RGB")
    if refresh or not CACHE_MASK.exists():
        run_model(img).save(CACHE_MASK)
    return img, Image.open(CACHE_MASK).convert("L")


def luminance(img: np.ndarray, person: np.ndarray) -> np.ndarray:
    """
    Brillo normalizado sobre la persona, no sobre la foto entera: el fondo de
    escenario es mucho más claro que la camiseta y, si contase, la cara se
    quedaría en medios tonos. Un CLAHE suave recupera relieve en la cara.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    clahe = cv2.createCLAHE(clipLimit=1.3, tileGridSize=(4, 4))
    gray = clahe.apply(gray).astype(np.float32) / 255
    lo, hi = np.percentile(gray[person], 3), np.percentile(gray[person], 99)
    return np.clip((gray - lo) / max(hi - lo, 1e-6), 0, 1) ** 1.1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="vuelve a pasar el modelo")
    args = parser.parse_args()

    img, mask = load_inputs(args.refresh)
    img, mask = img.crop(CROP), mask.crop(CROP)

    width, height = img.size
    rows = round(COLS * height / width * CELL_ASPECT)

    rgb = np.asarray(img)
    m = np.asarray(mask.filter(ImageFilter.MinFilter(9)), dtype=np.float32) / 255
    lum = luminance(rgb, m > 0.5)

    # Se reduce con área (media de cada celda): cada letra representa su trozo
    # de foto, no un píxel suelto de él.
    small = (COLS, rows)
    lum = cv2.resize(lum, small, interpolation=cv2.INTER_AREA)
    color = cv2.resize(rgb, small, interpolation=cv2.INTER_AREA)
    m = cv2.resize(m, small, interpolation=cv2.INTER_AREA) > 0.5

    # El color de la foto, con el brillo sacado del retrato normalizado: el
    # tono y la saturación son los de la foto, la luz la pone `lum`. El suelo de
    # 0.36 es lo que deja ver la camiseta negra sobre el fondo negro.
    hsv = cv2.cvtColor(color, cv2.COLOR_RGB2HSV).astype(np.float32)
    person_v = (0.36 + 0.64 * lum ** 0.9) * 255

    # Alrededor, el escenario —las banderas, la pared morada— muy apagado y
    # desvaneciéndose con la distancia: da el color sin competir con la cara.
    near = cv2.GaussianBlur(m.astype(np.float32), (0, 0), sigmaX=7)
    halo = np.clip(near * 2.2, 0, 1) ** 1.4
    stage_v = hsv[..., 2] / 255
    stage_v = (0.06 + 0.32 * stage_v) * halo * 255

    # Más saturación cuanto más luz: la cara gana color, y la camiseta negra
    # —que en la foto recoge el morado del escenario— se queda gris.
    boost = np.where(m, 0.55 + 0.8 * lum, 1.7)
    hsv[..., 1] = np.clip(hsv[..., 1] * boost, 0, 255)
    hsv[..., 2] = np.where(m, person_v, stage_v)
    shown = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)

    # --- Qué letra va en cada celda ---
    # Bordes: el gradiente medio de cada celda, calculado sobre la foto a
    # resolución completa y algo suavizada. Donde hay borde va un carácter que
    # sigue su dirección (| / - \), que es lo que hace reconocible una cara en
    # ASCII; en el resto, la rampa por brillo.
    full_lum = luminance(rgb, np.asarray(mask, dtype=np.float32) / 255 > 0.5)
    blur = cv2.GaussianBlur(full_lum, (0, 0), sigmaX=width / COLS * 0.6)
    gx = cv2.resize(cv2.Sobel(blur, cv2.CV_32F, 1, 0, ksize=3), small, interpolation=cv2.INTER_AREA)
    gy = cv2.resize(cv2.Sobel(blur, cv2.CV_32F, 0, 1, ksize=3), small, interpolation=cv2.INTER_AREA)
    mag = np.hypot(gx, gy)
    edge = m & (mag > np.percentile(mag[m], 88))
    # Ángulo del borde (perpendicular al gradiente), en cuatro sectores.
    angle = (np.degrees(np.arctan2(gy, gx)) + 90) % 180
    edge_chars = np.array(["-", "\\", "|", "/"])
    sector = (((angle + 22.5) % 180) // 45).astype(int)

    stage_lum = np.clip(stage_v / 255 / 0.38, 0, 1)
    chars = []
    for y in range(rows):
        line = []
        for x in range(COLS):
            if m[y, x]:
                char = edge_chars[sector[y, x]] if edge[y, x] else RAMP[min(len(RAMP) - 1, int(lum[y, x] * len(RAMP)))]
            elif stage_v[y, x] >= 6:
                char = STAGE_RAMP[min(len(STAGE_RAMP) - 1, int(stage_lum[y, x] * len(STAGE_RAMP)))]
            else:
                char = " "
            line.append(char)
        chars.append("".join(line))

    data = np.zeros((rows, COLS, 4), dtype=np.uint8)
    drawn = np.array([[c != " " for c in line] for line in chars])
    data[..., :3] = np.where(drawn[..., None], np.maximum(shown, 1), 0)
    data[..., 3] = 255
    Image.fromarray(data, "RGBA").save(OUT_DATA, optimize=True)
    OUT_META.write_text(
        json.dumps(
            {"cols": COLS, "rows": rows, "cellAspect": CELL_ASPECT, "chars": chars},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n"
    )

    # --- Respaldo estático: las mismas letras, ya dibujadas ---
    # Igual que en el navegador: cada celda con un fondo tenue de su color y la
    # letra encima a color pleno, como el arte ANSI de una terminal. Sin ese
    # fondo la letra cubre tan poco de su celda que la cara no se reconoce.
    cw = 10
    ch = round(cw / CELL_ASPECT)
    font = ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSansMono-Bold.ttf", round(ch * 0.82))
    canvas = Image.new("RGBA", (COLS * cw, rows * ch), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    for y, line in enumerate(chars):
        for x, char in enumerate(line):
            if char == " ":
                continue
            r, g, b = (int(v) for v in data[y, x, :3])
            draw.rectangle((x * cw, y * ch, x * cw + cw - 1, y * ch + ch - 1), fill=(r, g, b, round(255 * CELL_FILL)))
            draw.text((x * cw + cw / 2, y * ch + ch / 2), char, fill=(r, g, b, 255), font=font, anchor="mm")
    canvas.save(OUT_STATIC, "WEBP", quality=82, method=6, exact=False)

    print(f"{COLS}x{rows} celdas, {int(m.sum())} dentro de la máscara")
    print(f"→ {OUT_DATA.relative_to(ROOT)}, {OUT_STATIC.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
