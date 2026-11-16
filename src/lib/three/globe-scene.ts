import { THREE, createScene, startRendering, stopRendering } from "./renderer";

/**
 * El globo de Contacto: la tierra en puntos, mirando a Galicia, con la ruta
 * Ourense → A Coruña → Madrid dibujándose encima.
 *
 * La tierra sale de `globe-land.png` (ver `scripts/globe/make_globe.py`), una
 * máscara equirectangular de medio grado por píxel. Los puntos se colocan aquí,
 * con el paso en longitud ensanchándose hacia los polos para que no se apiñen.
 * Una esfera negra un pelo más pequeña tapa los puntos de la cara de atrás.
 */

export interface City {
    name: string;
    lat: number;
    lon: number;
}

export interface GlobeScene {
    destroy: () => void;
}

const RADIUS = 1;
const VIEW_LAT = 40;
const VIEW_LON = -6;

function toVector(lat: number, lon: number, radius = RADIUS): THREE.Vector3 {
    const φ = THREE.MathUtils.degToRad(lat);
    const λ = THREE.MathUtils.degToRad(lon);
    return new THREE.Vector3(
        radius * Math.cos(φ) * Math.sin(λ),
        radius * Math.sin(φ),
        radius * Math.cos(φ) * Math.cos(λ),
    );
}

export async function createGlobeScene(
    container: HTMLElement,
    maskSrc: string,
    cities: City[],
    labelLayer: HTMLElement,
): Promise<GlobeScene> {
    const mask = await readMask(maskSrc);

    const { scene, camera, renderer, destroy: destroyBase } = createScene({
        container,
        fov: 30,
        cameraPosition: [0, 0, 3.1],
    });

    const globe = new THREE.Group();
    globe.rotation.order = "XYZ";
    scene.add(globe);

    // --- Tierra en puntos ---
    const positions: number[] = [];
    const step = 0.9;
    for (let lat = -86; lat <= 86; lat += step) {
        const lonStep = step / Math.max(Math.cos(THREE.MathUtils.degToRad(lat)), 0.15);
        for (let lon = -180; lon < 180; lon += lonStep) {
            const px = Math.floor(((lon + 180) / 360) * (mask.width - 1));
            const py = Math.floor(((90 - lat) / 180) * (mask.height - 1));
            if (mask.data[(py * mask.width + px) * 4]! < 128) continue;
            const v = toVector(lat, lon);
            positions.push(v.x, v.y, v.z);
        }
    }
    const dots = new THREE.BufferGeometry();
    dots.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    globe.add(
        new THREE.Points(
            dots,
            new THREE.PointsMaterial({ color: 0xd8d8d8, size: 0.0085, sizeAttenuation: true }),
        ),
    );

    // Esfera de oclusión: negra, del color del fondo.
    globe.add(
        new THREE.Mesh(
            new THREE.SphereGeometry(RADIUS * 0.995, 64, 64),
            new THREE.MeshBasicMaterial({ color: 0x050505 }),
        ),
    );

    // Paralelos y meridianos, muy tenues: es lo que hace que se lea como globo
    // y no como un mapa plano curvado.
    const graticule = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06 });
    for (let lat = -60; lat <= 60; lat += 30) {
        const ring: THREE.Vector3[] = [];
        for (let lon = -180; lon <= 180; lon += 4) ring.push(toVector(lat, lon, RADIUS * 1.001));
        globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), graticule));
    }
    for (let lon = -180; lon < 180; lon += 30) {
        const ring: THREE.Vector3[] = [];
        for (let lat = -90; lat <= 90; lat += 4) ring.push(toVector(lat, lon, RADIUS * 1.001));
        globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), graticule));
    }

    // --- Ciudades y ruta ---
    const anchors = cities.map((city) => toVector(city.lat, city.lon, RADIUS * 1.002));
    const markerGeometry = new THREE.BoxGeometry(0.012, 0.012, 0.012);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const anchor of anchors) {
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(anchor);
        marker.lookAt(0, 0, 0);
        globe.add(marker);
    }

    const routePoints: THREE.Vector3[] = [];
    for (let i = 0; i < anchors.length - 1; i += 1) {
        const a = anchors[i]!;
        const b = anchors[i + 1]!;
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const lift = 1 + a.distanceTo(b) * 0.55;
        mid.setLength(RADIUS * lift);
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        routePoints.push(...curve.getPoints(48).slice(i === 0 ? 0 : 1));
    }
    const route = new THREE.BufferGeometry().setFromPoints(routePoints);
    route.setDrawRange(0, 0);
    globe.add(new THREE.Line(route, new THREE.LineBasicMaterial({ color: 0xffffff })));

    // Etiquetas en HTML: nítidas a cualquier tamaño y en la fuente de la web.
    const labels = cities.map((city) => {
        const el = document.createElement("span");
        el.className = "globe-label";
        el.textContent = city.name;
        labelLayer.appendChild(el);
        return el;
    });

    // --- Movimiento ---
    const baseY = -THREE.MathUtils.degToRad(VIEW_LON);
    const baseX = THREE.MathUtils.degToRad(VIEW_LAT);
    globe.rotation.set(baseX, baseY, 0);
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const world = new THREE.Vector3();
    const toCamera = new THREE.Vector3();
    let elapsed = 0;

    const update = (delta: number) => {
        elapsed += delta;
        // Un vaivén lento alrededor de Galicia más un poco de cursor: se mueve
        // lo justo para saberse vivo sin perder la península de vista.
        const swayY = Math.sin(elapsed * 0.25) * 0.18 + pointer.x * 0.12;
        const swayX = pointer.y * 0.06;
        globe.rotation.y += (baseY + swayY - globe.rotation.y) * Math.min(1, delta * 2);
        globe.rotation.x += (baseX + swayX - globe.rotation.x) * Math.min(1, delta * 2);

        const drawn = Math.min(routePoints.length, Math.floor(Math.max(0, elapsed - 0.4) * 70));
        route.setDrawRange(0, drawn);

        const { clientWidth: w, clientHeight: h } = container;
        anchors.forEach((anchor, i) => {
            world.copy(anchor).applyMatrix4(globe.matrixWorld);
            toCamera.copy(camera.position).sub(world);
            const facing = toCamera.dot(world) > 0;
            const projected = world.clone().project(camera);
            const label = labels[i]!;
            label.style.transform = `translate(${((projected.x + 1) / 2) * w}px, ${((1 - projected.y) / 2) * h}px)`;
            label.toggleAttribute("data-hidden", !facing);
        });
    };

    const handle = { scene, camera, renderer, update, destroy: () => {} };
    const visibility = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) startRendering(handle);
        else stopRendering(handle);
    });
    visibility.observe(container);

    return {
        destroy() {
            visibility.disconnect();
            stopRendering(handle);
            window.removeEventListener("pointermove", onPointerMove);
            labels.forEach((label) => label.remove());
            destroyBase();
        },
    };
}

async function readMask(src: string): Promise<ImageData> {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
