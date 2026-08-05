import {
    THREE,
    createScene,
    startRendering,
    stopRendering,
    type SceneHandle,
} from "./renderer";
import { playKeySound } from "./key-sound";
import { KEYCAP_ICONS } from "virtual:keycap-icons";

/**
 * Teclado mecánico interactivo que representa el stack.
 *
 * La silueta es lo que hace que se lea como un teclado y no como una rejilla de
 * cubos: la tecla es un rectángulo redondeado extruido, con bisel y con la cara
 * de arriba más pequeña que la de abajo —eso es un keycap—, y la placa es otro
 * rectángulo redondeado. Sin ese estrechamiento hacia arriba no hay teclado que
 * valga, por muy buena que sea la luz.
 *
 * El movimiento es un muelle amortiguado, no una interpolación lineal: la tecla
 * se pasa del reposo al volver y se asienta. Con un lerp se nota de plástico
 * inmediatamente.
 *
 * El listado de tecnologías NO vive aquí. Está en el HTML, siempre, lo pinte
 * esta escena o no: es contenido del portfolio y no puede quedarse encerrado en
 * un canvas donde ni un rastreador ni un lector de pantalla llegan.
 */

/** Lo que viene del HTML: del logo sólo el slug, que es lo que pesa poco. */
export interface Keycap {
    name: string;
    keycap: string;
    key: string | null;
    icon: string | null;
}

type KeycapIcon = (typeof KEYCAP_ICONS)[string];

// --- Medidas de la tecla ---
const CAP_SIZE = 0.4;
const CAP_HEIGHT = 0.28;
/** Cuánto se estrecha la cara superior respecto a la base de la tecla. */
const CAP_TOP_SCALE = 0.78;
const SPACING = 0.42;
const BASE_HEIGHT = 0.26;
const ICON_SIZE = CAP_SIZE * CAP_TOP_SCALE * 0.78;
/** Teclas por fila. Las que sobran se reparten para no dejar una fila coja. */
const COLUMNS = 5;

// Constantes del muelle. `STIFFNESS` manda en lo rápido que sube y `DAMPING` en
// cuánto rebota: bajarlo hace que la tecla oscile más antes de asentarse.
const STIFFNESS = 260;
const DAMPING = 14;
const TRAVEL = 0.15;

// --- Pose de la placa ---
// Isométrica: el giro lo lleva el grupo, no la cámara, que se queda quieta
// mirando al centro. Así el encuadre no depende del tamaño del contenedor.
// Casi de frente y con poco giro, que es como se ve la placa entera: las teclas
// miran al visitante en vez de escaparse en diagonal, y la silueta sale apaisada,
// que es lo que permite repartir el ancho con el texto de al lado.
const YAW = 0;
const PITCH = Math.PI * 0.3;
const ROLL = Math.PI * 0.13;

/** Dónde se planta el centro de la placa, en coordenadas de pantalla (-1..1). */
const SIDE = 0;
/** Cuánto del ancho y del alto del canvas llega a ocupar. */
const FILL_X = 0.96;
const FILL_Y = 0.92;

// --- Giro con el ratón ---
const DRAG_SPEED = 0.006;
/** Cuánto hay que mover el puntero para que deje de ser un clic y sea un giro. */
const DRAG_THRESHOLD = 5;
/** Tope de inclinación: pasado esto se ve la placa por debajo y pierde la gracia. */
const PITCH_MIN = -0.15;
const PITCH_MAX = 1.35;
/** Lo rápido que se frena el giro al soltar. */
const SPIN_DECAY = 4;

interface KeyState {
    /** La tecla entera: cuerpo y logo se mueven juntos. */
    group: THREE.Group;
    material: THREE.MeshPhysicalMaterial;
    /** Desplazamiento respecto al reposo, negativo cuando está hundida. */
    offset: number;
    velocity: number;
    /** Objetivo actual: 0 en reposo, -TRAVEL mientras está pulsada. */
    target: number;
    data: Keycap;
    index: number;
    mesh: THREE.Mesh;
}

export interface KeyboardScene extends SceneHandle {
    /** Anuncia qué tecnología se ha activado, para el texto de apoyo. */
    onActivate?: (name: string) => void;
}

