"""Pinta la figura del hero a partir del render del que salio la malla.

    blender --background --python scripts/paint-figure.blender.py -- <referencia.png>

El GLB de `public/assets/ui/` no trae color que encender: es una malla sola con
POSITION y NORMAL, sin materiales, sin UVs y sin COLOR_0 —viene de un escaneo
limpiado en Blender—. Este script le pone el color del render original.

La idea es no inventarse nada. El render de referencia es la imagen de la que se
genero la malla, asi que sirve de dos maneras: da la paleta y dice que zona es
que. Se busca la camara con la que se hizo ese render, se proyecta sobre la
malla un mapa de regiones sacado de el, y cada cara acaba con una de ocho
regiones. Lo que la camara no vio se rellena por espejo y por la superficie.

Lo que no funciona, y se probo:

  - Separar por partes sueltas. La malla es una cascara soldada: 18.600 de sus
    18.710 vertices son una sola isla, y las otras dieciocho son fragmentos de
    tres vertices. Persona, sillon, portatil y zapatillas son la misma piel.
  - Clasificar solo por color. La madera de las patas y la piel de la cara caen
    en el mismo tono, y el chandal negro y el sillon en sombra son el mismo
    pixel. Hace falta la posicion en 3D para desempatar.
  - Colores por vertice en vez de materiales. Interpolan a lo largo de cada
    triangulo que cruza dos zonas, y dejan un degradado sucio en cada frontera.

La referencia no esta versionada —es el fichero que se paso al generador de
malla, no una fuente del sitio—, asi que la ruta se pasa como argumento. El GLB
que sale si esta versionado: este script documenta como se hizo y permite
retocarlo, pero no hace falta para construir la web.
"""

import bpy
import bmesh
import math
import os
import sys

import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLB = os.path.join(ROOT, "public", "assets", "ui", "personaje.glb")
POSTER = os.path.join(ROOT, "public", "assets", "ui", "personaje.webp")

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if not argv:
    sys.exit("Falta la ruta del render de referencia.")
REF = argv[0]

# La camara del render de referencia, hallada maximizando el solape de siluetas
# sobre un barrido de giro, altura y focal. Encaja al 96% de IoU: la malla se
# genero de esa imagen, asi que la camara existe y se puede recuperar.
YAW, PITCH, FOCAL = 18.25, 3.5, 88.0
RES = 1024

REGIONS = ["chandal", "piel", "pelo", "sillon", "madera", "portatil", "zapatilla", "suela"]
CHANDAL, PIEL, PELO, SILLON, MADERA, PORTATIL, ZAPATILLA, SUELA = range(len(REGIONS))
K = len(REGIONS)

# Los tonos del render, con una excepcion: el chandal es casi negro (#1f191d) y
# el fondo del sitio es #171717, asi que la figura se fundia con la pagina. Sube
# a gris carbon, que es lo unico que se separa de los colores del render.
PALETTE = {
    "chandal":   (0x2f, 0x2b, 0x33),
    "piel":      (0xe0, 0xa1, 0x84),
    "pelo":      (0x7a, 0x50, 0x38),
    "sillon":    (0x86, 0x88, 0xab),
    "madera":    (0xc9, 0xa6, 0x7e),
    "portatil":  (0x8d, 0x7a, 0x8b),
    "zapatilla": (0xe4, 0xb9, 0x50),
    "suela":     (0xec, 0xe6, 0xe8),
}
ROUGHNESS = {"chandal": 0.85, "piel": 0.62, "pelo": 0.55, "sillon": 0.88,
             "madera": 0.68, "portatil": 0.45, "zapatilla": 0.60, "suela": 0.72}


def srgb_to_linear(v):
    v = v / 255.0
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def linear_rgba(c):
    return (srgb_to_linear(c[0]), srgb_to_linear(c[1]), srgb_to_linear(c[2]), 1.0)


