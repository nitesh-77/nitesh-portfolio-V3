import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createResidualScene(canvas: HTMLCanvasElement, onSelect: (layer: number) => void) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x181a1b, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.minPolarAngle = 0.65;
  controls.maxPolarAngle = 1.65;
  controls.minAzimuthAngle = -0.95;
  controls.maxAzimuthAngle = 0.95;
  const assembly = new THREE.Group();
  scene.add(assembly);
  scene.add(new THREE.HemisphereLight(0xe3edf4, 0x7184a4, 2));
  const key = new THREE.DirectionalLight(0xf0f4ff, 2.5);
  key.position.set(-3, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd7e1ee, 2);
  rim.position.set(5, 2, -4);
  scene.add(rim);
  const metal = new THREE.MeshStandardMaterial({
    color: 0x7890ad,
    metalness: 0.08,
    roughness: 0.7,
  });
  const selectedMaterial = new THREE.MeshStandardMaterial({
    color: 0x3569d4,
    metalness: 0.05,
    roughness: 0.65,
  });
  const frozenMaterial = new THREE.MeshStandardMaterial({
    color: 0x7185a0,
    metalness: 0.05,
    roughness: 0.7,
  });
  const stream = new THREE.MeshStandardMaterial({
    color: 0x3569d4,
    roughness: 0.65,
    metalness: 0.05,
  });
  const blockGeometry = new THREE.BoxGeometry(0.12, 1.3, 1.65);
  const residualMaterial = new THREE.MeshBasicMaterial({ color: 0x7cceef });
  const pathMaterial = new THREE.LineBasicMaterial({
    color: 0x7cceef,
    transparent: true,
    opacity: 0.45,
  });
  const frames: THREE.Mesh[] = [];
  const outputs: THREE.Mesh[] = [];
  const outputGeometry = new THREE.SphereGeometry(0.024, 10, 10);
  const xAt = (layer: number) => -3.3 + (layer - 1) * 0.235;
  for (let layer = 1; layer <= 28; layer++) {
    const block = new THREE.Mesh(blockGeometry, metal);
    block.position.x = xAt(layer);
    block.userData.layer = layer;
    assembly.add(block);
    frames.push(block);
    const output = new THREE.Mesh(outputGeometry, residualMaterial);
    output.position.set(xAt(layer) + 0.14, 0.05, 1.08);
    assembly.add(output);
    outputs.push(output);
    const connection = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xAt(layer) + 0.14, 0.05, 0.82),
      output.position,
    ]);
    assembly.add(new THREE.Line(connection, pathMaterial));
  }
  function tube(points: THREE.Vector3[], radius = 0.025) {
    return new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 60, radius, 8, false),
      stream,
    );
  }
  const laneStart = new THREE.Vector3(-4.1, 0.05, 1.08),
    laneEnd = new THREE.Vector3(3.55, 0.05, 1.08);
  assembly.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.LineCurve3(laneStart, laneEnd), 1, 0.025, 8, false),
      residualMaterial,
    ),
  );
  const tail = new THREE.CatmullRomCurve3([
    laneEnd,
    new THREE.Vector3(3.9, 0.05, 0.8),
    new THREE.Vector3(4.12, 0.05, 0.1),
  ]);
  assembly.add(new THREE.Mesh(new THREE.TubeGeometry(tail, 30, 0.025, 8, false), residualMaterial));
  const directionGeometry = new THREE.ConeGeometry(0.055, 0.15, 12);
  directionGeometry.rotateZ(-Math.PI / 2);
  for (const x of [-3.8, 0.05, 3.55]) {
    const arrow = new THREE.Mesh(directionGeometry, residualMaterial);
    arrow.position.set(x, 0.05, 1.08);
    assembly.add(arrow);
  }
  const selectedStatePoint = new THREE.Vector3();
  const teacher = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.85, 1.15), frozenMaterial);
  teacher.position.set(4.12, 0, 0);
  assembly.add(teacher);
  const teacherEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(teacher.geometry),
    new THREE.LineBasicMaterial({ color: 0x536987 }),
  );
  teacher.add(teacherEdge);
  const probeMaterial = new THREE.MeshStandardMaterial({
    color: 0xc66d60,
    metalness: 0.05,
    roughness: 0.7,
  });
  const probe = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.22, 0.72), probeMaterial);
  probe.position.set(2.15, -1.8, 1.15);
  assembly.add(probe);
  probe.add(
    new THREE.LineSegments(
      new THREE.EdgesGeometry(probe.geometry),
      new THREE.LineBasicMaterial({ color: 0xb84c3d }),
    ),
  );
  const norm = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 32), frozenMaterial);
  norm.rotation.y = Math.PI / 2;
  norm.position.set(1.35, -1.8, 1.15);
  assembly.add(norm);
  const capture = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), stream);
  assembly.add(capture);
  let branch = tube([
    new THREE.Vector3(),
    new THREE.Vector3(1, -1, 1),
    new THREE.Vector3(1.35, -1.8, 1.15),
  ]);
  assembly.add(branch);
  assembly.add(
    tube([
      new THREE.Vector3(1.35, -1.8, 1.15),
      new THREE.Vector3(2.15, -1.8, 1.15),
      new THREE.Vector3(3, -1.8, 1.15),
    ]),
  );
  const anchors = [
    {
      element: document.querySelector<HTMLElement>('[data-anchor="state"]'),
      point: selectedStatePoint,
    },
    {
      element: document.querySelector<HTMLElement>('[data-anchor="input"]'),
      point: new THREE.Vector3(-4.1, -0.25, 1.08),
    },
    {
      element: document.querySelector<HTMLElement>('[data-anchor="stream"]'),
      point: new THREE.Vector3(-1.9, -0.5, 1.08),
    },
    {
      element: document.querySelector<HTMLElement>('[data-anchor="teacher"]'),
      point: new THREE.Vector3(4.1, 1.1, 0),
    },
    {
      element: document.querySelector<HTMLElement>('[data-anchor="norm"]'),
      point: new THREE.Vector3(1.2, -1.28, 1.15),
    },
    {
      element: document.querySelector<HTMLElement>('[data-anchor="probe"]'),
      point: new THREE.Vector3(2.15, -2.65, 1.15),
    },
  ];
  let selected = 22;
  function select(layer: number) {
    if (selected === layer && capture.position.x === xAt(layer) + 0.14) return;
    selected = layer;
    frames.forEach((block, index) => {
      block.material = index + 1 === selected ? selectedMaterial : metal;
      block.position.y = index + 1 === selected ? 0.12 : 0;
    });
    outputs.forEach((output, index) => output.scale.setScalar(index + 1 === layer ? 2 : 1));
    const x = xAt(layer) + 0.14;
    capture.position.set(x, 0.05, 1.08);
    selectedStatePoint.set(x, 1.15, 1.08);
    assembly.remove(branch);
    branch.geometry.dispose();
    branch = tube([
      capture.position.clone(),
      new THREE.Vector3(x, -0.9, 1.45),
      new THREE.Vector3(x * 0.65 + 0.4, -1.8, 1.45),
      new THREE.Vector3(1.35, -1.8, 1.15),
    ]);
    assembly.add(branch);
  }
  function reset() {
    camera.position.set(9, 6.6, 13.5);
    controls.target.set(0, -0.7, 0);
    controls.update();
  }
  reset();
  select(22);
  const project = new THREE.Vector3();
  function positionLabels() {
    for (const anchor of anchors) {
      if (!anchor.element) continue;
      project.copy(anchor.point).project(camera);
      const halfWidth = anchor.element.offsetWidth / 2;
      const x = Math.max(
        halfWidth + 4,
        Math.min(canvas.clientWidth - halfWidth - 4, ((project.x + 1) / 2) * canvas.clientWidth),
      );
      const y = Math.max(
        20,
        Math.min(canvas.clientHeight - 52, ((1 - project.y) / 2) * canvas.clientHeight),
      );
      anchor.element.style.left = `${x}px`;
      anchor.element.style.top = `${y}px`;
    }
  }
  function resize() {
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 600 ? 49 : 32;
    camera.zoom = width < 600 ? 1.65 : 1.6;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    positionLabels();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downX = 0,
    downY = 0;
  const events = new AbortController();
  canvas.addEventListener(
    'pointerdown',
    (event) => {
      downX = event.clientX;
      downY = event.clientY;
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    'pointerup',
    (event) => {
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > 6) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(frames)[0];
      if (hit && typeof hit.object.userData.layer === 'number') onSelect(hit.object.userData.layer);
    },
    { signal: events.signal },
  );
  let visible = true;
  const intersection = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
  });
  intersection.observe(canvas);
  let frameId = 0;
  function render() {
    frameId = requestAnimationFrame(render);
    if (!visible || document.hidden) return;
    controls.update();
    renderer.render(scene, camera);
    positionLabels();
  }
  render();
  setTheme('dark');
  function setTheme(theme: 'light' | 'dark') {
    const isDark = theme === 'dark';
    metal.color.set(isDark ? 0x526070 : 0x7890ad);
    frozenMaterial.color.set(isDark ? 0x687582 : 0x7185a0);
    selectedMaterial.color.set(isDark ? 0x7cceef : 0x3569d4);
    stream.color.copy(selectedMaterial.color);
    pathMaterial.color.copy(selectedMaterial.color);
    residualMaterial.color.copy(selectedMaterial.color);
    probeMaterial.color.set(isDark ? 0xe5a28f : 0xc66d60);
    renderer.toneMappingExposure = isDark ? 1.1 : 1.35;
  }
  return {
    select,
    reset,
    setTheme,
    dispose() {
      cancelAnimationFrame(frameId);
      events.abort();
      observer.disconnect();
      intersection.disconnect();
      controls.dispose();
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materials.add(material);
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
    },
  };
}