export function createKeyboardScene(container: HTMLElement, keycaps: Keycap[]): KeyboardScene {
    const { scene, camera, renderer, destroy: destroyBase } = createScene({
        container,
        fov: 22,
        cameraPosition: [0, 3.4, 11],
        filmic: true,
    });
    camera.lookAt(0, 0, 0);

    // --- Luz ---
    // Poca ambiente y una direccional fuerte desde arriba-izquierda: es lo que
    // da el contraste de "cara de arriba iluminada, laterales en sombra" que
    // hace que cada tecla se vea como un volumen. La hemisférica sólo evita que
    // las caras bajas se vayan a negro puro.
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-5, 8, 3);
    scene.add(sun);

    // Cielo y suelo neutros: cualquier tinte aquí se cuela en las caras en
    // sombra de las teclas y rompe la escala de grises por la puerta de atrás.
    scene.add(new THREE.HemisphereLight(0xf2f2f2, 0x141414, 0.25));

    // Reflejos del plástico. Se genera aquí, sin descargar ningún HDR: son
    // cuatro paneles blancos alrededor, que es de donde salen los brillos
    // suaves de las teclas.
    const environment = createStudioEnvironment(renderer);
    scene.environment = environment;
    scene.environmentIntensity = 0.25;

    // --- Reparto en filas ---
    // Repartido a partes iguales, no rellenando filas hasta que sobra: con 13
    // teclas y filas de 5, la última se quedaría con tres sueltas.
    const rows = Math.max(1, Math.ceil(keycaps.length / COLUMNS));
    const rowSizes: number[] = [];
    let remaining = keycaps.length;
    for (let row = 0; row < rows; row += 1) {
        const size = Math.ceil(remaining / (rows - row));
        rowSizes.push(size);
        remaining -= size;
    }

    // La placa va en dos grupos: el de fuera lleva la pose y la escala, el de
    // dentro sólo existe para poder centrar el conjunto en el origen. Sin ese
    // centrado el teclado cuelga hacia abajo, porque las teclas están todas por
    // encima de la base.
    const board = new THREE.Group();
    board.rotation.order = "YXZ";
    const content = new THREE.Group();
    board.add(content);
    scene.add(board);

    const baseWidth = Math.max(...rowSizes) * SPACING + 0.3;
    const baseDepth = rows * SPACING + 0.16;

    const baseGeometry = roundedBox(baseWidth, baseDepth, BASE_HEIGHT, 0.12, 0.02, 1);
    const base = new THREE.Mesh(
        baseGeometry,
        // Mate y sin clearcoat: la placa tiene que quedarse detrás de las teclas,
        // no competir con ellas por los brillos. El gris es medio a propósito:
        // por encima se confunde con los keycaps blancos y por debajo se pierde
        // contra el fondo de la página.
        new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.6, metalness: 0 }),
    );
    content.add(base);

    // --- Teclas ---
    const capGeometry = roundedBox(CAP_SIZE, CAP_SIZE, CAP_HEIGHT, 0.05, 0.012, CAP_TOP_SCALE);
    const capY = BASE_HEIGHT / 2 + CAP_HEIGHT / 2 + 0.005;
    const states: KeyState[] = [];
    const textures: THREE.Texture[] = [];

    // Índice de la primera tecla de cada fila, para colocar sin recalcular.
    const rowStarts = rowSizes.reduce<number[]>(
        (acc, size, index) => [...acc, (acc[index] ?? 0) + size],
        [0],
    );

    keycaps.forEach((data, index) => {
        const row = rowStarts.findIndex((start) => start > index) - 1;
        const column = index - rowStarts[row]!;
        const itemsInRow = rowSizes[row]!;

        const group = new THREE.Group();
        group.position.set(
            (column - (itemsInRow - 1) / 2) * SPACING,
            capY,
            (row - (rows - 1) / 2) * SPACING,
        );
        content.add(group);

        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            roughness: 0.32,
            metalness: 0,
            clearcoat: 0.5,
            clearcoatRoughness: 0.18,
            emissive: 0xffffff,
            emissiveIntensity: 0.3,
        });

        const mesh = new THREE.Mesh(capGeometry, material);
        group.add(mesh);

        // Un slug que el plugin no conociese habría roto el build; si aun así
        // llegase vacío, la tecla se queda con su texto en vez de en blanco.
        const icon = data.icon ? KEYCAP_ICONS[data.icon] : undefined;
        const texture = icon ? iconTexture(icon) : textTexture(data.keycap);
        textures.push(texture);

        const face = new THREE.Mesh(
            new THREE.PlaneGeometry(ICON_SIZE, ICON_SIZE),
            new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                depthWrite: false,
                // Sin tone mapping: los colores de marca son los que son, y
                // pasados por el filmico salen lavados.
                toneMapped: false,
            }),
        );
        face.position.y = CAP_HEIGHT / 2 + 0.0015;
        face.rotation.x = -Math.PI / 2;
        // El logo no participa en el raycast: quien recibe el ratón es la tecla.
        face.raycast = () => {};
        group.add(face);

        states.push({ group, material, mesh, offset: 0, velocity: 0, target: 0, data, index });
    });

    // --- Encaje en el contenedor ---
    // La cámara no se mueve: lo que se ajusta es la escala de la placa. Así el
    // ángulo isométrico es el mismo en una franja ancha y baja que en un
    // contenedor alto, y sólo cambia el tamaño.
    //
    // El encaje se hace proyectando las ocho esquinas de la caja a coordenadas
    // de pantalla, no con una esfera envolvente: la placa es plana y va en
    // diagonal, así que su esfera es enorme comparada con lo que de verdad
    // ocupa, y ajustar por ella deja el teclado a media escala.
    const localBox = new THREE.Box3().setFromObject(content);
    const center = localBox.getCenter(new THREE.Vector3());
    // Centrado en el origen, que es a donde mira la cámara: las teclas están
    // todas por encima de la base y sin esto el conjunto cuelga hacia abajo.
    content.position.sub(center);

    const corners: THREE.Vector3[] = [];
    for (const x of [localBox.min.x, localBox.max.x]) {
        for (const y of [localBox.min.y, localBox.max.y]) {
            for (const z of [localBox.min.z, localBox.max.z]) {
                corners.push(new THREE.Vector3(x, y, z).sub(center));
            }
        }
    }

    board.rotation.set(PITCH, YAW, ROLL);

    const projected = new THREE.Vector3();

    const rescale = () => {
        camera.updateMatrixWorld();
        board.updateMatrixWorld(true);

        let extentX = 0;
        let extentY = 0;
        for (const corner of corners) {
            projected.copy(corner).applyMatrix4(board.matrixWorld).project(camera);
            extentX = Math.max(extentX, Math.abs(projected.x));
            extentY = Math.max(extentY, Math.abs(projected.y));
        }
        if (extentX === 0 || extentY === 0) return;

        // Manda el alto, que es lo que escasea en una franja ancha. El ancho
        // sólo entra como tope, y contando con que la placa va a un lado: al
        // desplazarla queda menos sitio de ese lado que del otro.
        const roomX = (1 - Math.abs(SIDE)) * FILL_X;
        board.scale.multiplyScalar(Math.min(FILL_Y / extentY, roomX / extentX));
    };

    /** Lleva la placa a su lado de la pantalla, en horizontal. */
    const placeSide = () => {
        camera.updateMatrixWorld();
        // Cuánto se mueve en pantalla por cada unidad de mundo. La cámara no
        // gira en Y, así que la relación es lineal y basta con dos puntos.
        const origin = new THREE.Vector3(0, 0, 0).project(camera);
        const unit = new THREE.Vector3(1, 0, 0).project(camera);
        const perUnit = unit.x - origin.x;
        if (perUnit !== 0) board.position.x = (SIDE - origin.x) / perUnit;
    };

    let lastWidth = 0;
    let lastHeight = 0;

    const fit = () => {
        const { clientWidth, clientHeight } = renderer.domElement;
        if (clientWidth === 0 || clientHeight === 0) return;
        if (clientWidth === lastWidth && clientHeight === lastHeight) return;
        lastWidth = clientWidth;
        lastHeight = clientHeight;

        // Se mide con la placa centrada, y se aparta después: si no, el propio
        // desplazamiento contaría como tamaño y la encogería.
        board.position.x = 0;
        // Dos pasadas: la escala no es lineal en pantalla —hay perspectiva de
        // por medio—, así que la primera se queda cerca y la segunda afina.
        rescale();
        rescale();
        placeSide();
    };

    fit();

    // --- Interacción ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handle: KeyboardScene = { scene, camera, renderer, destroy: () => {} };

    /** Teclas hundidas ahora mismo, y por qué: ratón, clic o tecla física. */
    let hovered: KeyState | null = null;

    const press = (state: KeyState) => {
        if (state.target !== 0) return;
        state.target = -TRAVEL;
        // Un empujón inicial a la velocidad: sin él el muelle arranca demasiado
        // blando y la pulsación se siente con retardo.
        state.velocity = -6;
        playKeySound(state.index);
        handle.onActivate?.(state.data.name);
    };

    const release = (state: KeyState) => {
        state.target = 0;
    };

    const stateAt = (event: PointerEvent): KeyState | undefined => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(
            states.map((s) => s.mesh),
            false,
        )[0];
        return hit ? states.find((s) => s.mesh === hit.object) : undefined;
    };

    // --- Giro ---
    // La placa se puede orientar arrastrando. Convive con el hover mirando
    // cuánto se ha movido el puntero: hasta el umbral sigue siendo un clic, y a
    // partir de ahí es un giro y se sueltan las teclas para no dejar ninguna
    // hundida a mitad del arrastre.
    let yaw = YAW;
    let pitch = PITCH;
    let yawSpin = 0;
    let pitchSpin = 0;
    let dragging = false;
    let dragDistance = 0;
    let lastX = 0;
    let lastY = 0;
    /** Objetivo al que volver tras un doble clic; `null` mientras no lo haya. */
    let restoring: { yaw: number; pitch: number } | null = null;

    const isDragging = () => dragging && dragDistance > DRAG_THRESHOLD;

    const updateCursor = () => {
        renderer.domElement.style.cursor = dragging
            ? "grabbing"
            : hovered
              ? "pointer"
              : "grab";
    };

    const releaseAll = () => {
        states.forEach(release);
        hovered = null;
    };

    // Pasar el ratón por encima hunde la tecla, como en la referencia. El clic
    // se mantiene porque en táctil no hay hover que valga: ahí el `pointerdown`
    // es lo único que llega.
    const onPointerMove = (event: PointerEvent) => {
        if (dragging) {
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            lastX = event.clientX;
            lastY = event.clientY;
            dragDistance += Math.abs(dx) + Math.abs(dy);

            if (!isDragging()) return;

            // Girar cancela lo que hubiese en marcha: la vuelta al sitio del
            // doble clic y cualquier tecla que se hubiese quedado hundida.
            restoring = null;
            if (hovered) releaseAll();

            yaw += dx * DRAG_SPEED;
            pitch = clamp(pitch + dy * DRAG_SPEED, PITCH_MIN, PITCH_MAX);
            // Se guarda el último empujón para que al soltar siga un poco.
            yawSpin = dx * DRAG_SPEED * 12;
            pitchSpin = dy * DRAG_SPEED * 12;
            return;
        }

        const state = stateAt(event);
        if (state === hovered) return;
        if (hovered) release(hovered);
        hovered = state ?? null;
        if (hovered) press(hovered);
        updateCursor();
    };

    const onPointerLeave = () => {
        if (hovered) release(hovered);
        hovered = null;
        updateCursor();
    };

    const onPointerDown = (event: PointerEvent) => {
        dragging = true;
        dragDistance = 0;
        lastX = event.clientX;
        lastY = event.clientY;
        yawSpin = 0;
        pitchSpin = 0;
        // Con el puntero capturado el giro sigue aunque se salga del canvas.
        // Puede fallar si el puntero ya no está activo, y perder la captura no
        // es motivo para perder el gesto entero.
        try {
            renderer.domElement.setPointerCapture(event.pointerId);
        } catch {
            // Se gira igual, sólo que soltando fuera del canvas se corta.
        }
        updateCursor();

        // En táctil no hay hover previo que haya hundido la tecla, así que la
        // hunde el propio toque. Con ratón ya está hundida desde el hover.
        if (event.pointerType !== "mouse") {
            const state = stateAt(event);
            if (state) press(state);
        }
    };

    const onPointerUp = (event: PointerEvent) => {
        if (dragging) {
            dragging = false;
            try {
                renderer.domElement.releasePointerCapture(event.pointerId);
            } catch {
                // No había captura que soltar.
            }
            updateCursor();
        }

        // Se sueltan todas menos la que el ratón sigue tocando: si no, al
        // levantar el dedo del clic la tecla de debajo del cursor daría un
        // salto y volvería a bajar.
        states.forEach((state) => {
            if (state !== hovered) release(state);
        });
    };

    /** Doble clic: la placa vuelve a su pose de partida. */
    const onDoubleClick = () => {
        restoring = { yaw: YAW, pitch: PITCH };
        yawSpin = 0;
        pitchSpin = 0;
    };

    // Teclas físicas: mientras la escena está a la vista, pulsar la letra de una
    // tecnología hunde su tecla. Se marca el body para que los atajos de la
    // página no disparen a la vez sobre las mismas letras.
    const pressedKeys = new Set<string>();

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
        const pressedKey = event.key.toLowerCase();
        const state = states.find((s) => s.data.key === pressedKey);
        if (!state) return;
        // Sólo se traga la tecla si de verdad corresponde a una tecnología: el
        // resto del teclado sigue funcionando con normalidad.
        event.preventDefault();
        pressedKeys.add(pressedKey);
        press(state);
    };

    const onKeyUp = (event: KeyboardEvent) => {
        const releasedKey = event.key.toLowerCase();
        if (!pressedKeys.delete(releasedKey)) return;
        const state = states.find((s) => s.data.key === releasedKey);
        if (state && state !== hovered) release(state);
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("dblclick", onDoubleClick);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    updateCursor();

    let elapsed = 0;

    handle.update = (delta) => {
        // Se acota el paso: al volver a una pestaña en segundo plano el delta
        // puede ser enorme y el muelle explotaría.
        const step = Math.min(delta, 1 / 30);
        elapsed += step;

        for (const state of states) {
            const displacement = state.offset - state.target;
            const acceleration = -STIFFNESS * displacement - DAMPING * state.velocity;
            state.velocity += acceleration * step;
            state.offset += state.velocity * step;
            state.group.position.y = capY + state.offset;
        }

        fit();

        if (!dragging) {
            // Inercia: al soltar sigue girando un poco y se frena. Sin esto el
            // arrastre se siente pegado.
            yaw += yawSpin * step;
            pitch = clamp(pitch + pitchSpin * step, PITCH_MIN, PITCH_MAX);
            const decay = Math.exp(-SPIN_DECAY * step);
            yawSpin *= decay;
            pitchSpin *= decay;

            if (restoring) {
                const k = 1 - Math.pow(0.001, step);
                yaw += (restoring.yaw - yaw) * k;
                pitch += (restoring.pitch - pitch) * k;
                if (Math.abs(restoring.yaw - yaw) < 0.002) restoring = null;
            }
        }

        // Respiración: un balanceo mínimo y muy lento sobre la orientación que
        // tenga la placa. Lo justo para que la escena no parezca una imagen
        // fija; más que esto y el texto de al lado se hace incómodo de leer.
        board.rotation.y = yaw + Math.sin(elapsed * 0.31) * 0.025;
        board.rotation.x = pitch;
        board.position.y = Math.sin(elapsed * 0.6) * 0.04;
    };

    handle.destroy = () => {
        stopRendering(handle);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("dblclick", onDoubleClick);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        // Las texturas de los logos no las recoge el barrido de `createScene`:
        // ahí se liberan geometrías y materiales, no los mapas que cuelgan de
        // ellos.
        textures.forEach((texture) => texture.dispose());
        environment.dispose();
        destroyBase();
    };

    startRendering(handle);
    return handle;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Rectángulo redondeado extruido con bisel, y con la cara de arriba escalada.
 *
 * `topScale` es lo que convierte un ladrillo en un keycap: estrecha los
 * vértices según su altura, así que la tecla sale con las paredes inclinadas
 * hacia dentro.
 */
function roundedBox(
    width: number,
    depth: number,
    height: number,
    radius: number,
    bevel: number,
    topScale: number,
): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const w = width / 2;
    const d = depth / 2;
    const r = Math.min(radius, w, d);

    shape.moveTo(-w + r, -d);
    shape.lineTo(w - r, -d);
    shape.quadraticCurveTo(w, -d, w, -d + r);
    shape.lineTo(w, d - r);
    shape.quadraticCurveTo(w, d, w - r, d);
    shape.lineTo(-w + r, d);
    shape.quadraticCurveTo(-w, d, -w, d - r);
    shape.lineTo(-w, -d + r);
    shape.quadraticCurveTo(-w, -d, -w + r, -d);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        // El bisel se come altura por arriba y por abajo: se descuenta para que
        // la pieza mida lo que dice medir.
        depth: Math.max(0.001, height - 2 * bevel),
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 2,
        steps: 1,
        curveSegments: 12,
    });

    // La forma se extruye en Z; el teclado la quiere de pie y centrada.
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -height / 2 + bevel, 0);

    if (topScale !== 1) {
        const position = geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < position.count; i += 1) {
            const y = position.getY(i);
            const t = (y + height / 2) / height;
            const factor = THREE.MathUtils.lerp(1, topScale, t);
            position.setX(i, position.getX(i) * factor);
            position.setZ(i, position.getZ(i) * factor);
        }
        position.needsUpdate = true;
        // Obligatorio tras mover vértices: si no, la luz sigue calculándose
        // sobre las normales de la caja recta y las paredes se ven planas.
        geometry.computeVertexNormals();
    }

    return geometry;
}

