"""
Retrato del hero: la foto recortada a color.

El hero (`src/lib/hero-portrait.ts`) pinta la foto con un shader (la entrada en
mosaico y algún fallo de CRT). Sale de aquí:

    portrait.webp   la foto recortada, con alfa (fuera de la persona,
                    transparente). Es también lo que se ve sin WebGL.
    portrait.json   su tamaño, para el `<img>`, y la silueta a bloques que hace
                    de esqueleto mientras arranca la escena.

El recorte sale de SAM (Segment Anything) con una caja alrededor de la persona y
unos puntos: positivos sobre la cara, el pelo, el brazo, la camiseta y el
micrófono; negativos en el hueco entre la mano y el cuello —por donde asoma la
bandera azul— y en el respaldo de la silla, que es tan negro como la camiseta.
La segmentación por clases que había antes (DeepLabV3) dejaba ese hueco dentro.

La foto original va en `assets-src/portrait/luis-source.jpg`, que no se versiona
(como todo `assets-src/`). La máscara se cachea al lado, para que retocar el
encuadre no pida GPU ni modelos:

    python scripts/portrait/make_portrait.py            # usa la caché si existe
    python scripts/portrait/make_portrait.py --refresh  # vuelve a pasar el modelo

Modelo: SAM ViT-H (facebook/sam-vit-huge, Apache-2.0).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets-src/portrait/luis-source.jpg"
CACHE_MASK = ROOT / "assets-src/portrait/mask-sam.png"
OUT_COLOR = ROOT / "public/assets/ui/portrait.webp"
OUT_META = ROOT / "public/assets/ui/portrait.json"

# Encuadre sobre la foto original (2000x1333): cabeza, hombros y la mano. Se
# deja aire arriba para que el pelo no toque el borde.
CROP = (500, 90, 1540, 1333)
# Ancho de la foto publicada: de sobra para la mitad de una pantalla grande con
# densidad 2x.
OUT_WIDTH = 900
# Lado de cada bloque de la silueta de carga, en px de la foto publicada: del
# orden del primer paso del mosaico de entrada, para que una cosa lleve a la otra.
SILHOUETTE_BLOCK = 25

# Puntos para SAM, en coordenadas de la foto original.
BOX = (520, 140, 1520, 1333)
POSITIVE = [
    (940, 490),  # cara
    (1007, 250),  # pelo
    (900, 1023),  # antebrazo
    (1100, 837),  # camiseta
    (753, 663),  # mano
    (1040, 1250),  # camiseta, abajo
    (650, 1250),  # el otro brazo
    (1067, 597),  # micrófono
]
NEGATIVE = [
    (873, 730),  # hueco entre la mano y el cuello
    (800, 645),  # entre los dedos y la mejilla
    (870, 680),
    (1380, 490),  # respaldo de la silla
    (1460, 700),
]


def run_sam(img: Image.Image) -> Image.Image:
    import torch
    from transformers import SamModel, SamProcessor

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = SamModel.from_pretrained("facebook/sam-vit-huge").to(device).eval()
    processor = SamProcessor.from_pretrained("facebook/sam-vit-huge")
    points = [[[float(x), float(y)] for x, y in POSITIVE + NEGATIVE]]
    labels = [[1] * len(POSITIVE) + [0] * len(NEGATIVE)]
    inputs = processor(
        img,
        input_points=[points],
        input_labels=[labels],
        input_boxes=[[list(map(float, BOX))]],
        return_tensors="pt",
    ).to(device)
    with torch.no_grad():
        out = model(**inputs, multimask_output=True)
    masks = processor.image_processor.post_process_masks(
        out.pred_masks.cpu(), inputs["original_sizes"].cpu(), inputs["reshaped_input_sizes"].cpu()
    )[0][0]
    # De las tres que propone, la de mejor IoU estimado: con estos puntos es la
    # de la persona entera.
    best = int(out.iou_scores[0, 0].argmax())
    return Image.fromarray(masks[best].numpy().astype(np.uint8) * 255)


def load_inputs(refresh: bool) -> tuple[Image.Image, Image.Image]:
    img = Image.open(SRC).convert("RGB")
    if refresh or not CACHE_MASK.exists():
        run_sam(img).save(CACHE_MASK)
    return img, Image.open(CACHE_MASK).convert("L")


def silhouette(alpha: np.ndarray) -> dict[str, object]:
    """
    La persona en bloques: un trazado SVG con los bloques que caen dentro del
    recorte y, aparte, unos pocos de ellos repartidos en tres grupos que se
    encienden por turnos. Coordenadas en px de la foto publicada, para que el
    `viewBox` sea el mismo que el de la imagen.
    """
    b = SILHOUETTE_BLOCK
    rows = -(-alpha.shape[0] // b)
    cols = -(-alpha.shape[1] // b)
    filled = np.zeros((rows, cols), dtype=bool)
    for r in range(rows):
        for c in range(cols):
            filled[r, c] = alpha[r * b : (r + 1) * b, c * b : (c + 1) * b].mean() > 127

    def path(cells: np.ndarray) -> str:
        # Una fila de bloques seguidos va en un solo rectángulo.
        out = []
        for r in range(rows):
            c = 0
            while c < cols:
                if not cells[r, c]:
                    c += 1
                    continue
                start = c
                while c < cols and cells[r, c]:
                    c += 1
                w = (c - start) * b
                out.append(f"M{start * b} {r * b}h{w}v{b}h-{w}z")
        return "".join(out)

    # Hash fijo por bloque: el dibujo no cambia de una ejecución a otra.
    rr, cc = np.mgrid[0:rows, 0:cols]
    h = np.modf(np.abs(np.sin(rr * 311.7 + cc * 127.1) * 43758.5453))[0]
    lit = [filled & (h >= lo) & (h < lo + 0.07) for lo in (0.0, 0.33, 0.66)]
    return {"path": path(filled), "lit": [path(cells) for cells in lit]}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="vuelve a pasar el modelo")
    args = parser.parse_args()

    img, mask = load_inputs(args.refresh)
    img, mask = img.crop(CROP), mask.crop(CROP)

    width = OUT_WIDTH
    height = round(OUT_WIDTH * img.size[1] / img.size[0])

    # Máscara: los agujeros pequeños que deja SAM se cierran, y el borde se
    # suaviza un poco para que no quede dentado sobre el negro.
    m = np.asarray(mask, dtype=np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    m = cv2.resize(m, (width, height), interpolation=cv2.INTER_AREA)
    alpha = cv2.GaussianBlur(m, (0, 0), sigmaX=1.0)

    rgb = np.asarray(img.resize((width, height), Image.LANCZOS))
    rgba = np.dstack([rgb, alpha])
    Image.fromarray(rgba, "RGBA").save(OUT_COLOR, "WEBP", quality=86, method=6, exact=False)

    meta = {"width": width, "height": height, "silhouette": silhouette(alpha)}
    OUT_META.write_text(json.dumps(meta) + "\n")
    print(f"{width}x{height} → {OUT_COLOR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
