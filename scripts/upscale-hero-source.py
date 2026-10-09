"""Duplica la resolución del render del hero con Real-ESRGAN.

    python3 scripts/upscale-hero-source.py

Lee  assets-src/video/robot-headturn-enhanced.mp4   (1280x720)
Deja assets-src/video/robot-headturn-2x.mp4         (2560x1440)

No forma parte del build ni de `make-hero-figure.mjs`: se lanza a mano una vez
y lo que queda es una fuente más en `assets-src/`, que el generador de la placa
consume igual que cualquier otra. Separarlo es deliberado — esto necesita GPU,
PyTorch y 64 MB de pesos, y nada de eso tiene por qué estar en la cadena que
rehace un mp4 de medio mega.

POR QUÉ EXISTE
--------------
La placa del hero es el FONDO del hero, así que se estira a lo ancho de la
ventana. Midiendo lo que pide cada pantalla contra los 960 px que tenía la
placa: 1,5x en un portátil normal, 3,1x en un MacBook Pro de 14", 5,3x en un
5K. A esas ampliaciones no hay compresión que valga; lo que faltaban eran
píxeles.

Y no se podían sacar de ningún otro sitio. El render original de Kling es
1916x1080, más grande, pero bastante más blando: comparados al mismo tamaño
final, en el original las líneas de barrido de los ojos desaparecen del todo
mientras que en la versión mejorada se leen. Más píxeles, menos detalle. Así
que la mejor fuente disponible seguía siendo la de 1280x720, y la única salida
era reconstruir detalle en vez de interpolarlo.

POR QUÉ ASÍ
-----------
Se escala el fotograma ENTERO y sin voltear, para que la salida sea un
sustituto directo de la fuente: `make-hero-figure.mjs` sigue volteando y
recortando como siempre, sólo que con el doble de números.

Real-ESRGAN x2 y no lanczos porque la diferencia es visible: lanczos agranda
el borrón, el modelo reconstruye el borde. Y no inventa temblor — medida la
diferencia entre fotogramas consecutivos en el fondo, que está inmóvil, sale
0,222 de media contra 0,163 de lanczos, con un máximo MENOR (4 contra 6). Eso
importa más aquí que en un vídeo normal: el visitante no lo reproduce, lo va
pasando fotograma a fotograma con el cursor, y cualquier parpadeo se vería.

El resultado se guarda casi sin pérdida (crf 12) porque es un intermedio: lo
que se publica lo vuelve a comprimir el generador de la placa, y comprimir dos
veces sobre una fuente ya estropeada sí se nota.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from spandrel import ImageModelDescriptor, ModelLoader

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets-src/video/robot-headturn-enhanced.mp4"
TARGET = ROOT / "assets-src/video/robot-headturn-2x.mp4"
FPS = 24

# Los pesos no se versionan: 64 MB para un paso que se corre una vez.
#   hf download ai-forever/Real-ESRGAN RealESRGAN_x2.pth --local-dir assets-src/models
# Esa orden los deja justo en la ruta de abajo. Si los guardas en otro sitio,
# pásale la ruta como primer argumento. También está en el README.
MODEL = Path(
    sys.argv[1] if len(sys.argv) > 1 else ROOT / "assets-src/models/RealESRGAN_x2.pth"
)


def main() -> None:
    for path, hint in ((SOURCE, "el render de partida"), (MODEL, "los pesos del modelo")):
        if not path.exists():
            sys.exit(f"upscale-hero-source: falta {path} ({hint})")

    model = ModelLoader().load_from_file(MODEL)
    if not isinstance(model, ImageModelDescriptor):
        sys.exit("upscale-hero-source: el fichero no es un modelo de imagen")
    model.cuda().eval()

    probe = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v",
        "-show_entries", "stream=width,height", "-of", "csv=p=0", str(SOURCE),
    ]).decode().strip().split(",")
    w, h = int(probe[0]), int(probe[1])
    print(f"upscale-hero-source: {w}x{h} -> {w * model.scale}x{h * model.scale}")

    # Tubería en crudo en los dos extremos: ni un PNG en disco, y sobre todo
    # ninguna recompresión intermedia entre el decodificador y el modelo.
    reader = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(SOURCE), "-f", "rawvideo",
         "-pix_fmt", "rgb24", "pipe:1"],
        stdout=subprocess.PIPE,
    )
    writer = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{w * model.scale}x{h * model.scale}", "-r", str(FPS), "-i", "pipe:0",
         "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "12",
         "-pix_fmt", "yuv420p", str(TARGET)],
        stdin=subprocess.PIPE,
    )

    count = 0
    with torch.no_grad():
        while chunk := reader.stdout.read(w * h * 3):
            if len(chunk) < w * h * 3:
                break
            rgb = np.frombuffer(chunk, np.uint8).reshape(h, w, 3).astype(np.float32) / 255.0
            batch = torch.from_numpy(rgb).permute(2, 0, 1).unsqueeze(0).cuda()
            out = model(batch).clamp(0, 1).squeeze(0).permute(1, 2, 0).cpu().numpy()
            writer.stdin.write((out * 255.0 + 0.5).astype(np.uint8).tobytes())
            count += 1
            if count % 16 == 0:
                print(f"  {count} fotogramas", flush=True)

    reader.stdout.close()
    writer.stdin.close()
    if writer.wait() != 0 or count == 0:
        sys.exit(f"upscale-hero-source: falló el encode ({count} fotogramas)")
    print(f"upscale-hero-source: {TARGET} ({count} fotogramas)")


if __name__ == "__main__":
    main()