/** Mapa de entorno de estudio: cuatro paneles blancos, sin descargar nada. */
function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
    const room = new THREE.Scene();
    const quad = new THREE.PlaneGeometry(1, 1);
    const materials: THREE.Material[] = [];

    const panel = (
        intensity: number,
        position: [number, number, number],
        rotation: [number, number, number],
        scale: [number, number],
    ) => {
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0xffffff).multiplyScalar(intensity),
            side: THREE.DoubleSide,
        });
        materials.push(material);

        const mesh = new THREE.Mesh(quad, material);
        mesh.position.set(...position);
        mesh.rotation.set(...rotation);
        mesh.scale.set(scale[0], scale[1], 1);
        room.add(mesh);
    };

    // Cenital ancho al fondo, dos laterales de relleno y un rebote por abajo.
    panel(1.1, [0, 6, -4], [0, 0, 0], [12, 6]);
    panel(0.7, [-6, 2, 2], [0, Math.PI / 2, 0], [6, 4]);
    panel(0.5, [6, 3, 1], [0, -Math.PI / 2, 0], [6, 4]);
    panel(0.35, [0, -4, 3], [Math.PI / 2, 0, 0], [8, 8]);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const target = pmrem.fromScene(room);

    pmrem.dispose();
    quad.dispose();
    materials.forEach((material) => material.dispose());

    return target.texture;
}

