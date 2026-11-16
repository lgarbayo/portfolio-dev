"""
Máscara de tierra para el globo de Contacto.

Rasteriza los polígonos de Natural Earth (1:50m, dominio público) a una imagen
equirectangular diminuta:
blanco = tierra. El navegador la muestrea para colocar los puntos del globo, así
que viajan unos pocos KB en vez de miles de coordenadas.

También dibuja `contact-globe.webp`, el mismo globo de puntos visto desde
Galicia, para cuando no hay WebGL o hay movimiento reducido.

    python scripts/globe/make_globe.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import urllib.request

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
# `assets-src/` no se versiona: si no está, se descarga.
SRC = ROOT / "assets-src/globe/ne_50m_land.geojson"
SRC_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson"
OUT_MASK = ROOT / "public/assets/ui/globe-land.png"
OUT_STILL = ROOT / "public/assets/ui/contact-globe.webp"

# Medio grado por píxel: con eso Galicia ya tiene forma y la imagen ocupa ~10 KB.
W, H = 720, 360

# Centro de la vista fija: un poco al oeste y al norte de Ourense, para que la
# península quede en el tercio izquierdo del disco, como en la escena.
VIEW_LAT, VIEW_LON = 38.0, -2.0
CITIES = {
    "Ourense": (42.34, -7.86),
    "A Coruña": (43.39, -8.41),
    "Madrid": (40.42, -3.71),
}


def mask() -> Image.Image:
    image = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(image)
    for feature in json.loads(SRC.read_text())["features"]:
        geometry = feature["geometry"]
        polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        for polygon in polygons:
            ring = [((lon + 180) / 360 * W, (90 - lat) / 180 * H) for lon, lat in polygon[0]]
            if len(ring) > 2:
                draw.polygon(ring, fill=255)
    return image


def project(lat: float, lon: float) -> tuple[float, float, float]:
    """Ortográfica centrada en VIEW: x, y en [-1, 1] y z > 0 si se ve."""
    φ, λ = math.radians(lat), math.radians(lon)
    φ0, λ0 = math.radians(VIEW_LAT), math.radians(VIEW_LON)
    x = math.cos(φ) * math.sin(λ - λ0)
    y = math.cos(φ0) * math.sin(φ) - math.sin(φ0) * math.cos(φ) * math.cos(λ - λ0)
    z = math.sin(φ0) * math.sin(φ) + math.cos(φ0) * math.cos(φ) * math.cos(λ - λ0)
    return x, y, z


def still(land: Image.Image) -> None:
    size = 1400
    radius = size * 0.46
    # Transparente fuera del disco, para que la rejilla de la página siga; el
    # disco va relleno del color de fondo, como la esfera de oclusión de la escena.
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.ellipse((size / 2 - radius, size / 2 - radius, size / 2 + radius, size / 2 + radius), fill=(5, 5, 5, 255))
    pixels = land.load()
    step = 1.2
    lat = -88.0
    while lat <= 88:
        lon_step = step / max(math.cos(math.radians(lat)), 0.15)
        lon = -180.0
        while lon < 180:
            px = int((lon + 180) / 360 * (W - 1))
            py = int((90 - lat) / 180 * (H - 1))
            if pixels[px, py] > 127:
                x, y, z = project(lat, lon)
                if z > 0:
                    v = int(70 + 185 * z)
                    cx, cy = size / 2 + x * radius, size / 2 - y * radius
                    draw.rectangle((cx - 1.6, cy - 1.6, cx + 1.6, cy + 1.6), fill=(v, v, v, 255))
            lon += lon_step
        lat += step

    points = []
    for name, (clat, clon) in CITIES.items():
        x, y, _ = project(clat, clon)
        points.append((size / 2 + x * radius, size / 2 - y * radius))
        cx, cy = points[-1]
        draw.rectangle((cx - 5, cy - 5, cx + 5, cy + 5), fill=(255, 255, 255, 255))
    draw.line(points, fill=(255, 255, 255, 255), width=2)
    image.save(OUT_STILL, "WEBP", quality=78, method=6)


def main() -> None:
    if not SRC.exists():
        SRC.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(SRC_URL, SRC)
    land = mask()
    land.save(OUT_MASK, optimize=True)
    still(land)
    print(f"→ {OUT_MASK.relative_to(ROOT)} ({OUT_MASK.stat().st_size // 1024} KB), {OUT_STILL.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