# ---------------------------------------------------------------------------
# 1. Mapa de regiones sobre la referencia, en 2D
# ---------------------------------------------------------------------------

def build_labelmap(path):
    """Etiqueta cada pixel del render con una region, o con -1 si no esta claro.

    Dejar sin decidir lo dudoso es mejor que forzar una respuesta: en la imagen
    el chandal en sombra y el sillon en sombra son el mismo pixel, pero en la
    malla son dos superficies distintas y la propagacion las separa sola.
    """
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    alpha = a[..., 3] > 128
    H, W = alpha.shape

    # El render trae grano. Sin quitarlo la clasificacion sale moteada y no hay
    # umbral que lo arregle, porque el ruido cruza cualquier frontera.
    den = Image.fromarray(a[..., :3]).filter(ImageFilter.MedianFilter(5))
    rgb = np.array(den.filter(ImageFilter.MedianFilter(5))).astype(np.float32)
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]

    mx, mn = rgb.max(-1), rgb.min(-1)
    V = mx / 255.0
    S = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0.0)
    c = np.maximum(mx - mn, 1e-6)
    hue = np.where(
        mx == R, ((G - B) / c) % 6,
        np.where(mx == G, (B - R) / c + 2, (R - G) / c + 4),
    ) * 60.0
    cool = B - R          # >0 frio (sillon, portatil), <0 calido (piel, pelo, madera)

    def box(x0, y0, x1, y1):
        m = np.zeros((H, W), bool)
        m[y0:y1, x0:x1] = True
        return m

    def poly(pts):
        m = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m).polygon([tuple(p) for p in pts], fill=255)
        return np.array(m) > 128

    # Zonas medidas sobre la referencia. Acotan donde puede aparecer cada cosa:
    # sin ellas la madera de las patas se confunde con la piel, que tiene el
    # mismo tono.
    CABEZA = box(415, 30, 672, 318)
    # La cara con las orejas hace falta a mano: el brillo del pelo es tan claro
    # como la piel y por color no se separan.
    CARA = poly([(437, 180), (480, 165), (552, 162), (604, 180), (641, 205),
                 (650, 258), (612, 301), (548, 324), (482, 313), (438, 263),
                 (423, 212)])
    MANOS = box(468, 283, 552, 400) | box(538, 495, 632, 585)
    # La tapa del portatil es un paralelogramo: con una caja se comia las
    # perneras de las esquinas.
    TAPA = poly([(307, 421), (516, 397), (585, 570), (312, 597)])
    MADERA_Z = box(612, 725, 780, 925) | box(428, 730, 498, 895)
    PIES = box(0, 855, W, H)

    lab = np.full((H, W), -1, np.int8)

    def put(mask, region):
        lab[mask & alpha & (lab < 0)] = region

    # De lo mas inequivoco a lo mas dudoso: la primera regla que reclama un
    # pixel se lo queda.
    put(PIES & (hue > 38) & (hue < 68) & (S > 0.45) & (V > 0.45), ZAPATILLA)
    put(PIES & (V > 0.70) & (S < 0.18), SUELA)
    put(MADERA_Z & (hue > 12) & (hue < 45) & (S > 0.22) & (V > 0.28), MADERA)
    calido = (hue > 3) & (hue < 40) & (S > 0.10)
    put((CARA | MANOS) & calido & (V > 0.30), PIEL)
    put(CABEZA & ~CARA & calido & (V > 0.04), PELO)
    put(TAPA & (V > 0.13) & (cool > -8), PORTATIL)
    put((cool >= 6) & (S >= 0.10) & (V >= 0.22), SILLON)
    put((cool <= 4) & (V < 0.36) & (S < 0.40), CHANDAL)
    # Lo que quede —sombras profundas y bordes— se decide ya sobre la malla.
    return lab, alpha


# ---------------------------------------------------------------------------
# 2. Proyeccion sobre la malla
# ---------------------------------------------------------------------------

