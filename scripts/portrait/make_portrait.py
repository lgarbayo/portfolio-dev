"""
Retrato del hero: de la foto a una malla de vóxeles.

La escena del hero (`src/lib/three/portrait-scene.ts`) no carga la foto: carga
una imagen diminuta en la que cada píxel es un vóxel. Los tres canales llevan
datos, no color:

    R  luminancia del retrato, ya en escala de grises y con el contraste hecho
    G  profundidad (más claro = más cerca), para empujar cada cubo hacia fuera
    B  máscara de la persona (0 = fondo, no se pinta ningún cubo)

El alfa va siempre a 255 a propósito: el canvas del navegador premultiplica, y
un píxel con alfa 0 llega a `getImageData` con el RGB a cero. Por eso la máscara
viaja en B y no en A.

Además saca `hero-portrait.webp`: el mismo retrato dibujado como cuadrícula de
celdas, que es lo que se ve sin WebGL, en móvil o con movimiento reducido.

La foto original va en `assets-src/portrait/luis-source.jpg`, que no se versiona
(como todo `assets-src/`). Los pasos caros —segmentación y profundidad— se
cachean al lado, para que retocar el contraste no pida GPU ni modelos:

    python scripts/portrait/make_portrait.py            # usa la caché si existe
    python scripts/portrait/make_portrait.py --refresh  # vuelve a pasar los modelos

Modelos: DeepLabV3-ResNet101 de torchvision (BSD-3) para la máscara y
Depth Anything V2 Base (Apache-2.0) para la profundidad.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets-src/portrait/luis-source.jpg"
CACHE_MASK = ROOT / "assets-src/portrait/mask.png"
CACHE_DEPTH = ROOT / "assets-src/portrait/depth.png"
OUT_DATA = ROOT / "public/assets/ui/portrait-voxels.png"
OUT_STATIC = ROOT / "public/assets/ui/hero-portrait.webp"
OUT_META = ROOT / "public/assets/ui/portrait-voxels.json"

# Encuadre sobre la foto original (2000x1333): cabeza, hombros y la mano. Se
# deja aire arriba para que el pelo no toque el borde.
CROP = (500, 90, 1540, 1333)
# Resolución de la malla. Por encima de ~12k cubos la escena empieza a pesar en
# portátiles con gráfica integrada; 88x105 son ~6k cubos dentro de la máscara.
COLS = 88


def run_models(img: Image.Image) -> tuple[Image.Image, Image.Image]:
    import torch
    from torchvision.models.segmentation import (
        DeepLabV3_ResNet101_Weights,
        deeplabv3_resnet101,
    )
    from transformers import pipeline

    device = "cuda" if torch.cuda.is_available() else "cpu"
    weights = DeepLabV3_ResNet101_Weights.DEFAULT
    model = deeplabv3_resnet101(weights=weights).eval().to(device)
    batch = weights.transforms()(img).unsqueeze(0).to(device)
    with torch.no_grad():
        logits = model(batch)["out"][0]
    # Clase 15 de VOC = persona.
    person = (logits.argmax(0) == 15).cpu().numpy().astype(np.uint8) * 255
    mask = Image.fromarray(person).resize(img.size, Image.BILINEAR)

    depth = pipeline(
        "depth-estimation",
        model="depth-anything/Depth-Anything-V2-Base-hf",
        device=0 if device == "cuda" else -1,
    )(img)["depth"].resize(img.size)
    return mask, depth


def load_inputs(refresh: bool) -> tuple[Image.Image, Image.Image, Image.Image]:
    img = Image.open(SRC).convert("RGB")
    if refresh or not (CACHE_MASK.exists() and CACHE_DEPTH.exists()):
        mask, depth = run_models(img)
        mask.save(CACHE_MASK)
        depth.convert("L").save(CACHE_DEPTH)
    return img, Image.open(CACHE_MASK).convert("L"), Image.open(CACHE_DEPTH).convert("L")


def luminance(img: Image.Image, person: np.ndarray) -> np.ndarray:
    """
    Escala de grises normalizada sobre la persona, no sobre la foto entera: el
    fondo de escenario es mucho más claro que la camiseta y, si contase, la
    cara se quedaría en medios tonos. Un CLAHE suave recupera algo de relieve
    en la cara sin convertir la camiseta negra en gris.
    """
    gray = cv2.cvtColor(np.asarray(img), cv2.COLOR_RGB2GRAY)
    clahe = cv2.createCLAHE(clipLimit=1.3, tileGridSize=(4, 4))
    gray = clahe.apply(gray).astype(np.float32) / 255
    lo, hi = np.percentile(gray[person], 3), np.percentile(gray[person], 99)
    return np.clip((gray - lo) / max(hi - lo, 1e-6), 0, 1) ** 1.1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="vuelve a pasar los modelos")
    args = parser.parse_args()

    img, mask, depth = load_inputs(args.refresh)
    img, mask, depth = (x.crop(CROP) for x in (img, mask, depth))

    width, height = img.size
    rows = round(COLS * height / width)

    # Se reduce con área (media de cada celda), no con el vecino más cercano:
    # cada cubo representa su trozo de foto, no un píxel suelto de él.
    m = np.asarray(mask.filter(ImageFilter.MinFilter(9)), dtype=np.float32) / 255
    lum = cv2.resize(luminance(img, m > 0.5), (COLS, rows), interpolation=cv2.INTER_AREA)
    m = cv2.resize(m, (COLS, rows), interpolation=cv2.INTER_AREA) > 0.5

    d = np.asarray(depth, dtype=np.float32) / 255
    d = cv2.resize(d, (COLS, rows), interpolation=cv2.INTER_AREA)
    # Profundidad relativa a la persona: el fondo no cuenta para el rango.
    inside = d[m]
    lo, hi = np.percentile(inside, 2), np.percentile(inside, 98)
    d = np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)

    data = np.zeros((rows, COLS, 4), dtype=np.uint8)
    data[..., 0] = np.round(lum * 255)
    data[..., 1] = np.round(d * 255)
    data[..., 2] = m * 255
    data[..., 3] = 255
    Image.fromarray(data, "RGBA").save(OUT_DATA, optimize=True)
    OUT_META.write_text(json.dumps({"cols": COLS, "rows": rows, "voxels": int(m.sum())}) + "\n")

    # --- Respaldo estático: la misma malla, dibujada plana ---
    cell = 12
    # Fondo transparente: la rejilla de la página tiene que verse alrededor,
    # igual que con la escena.
    canvas = Image.new("RGBA", (COLS * cell, rows * cell), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    for y in range(rows):
        for x in range(COLS):
            if not m[y, x]:
                continue
            v = int(24 + lum[y, x] * 226)
            x0, y0 = x * cell, y * cell
            draw.rectangle((x0, y0, x0 + cell - 2, y0 + cell - 2), fill=(v, v, v, 255))
    canvas.save(OUT_STATIC, "WEBP", quality=80, method=6, exact=False)

    print(f"{COLS}x{rows} vóxeles, {int(m.sum())} dentro de la máscara")
    print(f"→ {OUT_DATA.relative_to(ROOT)}, {OUT_STATIC.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
