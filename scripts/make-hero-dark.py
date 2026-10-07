"""Genera el hero oscuro sin IA: python3 scripts/make-hero-dark.py.

Requiere ffmpeg y Python con numpy y opencv-python. No forma parte del build.
Segmenta la silueta con GrabCut y conserva sus luces y reflejos interiores.
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
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    # Los ojos blancos y los reflejos son parte del robot, aunque compartan
    # color con el fondo. Rellenar los huecos de la silueta los conserva.
    filled = np.pad(fg, 1)
    cv2.floodFill(filled, None, (0, 0), 1)
    fg |= 1 - filled[1:-1, 1:-1]
    alpha = cv2.GaussianBlur(fg.astype(np.float32), (3, 3), .55)[..., None]
    return np.clip(frame * alpha + np.array(BACKGROUND) * (1 - alpha), 0, 255).astype(np.uint8)


def run(args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)


def main():
    capture = cv2.VideoCapture(str(UI / 'hero-figure.mp4'))
    if not capture.isOpened():
        raise RuntimeError('No se puede leer hero-figure.mp4')
    w = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if (w, h) != (960, 546):
        raise RuntimeError('Los recortes están calibrados para el render mejorado 960×546')
    encoder = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24',
        '-s', f'{w}x{h}', '-r', str(FPS), '-i', 'pipe:0', '-an',
        '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
        '-g', '1', '-keyint_min', '1', '-sc_threshold', '0', '-bf', '0',
        '-crf', '20', '-preset', 'slower', '-movflags', '+faststart',
        str(UI / 'hero-figure-dark.mp4')], stdin=subprocess.PIPE)
    count = 0
    samples = []
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            dark = composite(frame)
            encoder.stdin.write(dark.tobytes())
            if count in (0, REST, 35, 53):
                samples.append(cv2.resize(dark, (480, 273)))
            count += 1
    finally:
        capture.release()
        encoder.stdin.close()
    if encoder.wait() != 0 or count != 54:
        raise RuntimeError(f'Fallo al generar el arco oscuro ({count} fotogramas)')
    run(['-i', str(UI / 'hero-figure-dark.mp4'), '-vf', f'select=eq(n\\,{REST})',
         '-frames:v', '1', '-c:v', 'libwebp', '-quality', '92', str(UI / 'hero-figure-dark.webp')])
    # La imagen estrecha se extrae del vídeo fuente: comparte el frontal y el
    # recorte de make-hero-figure.mjs, sin reescalar ni modificar el giro.
    source = ROOT / 'assets-src/video/robot-headturn-enhanced.mp4'
    raw = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-i', str(source), '-vf',
        f'select=eq(n\\,{REST}),hflip,crop=800:374:272:0,colorlevels=rimax=0.740:gimax=0.770:bimax=0.775',
        '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'bgr24', 'pipe:1'])
    narrow = composite(np.frombuffer(raw, np.uint8).reshape(374, 800, 3), narrow=True)
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24',
        '-s', '800x374', '-i', 'pipe:0', '-frames:v', '1', '-c:v', 'libwebp',
        '-quality', '92', str(UI / 'hero-figure-narrow-dark.webp')], input=narrow.tobytes(), check=True)
    cv2.imwrite('/tmp/hero-dark-contact-sheet.png', np.vstack((np.hstack(samples[:2]), np.hstack(samples[2:]))))
    print(f'Hero oscuro: {count} fotogramas y dos pósteres generados.')


if __name__ == '__main__':
    main()