def setup_camera(scene, ob):
    """Coloca la camara del render de referencia y devuelve el objeto."""
    bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    center = sum(bb, Vector()) / 8
    radius = max((c - center).length for c in bb)

    data = bpy.data.cameras.new("ref")
    data.lens, data.sensor_width = FOCAL, 36
    cam = bpy.data.objects.new("ref", data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    fov = 2 * math.atan(18 / FOCAL)
    y, p = math.radians(YAW), math.radians(PITCH)
    d = Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p)))
    cam.location = center + d * (radius / math.sin(fov / 2) * 1.05)
    cam.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    bpy.context.view_layer.update()
    return cam


def project(scene, ob, cam, labelmap, ref_alpha, tmpdir):
    """Etiqueta cada vertice visible desde la camara de referencia."""
    # La referencia y el render de la malla se alinean por su caja de recorte:
    # asi no hay que ajustar tambien el desplazamiento y la escala de la camara.
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = scene.render.resolution_y = RES
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    scene.display.shading.light = "FLAT"
    scene.display.shading.color_type = "SINGLE"
    scene.display.shading.single_color = (1, 1, 1)
    scene.render.filepath = os.path.join(tmpdir, "silueta")
    bpy.ops.render.render(write_still=True)

    rm = np.array(Image.open(os.path.join(tmpdir, "silueta.png")).convert("RGBA")
                  .split()[3]) > 32
    rys, rxs = np.nonzero(rm)
    rbox = (rxs.min(), rys.min(), rxs.max(), rys.max())
    ays, axs = np.nonzero(ref_alpha)
    abox = (axs.min(), ays.min(), axs.max(), ays.max())
    sx = (abox[2] - abox[0]) / (rbox[2] - rbox[0])
    sy = (abox[3] - abox[1]) / (rbox[3] - rbox[1])

    def label_at(px, py):
        ix = int(round(abox[0] + (px - rbox[0]) * sx))
        iy = int(round(abox[1] + (py - rbox[1]) * sy))
        for r in (0, 1, 2, 3):
            for dx in range(-r, r + 1):
                for dy in range(-r, r + 1):
                    if r and max(abs(dx), abs(dy)) != r:
                        continue
                    jx, jy = ix + dx, iy + dy
                    if 0 <= jx < RES and 0 <= jy < RES and labelmap[jy, jx] >= 0:
                        return int(labelmap[jy, jx])
        return -1

    me = ob.data
    n = len(me.vertices)
    co = np.empty(n * 3, np.float32); me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)
    nr = np.empty(n * 3, np.float32); me.vertices.foreach_get("normal", nr)
    nr = nr.reshape(n, 3)

    dg = bpy.context.evaluated_depsgraph_get()
    origin = cam.location
    M, M3 = ob.matrix_world, ob.matrix_world.to_3x3()
    labels = np.full(n, -1, np.int16)

    for i in range(n):
        world = M @ Vector(co[i].tolist())
        normal = (M3 @ Vector(nr[i].tolist())).normalized()
        to_cam = origin - world
        dlen = to_cam.length
        # Un vertice casi de perfil se proyecta al borde de la silueta y recoge
        # el color de lo que hay detras: la madera del sillon salpicaba el
        # pantalon. Los de perfil se descartan; ya los rellena la propagacion.
        if normal.dot(to_cam / dlen) <= 0.30:
            continue
        hit, loc, *_ = scene.ray_cast(dg, origin, -(to_cam / dlen), distance=dlen - 0.008)
        if hit and (loc - origin).length < dlen - 0.012:
            continue
        ndc = world_to_camera_view(scene, cam, world)
        if not (0 <= ndc.x <= 1 and 0 <= ndc.y <= 1):
            continue
        l = label_at(ndc.x * RES, (1 - ndc.y) * RES)
        if l >= 0:
            labels[i] = l
    return labels, co