/** Logo de marca pintado en un canvas y usado como textura de la tecla. */
function iconTexture(icon: KeycapIcon): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);

    // Cada logo trae la caja en la que está dibujado —24 los de Simple Icons—:
    // se escala a algo menos de dos tercios de la tecla y se centra.
    const scale = Math.round(size * 0.62) / icon.size;
    ctx.translate(size / 2, size / 2);
    ctx.scale(scale, scale);
    ctx.translate(-icon.size / 2, -icon.size / 2);
    ctx.fillStyle = grayOf(icon.color);
    ctx.fill(new Path2D(icon.path));

    return finishTexture(canvas);
}

/**
 * El gris que le toca a un color de marca.
 *
 * No es un `grayscale()` a secas: convertido tal cual, un logo claro sobre una
 * tecla blanca se queda casi invisible. Se toma el brillo percibido y se
 * reparte en una banda que siempre contrasta contra el keycap, así que el logo
 * oscuro sigue siendo el más oscuro y el vivo pasa a gris medio, pero ninguno
 * de los dos desaparece.
 */
function grayOf(hex: string): string {
    const value = Number.parseInt(hex.slice(1), 16);
    const r = ((value >> 16) & 255) / 255;
    const g = ((value >> 8) & 255) / 255;
    const b = (value & 255) / 255;

    // Coeficientes de luminancia: el ojo ve el verde mucho más que el azul.
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const level = Math.round((0.1 + luminance * 0.4) * 255);

    return `rgb(${level}, ${level}, ${level})`;
}

/** Respaldo para las tecnologías sin logo: el texto corto de la tecla. */
function textTexture(text: string): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    // Oscuro, porque debajo hay una tecla blanca.
    ctx.fillStyle = "#1e1e1e";
    ctx.font = "700 76px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, size / 2, size / 2);

    return finishTexture(canvas);
}

function finishTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}
