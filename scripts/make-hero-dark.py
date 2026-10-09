"""Genera el hero oscuro sin IA: python3 scripts/make-hero-dark.py.

Requiere ffmpeg y Python con numpy y opencv-python. No forma parte del build.
Segmenta la silueta con GrabCut y conserva sus luces y reflejos interiores.

Parte de la placa clara ya generada, así que hay que lanzar antes
`make-hero-figure.mjs`. Y la lee por tubería de ffmpeg en vez de con
`cv2.VideoCapture`: la placa buena va en AV1 y el ffmpeg que trae OpenCV aquí
no lo decodifica —abre el fichero, dice que mide 1920x1092 y luego falla al
leer el primer fotograma—. El binario de ffmpeg sí puede, así que se le pide a
él y aquí sólo entran píxeles en crudo.

Emite las dos placas que emite la clara, por el mismo motivo: AV1 para quien
pueda y H.264 de reserva para Safari viejo y los Mac Intel.
"""
from pathlib import Path
import subprocess
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
UI = ROOT / 'public/assets/ui'
BACKGROUND = (29, 26, 24)  # #181a1d, en BGR
REST = 14
FPS = 24
SIZE = (1920, 1092)   # lo que produce make-hero-figure.mjs desde la fuente 2x
FALLBACK_WIDTH = 960  # la reserva en H.264, igual que en la placa clara
# El recorte estrecho, en coordenadas de la fuente 2x (2560 de ancho).
NARROW_CROP = 'crop=1600:748:544:0'
GRADE = 'colorlevels=rimax=0.740:gimax=0.770:bimax=0.775'


def composite(frame, narrow=False):
    h, w = frame.shape[:2]
    mask = np.full((h, w), cv2.GC_BGD, np.uint8)
    left, right = (.12, .88) if narrow else (.35, .96)
    mask[0:h, int(w * left):int(w * right)] = cv2.GC_PR_BGD
    area = mask == cv2.GC_PR_BGD
    lum = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    mask[area & (lum < 180)] = cv2.GC_PR_FGD
    mask[area & (lum < 115)] = cv2.GC_FGD
    cv2.setRNGSeed(0)
    cv2.grabCut(frame, mask, None, np.zeros((1, 65), np.float64),
                np.zeros((1, 65), np.float64), 4, cv2.GC_INIT_WITH_MASK)
    fg = ((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)).astype(np.uint8)
    # El núcleo va en píxeles, así que escala con el tamaño del fotograma: con
    # (3,3) sobre una placa del doble de ancho el cierre no llega a tapar nada.
    k = 5 if w >= 1600 else 3
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
    # Los ojos blancos y los reflejos son parte del robot, aunque compartan
    # color con el fondo. Rellenar los huecos de la silueta los conserva.
    filled = np.pad(fg, 1)
    cv2.floodFill(filled, None, (0, 0), 1)
    fg |= 1 - filled[1:-1, 1:-1]
    alpha = cv2.GaussianBlur(fg.astype(np.float32), (k, k), .55 * k / 3)[..., None]
    return np.clip(frame * alpha + np.array(BACKGROUND) * (1 - alpha), 0, 255).astype(np.uint8)


def run(args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)


def frames_from(path, size):
    """Los fotogramas de un vídeo, en crudo, decodificados por el ffmpeg del
    sistema. Un generador para no tener los 54 en memoria a la vez."""
    w, h = size
    proc = subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'rawvideo',
         '-pix_fmt', 'bgr24', 'pipe:1'],
        stdout=subprocess.PIPE)
    try:
        while chunk := proc.stdout.read(w * h * 3):
            if len(chunk) < w * h * 3:
                break
            yield np.frombuffer(chunk, np.uint8).reshape(h, w, 3)
    finally:
        proc.stdout.close()
        proc.wait()


def main():
    light = UI / 'hero-figure.av1.mp4'
    if not light.exists():
        raise RuntimeError(f'Falta {light}: lanza antes make-hero-figure.mjs')
    probe = subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v',
        '-show_entries', 'stream=width,height', '-of', 'csv=p=0', str(light),
    ]).decode().strip().split(',')
    w, h = int(probe[0]), int(probe[1])
    if (w, h) != SIZE:
        raise RuntimeError(f'La placa clara mide {w}x{h} y esto espera {SIZE[0]}x{SIZE[1]}')

    dark_av1 = UI / 'hero-figure-dark.av1.mp4'
    encoder = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24',
        '-s', f'{w}x{h}', '-r', str(FPS), '-i', 'pipe:0', '-an',
        '-c:v', 'libsvtav1', '-pix_fmt', 'yuv420p',
        '-g', '1', '-crf', '36', '-preset', '3', '-svtav1-params', 'keyint=1',
        '-movflags', '+faststart', str(dark_av1)], stdin=subprocess.PIPE)

    count = 0
    samples = []
    try:
        for frame in frames_from(light, SIZE):
            dark = composite(frame)
            encoder.stdin.write(dark.tobytes())
            if count in (0, REST, 35, 53):
                samples.append(cv2.resize(dark, (480, 273)))
            count += 1
    finally:
        encoder.stdin.close()
    if encoder.wait() != 0 or count != 54:
        raise RuntimeError(f'Fallo al generar el arco oscuro ({count} fotogramas)')

    # La reserva en H.264 sale del AV1 recién hecho, igual que en la clara: un
    # solo recorrido de GrabCut para las dos, que es lo caro de todo esto.
    run(['-i', str(dark_av1), '-vf', f'scale={FALLBACK_WIDTH}:-2:flags=lanczos',
         '-an', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
         '-g', '1', '-keyint_min', '1', '-sc_threshold', '0', '-bf', '0',
         '-crf', '20', '-preset', 'slower', '-movflags', '+faststart',
         str(UI / 'hero-figure-dark.mp4')])

    run(['-i', str(dark_av1), '-vf', f'select=eq(n\\,{REST})',
         '-frames:v', '1', '-c:v', 'libwebp', '-quality', '92',
         str(UI / 'hero-figure-dark.webp')])

    # La imagen estrecha se extrae del vídeo fuente: comparte el frontal y el
    # recorte de make-hero-figure.mjs, sin reescalar ni modificar el giro.
    source = ROOT / 'assets-src/video/robot-headturn-2x.mp4'
    raw = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-i', str(source), '-vf',
        f'select=eq(n\\,{REST}),hflip,{NARROW_CROP},{GRADE}',
        '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'bgr24', 'pipe:1'])
    nw, nh = 1600, 748
    narrow = composite(np.frombuffer(raw, np.uint8).reshape(nh, nw, 3), narrow=True)
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24',
        '-s', f'{nw}x{nh}', '-i', 'pipe:0', '-frames:v', '1', '-c:v', 'libwebp',
        '-quality', '92', str(UI / 'hero-figure-narrow-dark.webp')],
        input=narrow.tobytes(), check=True)

    cv2.imwrite('/tmp/hero-dark-contact-sheet.png',
                np.vstack((np.hstack(samples[:2]), np.hstack(samples[2:]))))
    for out in (dark_av1, UI / 'hero-figure-dark.mp4'):
        print(f'  {out.name}: {out.stat().st_size // 1024} KB')
    print(f'Hero oscuro: {count} fotogramas y dos pósteres generados.')


if __name__ == '__main__':
    main()