# ---------------------------------------------------------------------------
# 3. Relleno y limpieza sobre la malla
# ---------------------------------------------------------------------------

def clean(labels, co, edges):
    n = len(labels)
    seen = labels >= 0
    ea, eb = edges[:, 0], edges[:, 1]

    def vote(lbl, rounds, only_unknown=False):
        for _ in range(rounds):
            cnt = np.zeros((n, K), np.int32)
            for a, b in ((ea, eb), (eb, ea)):
                ok = lbl[b] >= 0
                np.add.at(cnt, (a[ok], lbl[b][ok]), 1)
            has = cnt.sum(1) > 0
            upd = has & (lbl < 0) if only_unknown else has
            lbl = np.where(upd, cnt.argmax(1), lbl)
        return lbl

    # Espejo en X: la camara de referencia solo ve un costado y la figura es
    # casi simetrica, salvo la mano que sostiene la barbilla.
    CELL = 0.02
    grid = {}
    for i, c in enumerate(co):
        grid.setdefault((int(c[0] // CELL), int(c[1] // CELL), int(c[2] // CELL)), []).append(i)
    for i in range(n):
        if labels[i] >= 0:
            continue
        m = (-co[i][0], co[i][1], co[i][2])
        g = (int(m[0] // CELL), int(m[1] // CELL), int(m[2] // CELL))
        best, bd = -1, CELL
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    for j in grid.get((g[0] + dx, g[1] + dy, g[2] + dz), ()):
                        if labels[j] < 0:
                            continue
                        d = sum((co[j][k] - m[k]) ** 2 for k in range(3)) ** 0.5
                        if d < bd:
                            best, bd = j, d
        if best >= 0:
            labels[i] = labels[best]

    # Lo que sigue sin etiqueta se rellena desde los vecinos, por la superficie:
    # asi el sillon en sombra hereda del sillon y no del pantalon que roza.
    for _ in range(400):
        if not (labels < 0).any():
            break
        labels = vote(labels, 1, only_unknown=True)
    labels[labels < 0] = CHANDAL

    z, yy = co[:, 2], co[:, 1]
    # La nuca. La referencia mira de frente y del pelo solo ve el flequillo y
    # los costados, asi que por detras la propagacion extiende piel donde hay
    # pelo. La cabeza va de z=1.06 a z=1.80 y el frente es -Y. Se corrige solo
    # lo que la camara no vio, que deja intacto lo que si.
    labels[(~seen) & (labels == PIEL) & ((z > 1.66) | ((yy > 0.20) & (z > 1.42)))] = PELO
    # El portatil es una tabla, no una manga. En la referencia la tapa se
    # solapa con el antebrazo que la sujeta; en 3D no hay duda, porque la losa
    # esta delante (y < -0.33) y el brazo detras (y > -0.05), sin nada enmedio.
    labels[(labels == PORTATIL) & (yy > -0.25)] = CHANDAL

    labels = vote(labels, 3)

    # Componentes conexas: una mancha de sillon sobre una rodilla es una
    # componente pequena y el sillon de verdad es una grande. Las pequenas se
    # reasignan a lo que las rodea. Esto es lo que quita los brillos azulados
    # del chandal que por color parecian tapiceria.
    order = np.argsort(np.concatenate([ea, eb]), kind="stable")
    flat_a = np.concatenate([ea, eb])[order]
    flat_b = np.concatenate([eb, ea])[order]
    start = np.zeros(n + 1, np.int64)
    np.cumsum(np.bincount(flat_a, minlength=n), out=start[1:])

    for _ in range(8):
        visited = np.zeros(n, bool)
        changed = 0
        for s in range(n):
            if visited[s]:
                continue
            lab = labels[s]
            comp, stack = [], [s]
            visited[s] = True
            while stack:
                v = stack.pop(); comp.append(v)
                for w in flat_b[start[v]:start[v + 1]]:
                    if not visited[w] and labels[w] == lab:
                        visited[w] = True; stack.append(w)
            if len(comp) >= max(80, (labels == lab).sum() * 0.15):
                continue
            cs = set(comp)
            border = np.zeros(K, np.int64)
            for v in comp:
                for w in flat_b[start[v]:start[v + 1]]:
                    if w not in cs:
                        border[labels[w]] += 1
            if border.sum():
                labels[comp] = int(border.argmax()); changed += len(comp)
        if not changed:
            break

    return vote(labels, 2)


def face_labels(vlab, faces, adj):
    """Region por cara: mayoria de sus vertices, y luego suavizado entre caras."""
    flab = np.array([np.bincount(vlab[f], minlength=K).argmax() for f in faces])
    nbf = np.full((len(flab), 3), -1, np.int32)
    for i, ns in enumerate(adj):
        for k, j in enumerate(ns[:3]):
            nbf[i, k] = j
    for _ in range(6):
        cnt = np.zeros((len(flab), K), np.int32)
        for k in range(3):
            ok = nbf[:, k] >= 0
            np.add.at(cnt, (np.nonzero(ok)[0], flab[nbf[ok, k]]), 1)
        own = cnt[np.arange(len(flab)), flab]
        # Un diente de sierra es una cara que casi no tiene vecinos de su region
        # y si de otra. Las fronteras buenas, con mayoria a los dos lados, no se
        # mueven.
        flab = np.where((own <= 1) & (cnt.max(1) >= 2), cnt.argmax(1), flab)
    return flab


# ---------------------------------------------------------------------------
# 4. Materiales y exportacion
# ---------------------------------------------------------------------------

def apply_materials(me, flab):
    me.materials.clear()
    for r in REGIONS:
        m = bpy.data.materials.new(r)
        m.use_nodes = True
        bsdf = m.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = linear_rgba(PALETTE[r])
        bsdf.inputs["Roughness"].default_value = ROUGHNESS[r]
        bsdf.inputs["Metallic"].default_value = 0.0
        me.materials.append(m)
    me.polygons.foreach_set("material_index", flab.tolist())
    me.update()


def export(ob, path):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_apply=False,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
    )


# ---------------------------------------------------------------------------
# 5. El render de respaldo
# ---------------------------------------------------------------------------

def render_poster(ob, path, width=439, height=900):
    """Repite el encuadre de la web y guarda el WebP que sustituye al modelo.

    Lo ve quien no llega al 3D: movil, puntero grueso, `prefers-reduced-motion`
    y navegadores sin WebGL. Las dimensiones no se tocan porque el `<img>` del
    hero las declara y cambiarlas moveria el layout.
    """
    scene = bpy.context.scene
    bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    center = sum(bb, Vector()) / 8
    size = Vector((max(c.x for c in bb) - min(c.x for c in bb),
                   max(c.y for c in bb) - min(c.y for c in bb),
                   max(c.z for c in bb) - min(c.z for c in bb)))

    # Los mismos numeros que `avatar-scene.ts`: alto normalizado a 2, campo de
    # vision de 30 grados y el aire de FRAMING alrededor.
    TARGET_H, FOV, FRAMING = 2.0, 30.0, 1.04
    scale = TARGET_H / size.z
    ob.scale = (scale, scale, scale)
    ob.location = -center * scale
    bpy.context.view_layer.update()
    radius = math.hypot(size.x * scale, size.y * scale) / 2

    big = 4
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = width * big
    scene.render.resolution_y = height * big
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"

    world = bpy.data.worlds.new("fondo")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.0

    for o in [o for o in bpy.data.objects if o.type == "LIGHT"]:
        bpy.data.objects.remove(o, do_unlink=True)

    def sun(name, energy, direction):
        d = bpy.data.lights.new(name, "SUN")
        d.energy, d.angle = energy, math.radians(12)
        o = bpy.data.objects.new(name, d)
        scene.collection.objects.link(o)
        o.rotation_euler = (-Vector(direction).normalized()).to_track_quat("-Z", "Y").to_euler()

    # El equivalente de las luces de la escena. Los ejes de Three —Y arriba, Z
    # hacia el espectador— pasan a los de Blender: (x, y, z) -> (x, -z, y).
    sun("key", 3.0, (2.4, -3.0, 3.2))
    sun("rim", 2.4, (-2.0, 2.6, 1.8))
    sun("fill", 1.0, (-1.5, -1.0, 1.0))

    data = bpy.data.cameras.new("poster")
    data.lens = 18 / math.tan(math.radians(FOV) / 2)
    data.sensor_width = 36
    cam = bpy.data.objects.new("poster", data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    vfov = math.radians(FOV)
    hfov = 2 * math.atan(math.tan(vfov / 2) * (width / height))
    dist = max(TARGET_H / 2 / math.tan(vfov / 2) + radius,
               radius / math.tan(hfov / 2) + radius) * FRAMING
    cam.location = Vector((0, -dist, 0))
    cam.rotation_euler = Vector((0, -1, 0)).to_track_quat("Z", "Y").to_euler()

    tmp = os.path.join(os.path.dirname(path), "_poster_tmp")
    scene.render.filepath = tmp
    bpy.ops.render.render(write_still=True)

    img = Image.open(tmp + ".png").convert("RGBA")
    bbox = img.split()[3].point(lambda p: 255 if p > 8 else 0).getbbox()
    fig = img.crop(bbox)
    # Se encaja centrado en el lienzo de siempre en vez de reescalar a la
    # fuerza: la proporcion de la figura no es exactamente la del `<img>`.
    ratio = min(width / fig.width, height / fig.height)
    fig = fig.resize((max(1, int(fig.width * ratio)), max(1, int(fig.height * ratio))),
                     Image.LANCZOS)
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    canvas.paste(fig, ((width - fig.width) // 2, (height - fig.height) // 2))
    canvas.save(path, "WEBP", quality=88, method=6)
    os.remove(tmp + ".png")


# ---------------------------------------------------------------------------

def main():
    labelmap, ref_alpha = build_labelmap(REF)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB)
    ob = [o for o in bpy.data.objects if o.type == "MESH"][0]
    me = ob.data

    scene = bpy.context.scene
    cam = setup_camera(scene, ob)
    tmpdir = os.path.dirname(GLB)
    labels, co = project(scene, ob, cam, labelmap, ref_alpha, tmpdir)
    print(f"proyectados {int((labels >= 0).sum())} de {len(labels)} vertices", flush=True)
    os.remove(os.path.join(tmpdir, "silueta.png"))

    bm = bmesh.new(); bm.from_mesh(me)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    edges = np.array([[e.verts[0].index, e.verts[1].index] for e in bm.edges], np.int32)
    faces = np.array([[v.index for v in f.verts] for f in bm.faces], np.int32)
    adj = [[] for _ in range(len(bm.faces))]
    for e in bm.edges:
        lf = [f.index for f in e.link_faces]
        for a in lf:
            for b in lf:
                if a != b:
                    adj[a].append(b)
    bm.free()

    vlab = clean(labels, co, edges)
    flab = face_labels(vlab, faces, adj)
    for i, r in enumerate(REGIONS):
        print(f"  {r:10} {(flab == i).sum():6d} caras  {(flab == i).sum() * 100 / len(flab):5.2f}%")

    apply_materials(me, flab)
    bpy.data.objects.remove(cam, do_unlink=True)
    export(ob, GLB)
    print("GLB:", GLB, os.path.getsize(GLB) // 1024, "KB", flush=True)

    render_poster(ob, POSTER)
    print("WebP:", POSTER, os.path.getsize(POSTER) // 1024, "KB", flush=True)


main()
