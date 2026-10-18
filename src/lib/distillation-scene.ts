import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
type PlaybackMode = 'paused' | 'playing';
type Point = [number, number, number];
type Layout = {
  input: number;
  norm1: number;
  slot: number;
  sum1: number;
  norm2: number;
  mlp: number;
  sum2: number;
  output: number;
};
export interface SceneController {
  readonly progress: number;
  readonly mode: PlaybackMode;
  dispose(): void;
}
export function createDistillationScene(host: HTMLElement): SceneController {
  const canvasElement = host.querySelector('[data-scene]');
  const sliderElement = host.querySelector('[data-progress]');
  const playElement = host.querySelector('[data-play]');
  const resetElement = host.querySelector('[data-reset]');
  const phaseElement = host.querySelector('[data-phase]');
  if (
    !(canvasElement instanceof HTMLCanvasElement) ||
    !(sliderElement instanceof HTMLInputElement) ||
    !(playElement instanceof HTMLButtonElement) ||
    !(resetElement instanceof HTMLButtonElement) ||
    !(phaseElement instanceof HTMLElement)
  )
    throw new Error('Incomplete replacement figure');
  const canvas = canvasElement,
    slider = sliderElement,
    play = playElement,
    resetButton = resetElement,
    phase = phaseElement;
  const events = new AbortController();
  const textures = new Set<THREE.Texture>();
  let disposed = false,
    visible = true;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x181a1b, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, 0.1, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = false;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.6;
  controls.minAzimuthAngle = -0.75;
  controls.maxAzimuthAngle = 0.85;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7a7e7b, 2.0));
  const light = new THREE.DirectionalLight(0xffffff, 2.0);
  light.position.set(-4, 8, 7);
  scene.add(light);
  const rig = new THREE.Group();
  scene.add(rig);
  const assembly = new THREE.Group();
  rig.add(assembly);
  const palette = {
    surface: 0xc3c7c4,
    face: 0xe0e0d9,
    blue: 0x78bfd8,
    coral: 0xe9a391,
    edge: 0x4e5859,
    line: 0xa3b0b3,
  };
  const material = (color: number) => new THREE.MeshLambertMaterial({ color });
  const gray = material(palette.surface),
    white = material(palette.face),
    blue = material(palette.blue),
    coral = material(palette.coral);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: palette.edge,
    transparent: true,
    opacity: 0.85,
  });
  const pathMaterial = new THREE.MeshBasicMaterial({ color: palette.line });
  const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (x: number) => {
    x = clamp(x);
    return x * x * (3 - 2 * x);
  };
  let progress = 0,
    mode: PlaybackMode = 'paused',
    previous = 0,
    raf = 0;
  function solid(geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Group) {
    const mesh = new THREE.Mesh(geometry, mat);
    parent.add(mesh);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 35), edgeMaterial);
    parent.add(edge);
    return mesh;
  }
  function roundedShape(w: number, d: number, r = 0.12) {
    const shape = new THREE.Shape(),
      x = -w / 2,
      z = -d / 2;
    shape.moveTo(x + r, z);
    shape.lineTo(x + w - r, z);
    shape.quadraticCurveTo(x + w, z, x + w, z + r);
    shape.lineTo(x + w, z + d - r);
    shape.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
    shape.lineTo(x + r, z + d);
    shape.quadraticCurveTo(x, z + d, x, z + d - r);
    shape.lineTo(x, z + r);
    shape.quadraticCurveTo(x, z, x + r, z);
    return shape;
  }
  function extruded(shape: THREE.Shape, depth = 0.09) {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.014,
      bevelThickness: 0.012,
      curveSegments: 20,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -depth / 2, 0);
    return geometry;
  }
  function mark(parent: THREE.Group, label: string, width = 2.1, depth = 0.9) {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#374044';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${label.length > 3 ? '108px Arial' : 'italic 138px Georgia'}`;
    ctx.fillText(label, 384, 128);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.065;
    parent.add(mesh);
    return mesh;
  }
  function plate(width: number, depth: number, mat: THREE.Material, label: string) {
    const group = new THREE.Group();
    solid(extruded(roundedShape(width, depth)), mat, group);
    if (label) mark(group, label, width * 0.72, depth * 0.65);
    assembly.add(group);
    return group;
  }
  const input = plate(2.6, 1.5, gray, 'h');
  const output = plate(2.6, 1.5, gray, 'h′');
  function norm() {
    const group = new THREE.Group(),
      shape = new THREE.Shape();
    shape.absarc(0, 0, 0.66, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.44, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    solid(extruded(shape, 0.065), white, group);
    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from(
          { length: 80 },
          (_, i) =>
            new THREE.Vector3(
              Math.cos((i / 80) * Math.PI * 2) * 0.55,
              0.041,
              Math.sin((i / 80) * Math.PI * 2) * 0.55,
            ),
        ),
      ),
      edgeMaterial,
    );
    group.add(line);
    assembly.add(group);
    return group;
  }
  const norm1 = norm(),
    norm2 = norm();
  const attention = plate(2.85, 1.7, blue, 'Attention');
  const hyena = plate(2.85, 1.7, coral, 'Hyena');
  const mlp = new THREE.Group();
  function trapezoid(front: number, back: number, d: number, depth: number) {
    const shape = new THREE.Shape();
    shape.moveTo(-front / 2, -d / 2);
    shape.lineTo(front / 2, -d / 2);
    shape.lineTo(back / 2, d / 2);
    shape.lineTo(-back / 2, d / 2);
    shape.closePath();
    return extruded(shape, depth);
  }
  const mlpLower = new THREE.Group();
  solid(trapezoid(2.65, 3.35, 1.65, 0.08), white, mlpLower);
  mlp.add(mlpLower);
  const mlpUpper = new THREE.Group();
  solid(trapezoid(3.35, 2.65, 1.65, 0.08), gray, mlpUpper);
  mlpUpper.position.y = 0.14;
  mlp.add(mlpUpper);
  const label = mark(mlpUpper, 'MLP', 2.1, 0.9);
  if (label) label.position.y = 0.06;
  assembly.add(mlp);
  const parts = { input, output, norm1, norm2, attention, hyena, mlp };
  const junctions: THREE.Group[] = [];
  for (let i = 0; i < 2; i++) {
    const group = new THREE.Group();
    solid(new THREE.SphereGeometry(0.085, 20, 12), white, group);
    assembly.add(group);
    junctions.push(group);
  }
  const paths = new THREE.Group();
  assembly.add(paths);
  function path(points: Point[], radius = 0.018) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      'centripetal',
    );
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 70, radius, 6, false), pathMaterial);
    paths.add(mesh);
    return mesh;
  }
  let pathKey = '';
  function rebuildPaths(y: Layout) {
    const key = Object.values(y)
      .map((v) => v.toFixed(3))
      .join(',');
    if (key === pathKey) return;
    pathKey = key;
    clearLines(paths);
    const front = 1.13;
    path(
      [
        [0, y.input, 0],
        [0, y.norm1, 0],
        [0, y.slot, 0],
        [0, y.sum1, 0],
        [0, y.norm2, 0],
        [0, y.mlp, 0],
        [0, y.sum2, 0],
        [0, y.output, 0],
      ],
      0.016,
    );
    path(
      [
        [0, y.input, 0],
        [-1.55, y.input, front],
        [-1.96, y.input + 0.15, front],
        [-1.96, y.sum1 - 0.15, front],
        [-1.55, y.sum1, front],
        [0, y.sum1, 0],
      ],
      0.023,
    );
    path(
      [
        [0, y.sum1, 0],
        [1.55, y.sum1, front],
        [1.96, y.sum1 + 0.15, front],
        [1.96, y.sum2 - 0.15, front],
        [1.55, y.sum2, front],
        [0, y.sum2, 0],
      ],
      0.023,
    );
  }
  const model = new THREE.Group();
  rig.add(model);
  const frozenMaterial = material(0x62747b);
  const frozenGeometry = extruded(roundedShape(2.01, 1.05, 0.075), 0.085);
  const frozenEdges = new THREE.EdgesGeometry(frozenGeometry, 35);
  const frozenEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x42565f });
  const blockCenters = Array.from({ length: 28 }, (_, i) => -2.7 + i * 0.2);
  for (let i = 0; i < 28; i++) {
    if (i === 2) continue;
    const g = new THREE.Group();
    g.userData.block = i + 1;
    g.add(new THREE.Mesh(frozenGeometry, frozenMaterial));
    g.add(new THREE.LineSegments(frozenEdges, frozenEdgeMaterial));
    g.position.y = blockCenters[i];
    model.add(g);
  }
  const capGeometry = extruded(roundedShape(2.18, 1.2), 0.09);
  for (const y of [-2.97, 3.05, 3.23]) {
    const g = new THREE.Group();
    solid(capGeometry, gray, g);
    g.position.y = y;
    model.add(g);
  }
  const gapBox = new THREE.BoxGeometry(2.05, 0.14, 1.09);
  const gapGeometry = new THREE.EdgesGeometry(gapBox);
  gapBox.dispose();
  const gapMaterial = new THREE.LineBasicMaterial({
    color: 0x7cceef,
    transparent: true,
    opacity: 0.7,
  });
  const gapOutline = new THREE.LineSegments(gapGeometry, gapMaterial);
  gapOutline.position.y = blockCenters[2];
  model.add(gapOutline);
  const guides = new THREE.Group();
  rig.add(guides);
  const guideMaterial = new THREE.LineDashedMaterial({
    color: 0x8fadb8,
    transparent: true,
    opacity: 0.28,
    dashSize: 0.07,
    gapSize: 0.055,
  });
  const leaders = new THREE.Group();
  rig.add(leaders);
  const leaderMaterial = new THREE.LineBasicMaterial({
    color: 0x819093,
    transparent: true,
    opacity: 0.6,
  });
  function clearLines(group: THREE.Group) {
    for (const child of [...group.children]) {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) child.geometry.dispose();
      group.remove(child);
    }
  }
  function updateLabels(y: Layout, opening: number, swapped: boolean, pull: number) {
    const mobile = canvas.clientWidth < 600;
    clearLines(leaders);
    const config: [string, Point, Point, boolean][] = [
      ['input', [-1.32, y.input, 0], [-2.4, y.input - 0.05, 0], false],
      ['norm1', [-0.66, y.norm1, 0], [-2.4, y.norm1, 0], false],
      ['slot', [-1.43, y.slot, 0], [-2.4, y.slot, 0], false],
      ['norm2', [0.66, y.norm2, 0], [2.45, y.norm2, 0], true],
      ['mlp', [1.67, y.mlp, 0], [2.45, y.mlp + 0.08, 0], true],
      ['output', [1.32, y.output, 0], [2.45, y.output + 0.05, 0], true],
      ['skip', [1.96, (y.sum1 + y.sum2) / 2, 1.13], [3.7, y.mlp + 0.35, 1.13], true],
    ];
    for (const [name, start, end, right] of config) {
      const e = host.querySelector<HTMLElement>(`[data-part="${name}"]`);
      if (!e) continue;
      const startPoint = assembly.localToWorld(new THREE.Vector3(...start));
      const endPoint = assembly.localToWorld(new THREE.Vector3(...end));
      const p = endPoint.clone().project(camera),
        opacity = smooth((opening - 0.12) / 0.6);
      e.style.opacity = String(opacity);
      const desired = ((p.x + 1) / 2) * canvas.clientWidth + (right ? 8 : -e.offsetWidth - 8);
      e.style.left = `${clamp(desired, 4, canvas.clientWidth - e.offsetWidth - 4)}px`;
      e.style.top = `${clamp(((1 - p.y) / 2) * canvas.clientHeight, 18, canvas.clientHeight - 18)}px`;
      e.style.transform = 'translateY(-50%)';
      if (mobile && name === 'skip') {
        e.style.opacity = '0';
        continue;
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          rig.worldToLocal(startPoint),
          rig.worldToLocal(endPoint),
        ]),
        leaderMaterial,
      );
      line.visible = opacity > 0.1;
      leaders.add(line);
    }
    const slot = host.querySelector<HTMLElement>('[data-part="slot"]');
    if (slot) {
      slot.style.color = swapped ? '#f1a28d' : '#7cceef';
      slot.innerHTML = swapped
        ? 'Hyena<small>Fitted replacement</small>'
        : 'Attention<small>Original module</small>';
    }
    const positions: Record<string, Point> = {
      name: [0, 4.2, 0],
      selected: [-1.28, blockCenters[2], 0.6],
      input: [0, -3.75, 0],
      output: [2.9, 3.23, 0],
    };
    for (const [name, point] of Object.entries(positions)) {
      const e = host.querySelector<HTMLElement>(`[data-model-label="${name}"]`);
      if (!e) continue;
      const p = model.localToWorld(new THREE.Vector3(...point)).project(camera),
        half = e.offsetWidth / 2;
      e.style.left = `${clamp((p.x + 1) * 0.5 * canvas.clientWidth, half + 4, canvas.clientWidth - half - 4)}px`;
      e.style.top = `${clamp((1 - p.y) * 0.5 * canvas.clientHeight, 12, canvas.clientHeight - 20)}px`;
      e.style.opacity = mobile && pull > 0.2 && ['input', 'output'].includes(name) ? '0' : '1';
      if (name === 'selected') e.style.color = swapped ? '#f1a28d' : '#7cceef';
    }
  }
  function updateGuides(y: Layout, pull: number) {
    clearLines(guides);
    if (pull < 0.1) return;
    const ports: Point[] = [
      [-0.86, blockCenters[2] - 0.07, 0.5],
      [-0.86, blockCenters[2] + 0.07, 0.5],
    ];
    const ends: Point[] = [
      [-1.15, y.input, 0],
      [-1.15, y.output, 0],
    ];
    for (let i = 0; i < 2; i++) {
      const a = rig.worldToLocal(model.localToWorld(new THREE.Vector3(...ports[i])));
      const b = rig.worldToLocal(assembly.localToWorld(new THREE.Vector3(...ends[i])));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), guideMaterial);
      line.computeLineDistances();
      guides.add(line);
    }
  }
  function pose() {
    if (disposed || !visible || document.hidden) return;
    const pull = smooth((progress - 0.02) / 0.14) * (1 - smooth((progress - 0.9) / 0.1));
    const opening = smooth((progress - 0.16) / 0.14) * (1 - smooth((progress - 0.82) / 0.08));
    const mobile = canvas.clientWidth < 600;
    model.position.set(
      mobile ? -3.4 + 0.9 * pull : -3.4,
      mobile ? 1.6 * pull : -0.6 * pull,
      mobile ? -0.65 - 0.15 * pull : -0.65,
    );
    const modelScale = mobile ? 1 - 0.55 * pull : 1;
    model.scale.setScalar(modelScale);
    rig.position.set(4 * (1 - pull), 0, 0.65 * (1 - pull));
    const home = new THREE.Vector3(0, blockCenters[2], 0)
      .multiplyScalar(modelScale)
      .add(model.position);
    const target = new THREE.Vector3(mobile ? 1.5 : 3.5, mobile ? -0.65 : 0, mobile ? 0.7 : 1);
    assembly.position.copy(home).lerp(target, pull);
    const expanded = mobile ? 0.92 : 1;
    assembly.scale.set(
      THREE.MathUtils.lerp(0.6 * modelScale, expanded, opening),
      THREE.MathUtils.lerp(0.045 * modelScale, expanded, opening),
      THREE.MathUtils.lerp(0.6 * modelScale, expanded, opening),
    );
    const gap = 0.32 + opening * 0.64;
    const y = {
      input: -3.05 * gap,
      norm1: -2.12 * gap,
      slot: -1.13 * gap,
      sum1: -0.36 * gap,
      norm2: 0.28 * gap,
      mlp: 1.28 * gap,
      sum2: 2.2 * gap,
      output: 2.85 * gap,
    };
    for (const name of ['input', 'norm1', 'norm2', 'mlp', 'output'] satisfies (keyof typeof parts &
      keyof Layout)[])
      parts[name].position.y = y[name];
    parts.attention.position.set(-smooth((progress - 0.4) / 0.15) * 4, y.slot, 0);
    parts.hyena.position.set((1 - smooth((progress - 0.57) / 0.18)) * 4, y.slot, 0);
    parts.attention.visible = progress < 0.55;
    parts.hyena.visible = progress >= 0.55;
    junctions[0].position.set(0, y.sum1, 0);
    junctions[1].position.set(0, y.sum2, 0);
    rebuildPaths(y);
    const swapped = progress >= 0.55;
    gapMaterial.color.setHex(swapped ? 0xe9a391 : 0x7cceef);
    gapMaterial.opacity = 0.5 + 0.35 * pull;
    const w = canvas.clientWidth,
      h = canvas.clientHeight,
      halfHeight = mobile ? 4.9 : 3.8 + 0.65 * pull;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.left = (-halfHeight * w) / h;
    camera.right = (halfHeight * w) / h;
    camera.updateProjectionMatrix();
    rig.updateMatrixWorld(true);
    updateLabels(y, opening, swapped, pull);
    updateGuides(y, pull);
    phase.textContent =
      progress < 0.025
        ? 'Qwen · 28 decoder blocks'
        : progress < 0.16
          ? 'Pull out block 3'
          : progress < 0.3
            ? 'Open the third decoder block'
            : progress < 0.4
              ? 'Attention inside block 3'
              : progress < 0.55
                ? 'Remove attention'
                : progress < 0.75
                  ? 'Insert the fitted Hyena module'
                  : progress < 0.82
                    ? 'Hyena in the same slot'
                    : progress < 0.9
                      ? 'Close block 3'
                      : progress < 0.99
                        ? 'Return block 3 to Qwen'
                        : 'Qwen with one attention module replaced';
    canvas.dataset.progress = String(progress);
    canvas.dataset.module = swapped ? 'hyena' : 'attention';
    canvas.dataset.blocks = '28';
    canvas.dataset.frozenBlocks = '27';
    canvas.dataset.selectedBlock = '3';
    canvas.dataset.detached = String(pull > 0.05);
    renderer.render(scene, camera);
  }
  function resize() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    pose();
  }
  function reset() {
    camera.position.set(7.1, 5.3, 9);
    controls.target.set(0.6, 0, 0);
    controls.update();
    pose();
  }
  controls.addEventListener('change', pose);
  function stop() {
    mode = 'paused';
    cancelAnimationFrame(raf);
    raf = 0;
    previous = 0;
    play.textContent = '▶';
    play.setAttribute('aria-label', 'Play replacement animation');
  }
  function animate(now: number) {
    if (mode !== 'playing' || disposed || !visible || document.hidden) return;
    const dt = previous ? Math.min(0.04, (now - previous) / 1000) : 0;
    previous = now;
    progress = Math.min(1, progress + dt / 9);
    slider.value = String(progress);
    pose();
    if (progress >= 1) stop();
    else raf = requestAnimationFrame(animate);
  }
  play.addEventListener(
    'click',
    () => {
      if (mode === 'playing') {
        stop();
        return;
      }
      if (!visible || document.hidden) return;
      if (progress >= 1) progress = 0;
      mode = 'playing';
      previous = 0;
      play.textContent = 'Ⅱ';
      play.setAttribute('aria-label', 'Pause replacement animation');
      raf = requestAnimationFrame(animate);
    },
    { signal: events.signal },
  );
  slider.addEventListener(
    'input',
    () => {
      stop();
      const value = Number(slider.value);
      progress = Number.isFinite(value) ? clamp(value) : 0;
      pose();
    },
    { signal: events.signal },
  );
  resetButton.addEventListener('click', reset, { signal: events.signal });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) stop();
      else pose();
    },
    { signal: events.signal },
  );
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const visibilityObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      visible = entry.isIntersecting;
      if (!visible) stop();
      else resize();
    }
  });
  visibilityObserver.observe(host);
  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    events.abort();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    controls.removeEventListener('change', pose);
    controls.dispose();
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>([
        gray,
        white,
        blue,
        coral,
        edgeMaterial,
        pathMaterial,
        frozenMaterial,
        frozenEdgeMaterial,
        gapMaterial,
        guideMaterial,
        leaderMaterial,
      ]);
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        if (Array.isArray(object.material))
          object.material.forEach((value) => materials.add(value));
        else materials.add(object.material);
      }
    });
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    textures.forEach((value) => value.dispose());
    renderer.dispose();
    host.dataset.ready = 'false';
    slider.disabled = true;
    play.disabled = true;
    resetButton.disabled = true;
  }
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      dispose();
    },
    { signal: events.signal },
  );
  try {
    reset();
    resize();
  } catch (error) {
    dispose();
    throw error;
  }
  host.dataset.ready = 'true';
  slider.disabled = false;
  play.disabled = false;
  resetButton.disabled = false;
  return {
    get progress() {
      return progress;
    },
    get mode() {
      return mode;
    },
    dispose,
  };
}
