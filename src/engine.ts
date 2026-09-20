import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BRICK_TYPES, BrickType, COLORS, BRICK_GRID_UNIT } from './types';
import { playSnapSound, playRemoveSound, playRotateSound } from './audio';
import { createPlasticTextureMaps, createFloorTextures, createStudLogoBumpMap } from './textures';

export interface EngineCallbacks {
  onBrickCountChange: (count: number) => void;
  onCanUndoChange: (canUndo: boolean) => void;
  onStatusChange: (status: 'loading' | 'ready' | 'error', text?: string) => void;
  onHeightChange?: (height: number) => void;
  onEscape?: () => boolean;
}

// Creates a controlled moderate rounded box geometry (authentic LEGO proportions & visible seams)
function createRoundedBoxGeometry(
  w: number,
  h: number,
  l: number,
  radius = 0.024, // Subtle, authentic 24mm corner fillet (toned down from puffy 67mm)
  bevel = 0.007   // Crisp 7mm bevel creating visible parting line seams (spáry)
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hl = l / 2;
  const r = Math.max(0.005, Math.min(radius, hw - 0.01, hl - 0.01));

  shape.moveTo(-hw + r, -hl);
  shape.lineTo(hw - r, -hl);
  shape.quadraticCurveTo(hw, -hl, hw, -hl + r);
  shape.lineTo(hw, hl - r);
  shape.quadraticCurveTo(hw, hl, hw - r, hl);
  shape.lineTo(-hw + r, hl);
  shape.quadraticCurveTo(-hw, hl, -hw, hl - r);
  shape.lineTo(-hw, -hl + r);
  shape.quadraticCurveTo(-hw, -hl, -hw + r, -hl);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: Math.max(0.02, h - bevel * 2),
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 10,
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.rotateX(Math.PI / 2);
  geom.center();
  return geom;
}

export class BrickEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  
  private brickModelCache: Map<string, THREE.Group> = new Map();
  private defaultBrickModel: THREE.Group | null = null;
  private ghost: THREE.Group | null = null;
  private bricks: THREE.Group[] = [];
  private undoStack: THREE.Group[] = [];

  // Theme & Lighting references
  public currentTheme: 'dark' | 'light' = 'dark';
  public realisticFx: boolean = true;
  private floorMesh: THREE.Mesh | null = null;
  private grid05: THREE.GridHelper | null = null;
  private grid10: THREE.GridHelper | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private keyLight: THREE.DirectionalLight | null = null;
  private fillLight: THREE.DirectionalLight | null = null;
  private rimLight: THREE.DirectionalLight | null = null;

  // Postprocessing & Screen Space Ambient Occlusion (SSAO)
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private ssaoPass: SSAOPass | null = null;
  private outputPass: OutputPass | null = null;
  public ssaoEnabled: boolean = true;

  // Soft Dynamic Shadow System & Sunlight Angle
  public sunAngle: number = 65; // degrees (azimuth 0 - 360)
  public sunElevation: number = 42; // degrees (elevation 15 - 75)
  public dynamicSunOrbit: boolean = false;

  // Window event listeners for cleanup
  private onKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private onKeyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private onMouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private onMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private onMouseUpHandler: ((e: MouseEvent) => void) | null = null;
  private onWheelHandler: ((e: WheelEvent) => void) | null = null;

  // PBR Texture maps
  private plasticRoughnessMap: THREE.CanvasTexture | null = null;
  private plasticBumpMap: THREE.CanvasTexture | null = null;
  private studLogoBumpMap: THREE.CanvasTexture | null = null;
  
  // Real player eye height: 1.6m above floor.
  // 1x1 brick (3005) is 0.5m x 0.5m x 0.6m. Stacking 3 bricks = 1.8m (just above eye level)
  public readonly EYE_HEIGHT = 1.6;
  public playerHeight = 1.6;
  public minPlayerHeight = 0.6;
  public maxPlayerHeight = 16.0;

  private MOVE_SPEED = 0.08;
  private LOOK_SPEED = 0.003;
  
  public mode: 'BUILD' | 'ERASE' = 'BUILD';
  public colorIdx: number = 1;
  public rotation: number = 0; // 0, 1, 2, 3
  public brickTypeId: string = 'bb3005';
  public soundEnabled: boolean = true;
  
  private input = {
    forward: 0,
    side: 0,
    pitch: 0,
    yaw: 0,
    lastX: 0 as number | null,
    lastY: 0 as number | null,
  };
  
  private keysDown = new Set<string>();
  private isPointerLocked = false;
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private animationFrameId: number | null = null;
  private callbacks: EngineCallbacks;
  private isDestroyed = false;

  // Placement sparkling particle bursts
  private particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }[] = [];

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    
    // Scene setup with deep dark slate background and subtle crisp fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e17);
    this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.02);

    // Camera: Real human eye height (1.6m), standing 3.5m back
    const aspect = container.clientWidth / container.clientHeight || window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(70, aspect, 0.05, 500);
    this.camera.position.set(0, this.EYE_HEIGHT, 3.5);

    // Renderer: High precision with soft contact shadows and ACES filmic tonemapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true; // Realistic soft contact shadows
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    container.appendChild(this.renderer.domElement);

    // Setup Postprocessing Effect Composer with Screen Space Ambient Occlusion (SSAO)
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.ssaoPass = new SSAOPass(this.scene, this.camera, width, height);
    this.ssaoPass.kernelRadius = 0.38; // 38cm in world units: deep definition for brick crevices & studs
    this.ssaoPass.minDistance = 0.001; // Catch micro-gaps between bricks (6mm seam)
    this.ssaoPass.maxDistance = 0.22;
    this.ssaoPass.output = SSAOPass.OUTPUT.Default;

    this.composer.addPass(this.ssaoPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    // Studio IBL Environment reflections (PMREM Generator with RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    pmremGenerator.dispose();

    this.raycaster = new THREE.Raycaster();

    // High-contrast clean studio ambient lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x0a0e17, 0.85);
    this.scene.add(this.hemiLight);

    // Key directional light for crisp bevel highlights and soft contact shadows
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 80;
    this.keyLight.shadow.bias = -0.0003;
    this.keyLight.shadow.normalBias = 0.032; // Eliminates shadow acne and delivers solid contact shadows
    this.keyLight.shadow.radius = 2.4;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);
    this.updateSunPosition();

    // Secondary fill light for balanced contrast
    this.fillLight = new THREE.DirectionalLight(0x64748b, 0.45);
    this.fillLight.position.set(-10, 12, -8);
    this.scene.add(this.fillLight);

    // Studio rim light for crisp edge silhouettes against dark backdrop
    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.4);
    this.rimLight.position.set(-12, 16, -14);
    this.scene.add(this.rimLight);

    // Polished studio floor with subtle specular sheen and shadow reception
    const floorGeo = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x101622,
      roughness: 0.65, // Soft studio floor reflection
      metalness: 0.12,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.name = 'FLOOR';
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // Primary 0.5m grid (matching 1x1 brick width = 50cm)
    this.grid05 = new THREE.GridHelper(80, 160, 0x1e2738, 0x161e2e);
    this.grid05.position.y = 0.005;
    this.scene.add(this.grid05);

    // Major 1.0m grid with Emerald Green active accent line
    this.grid10 = new THREE.GridHelper(80, 80, 0x10b981, 0x223048);
    this.grid10.position.y = 0.007;
    (this.grid10.material as THREE.Material).opacity = 0.22;
    (this.grid10.material as THREE.Material).transparent = true;
    this.scene.add(this.grid10);

    // Setup input listeners
    this.setupWindowEvents();
    this.loadModelAndStart();
  }

  // Instant data initialization: generates procedural rounded bricks immediately
  private loadModelAndStart() {
    this.callbacks.onStatusChange('loading', 'INICIALIZACE MODELŮ...');
    
    // Procedurally pre-generate all rounded brick models instantaneously
    for (const b of BRICK_TYPES) {
      const procedural = this.generateProceduralBrickMesh(b);
      this.brickModelCache.set(b.id, procedural);
    }
    this.defaultBrickModel = this.brickModelCache.get('bb3005') || null;
    
    this.callbacks.onStatusChange('ready');
    this.updateGhost();
    this.animate();
  }

  public getBrickType(id: string): BrickType {
    const found = BRICK_TYPES.find((b) => b.id === id);
    return found || BRICK_TYPES[0];
  }

  // Generates procedural LEGO brick with moderated rounded corners, beveled seams (spáry) and realistic studs
  private generateProceduralBrickMesh(type: BrickType): THREE.Group {
    const group = new THREE.Group();
    const { normalMap, roughnessMap } = createPlasticTextureMaps();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.01,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: roughnessMap,
      flatShading: false,
    });

    // Realistic physical parting line / seam clearance (viditelné spáry mezi díly)
    // In real LEGO, parts are ~0.2mm narrower per 8mm module.
    // In our 0.5m module, 0.006m (6mm) creates authentic visible seams when stacked or placed side-by-side!
    const SEAM_CLEARANCE = 0.006;
    const VERTICAL_SEAM_CLEARANCE = 0.003;
    const bodyW = type.w - SEAM_CLEARANCE;
    const bodyL = type.l - SEAM_CLEARANCE;
    const bodyH = type.h - VERTICAL_SEAM_CLEARANCE;

    // Main rounded box body with moderated corner radius (0.024m) and crisp beveled edges (0.007m)
    const bodyGeo = createRoundedBoxGeometry(bodyW, bodyH, bodyL, 0.024, 0.007);
    const bodyMesh = new THREE.Mesh(bodyGeo, mat);
    bodyMesh.position.y = bodyH / 2 + VERTICAL_SEAM_CLEARANCE / 2;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Authentic studs with subtle rim bevel: 0.14m radius (28cm diameter), 0.085m height
    const studRadius = 0.14;
    const studHeight = 0.085;
    const studGeo = new THREE.CylinderGeometry(studRadius, studRadius, studHeight, 24);
    // Crisp subtle bevel rim on stud
    const studCapGeo = new THREE.CylinderGeometry(studRadius * 0.94, studRadius, 0.007, 24);

    const startX = -(type.w / 2) + BRICK_GRID_UNIT / 2;
    const startZ = -(type.l / 2) + BRICK_GRID_UNIT / 2;

    for (let x = 0; x < type.studsX; x++) {
      for (let z = 0; z < type.studsZ; z++) {
        const posX = startX + x * BRICK_GRID_UNIT;
        const posZ = startZ + z * BRICK_GRID_UNIT;
        const posY = type.h + studHeight / 2;

        const studMesh = new THREE.Mesh(studGeo, mat);
        studMesh.position.set(posX, posY, posZ);
        studMesh.castShadow = true;
        studMesh.receiveShadow = true;
        group.add(studMesh);

        const capMesh = new THREE.Mesh(studCapGeo, mat);
        capMesh.position.set(posX, type.h + studHeight + 0.0035, posZ);
        capMesh.castShadow = true;
        capMesh.receiveShadow = true;
        group.add(capMesh);
      }
    }

    return group;
  }

  private getModelForType(typeId: string): THREE.Group {
    if (this.brickModelCache.has(typeId)) {
      return this.brickModelCache.get(typeId)!;
    }
    const type = this.getBrickType(typeId);
    const procedural = this.generateProceduralBrickMesh(type);
    this.brickModelCache.set(typeId, procedural);
    return procedural;
  }

  public createBrick(colorHex: number, isGhost = false, rotation = 0, typeId = this.brickTypeId): THREE.Group {
    const group = new THREE.Group();
    const type = this.getBrickType(typeId);
    const baseModel = this.getModelForType(typeId);
    const model = baseModel.clone(true);
    const { normalMap, roughnessMap } = createPlasticTextureMaps();

    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh;
        if (isGhost) {
          mesh.material = new THREE.MeshBasicMaterial({
            color: this.mode === 'BUILD' ? 0x10b981 : 0xef4444, // Vibrant Emerald Green or Crimson
            transparent: true,
            opacity: 0.5,
          });
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        } else {
          // Flat high-contrast vibrant ABS injection-molded plastic with authentic hair scrap normal map
          mesh.material = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.22,
            metalness: 0.01,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(0.45, 0.45),
            roughnessMap: roughnessMap,
            flatShading: false,
          });
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
    });

    // Centering & base alignment
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.sub(center);
    model.position.y += type.h / 2;

    group.add(model);
    group.rotation.y = rotation * (Math.PI / 2);

    const isRotated = rotation % 2 !== 0;
    group.userData = {
      typeId: type.id,
      w: isRotated ? type.l : type.w,
      l: isRotated ? type.w : type.l,
      h: type.h,
    };

    return group;
  }

  // Dynamic theme switching between Dark (default) and Light
  public setTheme(theme: 'dark' | 'light') {
    this.currentTheme = theme;
    if (theme === 'dark') {
      this.scene.background = new THREE.Color(0x0a0e17);
      this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.02);
      if (this.floorMesh) {
        (this.floorMesh.material as THREE.MeshStandardMaterial).color.set(0x101622);
        (this.floorMesh.material as THREE.MeshStandardMaterial).roughness = this.realisticFx ? 0.65 : 0.88;
        (this.floorMesh.material as THREE.MeshStandardMaterial).metalness = this.realisticFx ? 0.12 : 0.05;
      }
      if (this.grid05) {
        (this.grid05.material as THREE.LineBasicMaterial).color.set(0x1e2738);
      }
      if (this.grid10) {
        (this.grid10.material as THREE.LineBasicMaterial).color.set(0x10b981);
        (this.grid10.material as THREE.Material).opacity = 0.22;
      }
      if (this.hemiLight) {
        this.hemiLight.color.set(0xffffff);
        this.hemiLight.groundColor.set(0x0a0e17);
        this.hemiLight.intensity = 0.85;
      }
      if (this.keyLight) {
        this.keyLight.color.set(0xffffff);
        this.keyLight.intensity = 1.25;
      }
      if (this.rimLight) {
        this.rimLight.color.set(0x93c5fd);
      }
    } else {
      this.scene.background = new THREE.Color(0xf1f5f9);
      this.scene.fog = new THREE.FogExp2(0xf1f5f9, 0.015);
      if (this.floorMesh) {
        (this.floorMesh.material as THREE.MeshStandardMaterial).color.set(0xe2e8f0);
        (this.floorMesh.material as THREE.MeshStandardMaterial).roughness = this.realisticFx ? 0.50 : 0.80;
        (this.floorMesh.material as THREE.MeshStandardMaterial).metalness = this.realisticFx ? 0.08 : 0.02;
      }
      if (this.grid05) {
        (this.grid05.material as THREE.LineBasicMaterial).color.set(0xcbd5e1);
      }
      if (this.grid10) {
        (this.grid10.material as THREE.LineBasicMaterial).color.set(0x059669);
        (this.grid10.material as THREE.Material).opacity = 0.25;
      }
      if (this.hemiLight) {
        this.hemiLight.color.set(0xffffff);
        this.hemiLight.groundColor.set(0xe2e8f0);
        this.hemiLight.intensity = 0.95;
      }
      if (this.keyLight) {
        this.keyLight.color.set(0xffffff);
        this.keyLight.intensity = 1.15;
      }
      if (this.rimLight) {
        this.rimLight.color.set(0x60a5fa);
      }
    }
  }

  // Toggle realistic scene effects (soft contact shadows, rim lighting, floor sheen)
  public setRealisticFx(enabled: boolean) {
    this.realisticFx = enabled;
    this.renderer.shadowMap.enabled = enabled;
    if (this.keyLight) {
      this.keyLight.castShadow = enabled;
    }
    if (this.rimLight) {
      this.rimLight.visible = enabled;
    }
    if (this.floorMesh) {
      const mat = this.floorMesh.material as THREE.MeshStandardMaterial;
      if (this.currentTheme === 'dark') {
        mat.roughness = enabled ? 0.65 : 0.88;
        mat.metalness = enabled ? 0.12 : 0.05;
      } else {
        mat.roughness = enabled ? 0.50 : 0.80;
        mat.metalness = enabled ? 0.08 : 0.02;
      }
      mat.needsUpdate = true;
    }
    this.updateSunPosition();
  }

  // Toggle Screen Space Ambient Occlusion (SSAO)
  public setSSAOEnabled(enabled: boolean) {
    this.ssaoEnabled = enabled;
  }

  // Set sunlight angle (azimuth 0 - 360 deg) and optional elevation (15 - 75 deg)
  public setSunAngle(angle: number, elevation?: number) {
    this.sunAngle = ((angle % 360) + 360) % 360;
    if (elevation !== undefined) {
      this.sunElevation = Math.max(15, Math.min(78, elevation));
    }
    this.updateSunPosition();
  }

  // Toggle continuous dynamic orbit of the sun
  public setDynamicSunOrbit(enabled: boolean) {
    this.dynamicSunOrbit = enabled;
  }

  // Calculates dynamic sunlight angle and automatically fits shadow frustum around bricks
  public updateSunPosition() {
    if (!this.keyLight) return;
    const radAzimuth = THREE.MathUtils.degToRad(this.sunAngle);
    const radElevation = THREE.MathUtils.degToRad(this.sunElevation);
    const distance = 32;

    const x = Math.cos(radAzimuth) * Math.cos(radElevation) * distance;
    const y = Math.max(7, Math.sin(radElevation) * distance);
    const z = Math.sin(radAzimuth) * Math.cos(radElevation) * distance;

    this.keyLight.position.set(x, y, z);

    // Calculate center of bricks to focus shadow camera and light target
    let targetX = 0;
    let targetY = 0.5;
    let targetZ = 0;

    if (this.bricks.length > 0) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (const b of this.bricks) {
        minX = Math.min(minX, b.position.x - b.userData.w / 2);
        maxX = Math.max(maxX, b.position.x + b.userData.w / 2);
        minY = Math.min(minY, b.position.y - b.userData.h / 2);
        maxY = Math.max(maxY, b.position.y + b.userData.h / 2);
        minZ = Math.min(minZ, b.position.z - b.userData.l / 2);
        maxZ = Math.max(maxZ, b.position.z + b.userData.l / 2);
      }

      targetX = (minX + maxX) / 2;
      targetY = (minY + maxY) / 2;
      targetZ = (minZ + maxZ) / 2;

      // Dynamically fit shadow frustum tightly around the build for maximum shadow sharpness
      const maxDim = Math.max(maxX - minX, maxZ - minZ, maxY - minY, 8);
      const halfSize = Math.max(8, (maxDim / 2) * 1.5 + 4);
      const cam = this.keyLight.shadow.camera;
      cam.left = -halfSize;
      cam.right = halfSize;
      cam.top = halfSize;
      cam.bottom = -halfSize;
      cam.near = 1;
      cam.far = distance * 2.2;
      cam.updateProjectionMatrix();
    } else {
      const cam = this.keyLight.shadow.camera;
      cam.left = -16;
      cam.right = 16;
      cam.top = 16;
      cam.bottom = -16;
      cam.near = 1;
      cam.far = distance * 2.2;
      cam.updateProjectionMatrix();
    }

    this.keyLight.target.position.set(targetX, targetY, targetZ);
    this.keyLight.target.updateMatrixWorld();

    // Secondary fill light position moves opposite to sun
    if (this.fillLight) {
      this.fillLight.position.set(-x * 0.6, 12, -z * 0.6);
    }
    // Rim light highlights brick edges from behind
    if (this.rimLight) {
      this.rimLight.position.set(-x * 0.8, 16, -z * 0.8);
    }

    // Dynamic sun warmth and intensity depending on sun elevation angle
    if (this.currentTheme === 'dark') {
      if (this.sunElevation < 30) {
        this.keyLight.color.set(0xffdfb8); // Warm sunrise/sunset
        this.keyLight.intensity = 1.12;
      } else {
        this.keyLight.color.set(0xffffff);
        this.keyLight.intensity = 1.25;
      }
    } else {
      if (this.sunElevation < 30) {
        this.keyLight.color.set(0xffeedd);
        this.keyLight.intensity = 1.05;
      } else {
        this.keyLight.color.set(0xffffff);
        this.keyLight.intensity = 1.15;
      }
    }
  }

  private checkCollision(pos: THREE.Vector3, w: number, l: number, h: number, exclude: THREE.Group | null = null): boolean {
    const margin = 0.04;
    const b1 = new THREE.Box3().setFromCenterAndSize(
      pos,
      new THREE.Vector3(Math.max(0.08, w - margin), Math.max(0.08, h - margin), Math.max(0.08, l - margin))
    );

    for (const b of this.bricks) {
      if (b === exclude) continue;
      const bw = b.userData.w;
      const bl = b.userData.l;
      const bh = b.userData.h;
      const b2 = new THREE.Box3().setFromCenterAndSize(
        b.position,
        new THREE.Vector3(Math.max(0.08, bw - margin), Math.max(0.08, bh - margin), Math.max(0.08, bl - margin))
      );
      if (b1.intersectsBox(b2)) return true;
    }
    return false;
  }

  // Calculate snapped coordinate for a given coordinate & dimension along grid step (0.5m)
  private snapToGrid(coord: number, dim: number): number {
    const studs = Math.round(dim / BRICK_GRID_UNIT);
    if (studs % 2 === 1) {
      // Odd number of studs (e.g. 1 stud = 0.5m): center sits at half-grid points (..., -0.75, -0.25, 0.25, 0.75, ...)
      return (Math.round((coord - 0.25) / BRICK_GRID_UNIT) * BRICK_GRID_UNIT) + 0.25;
    } else {
      // Even number of studs (e.g. 2 studs = 1.0m): center sits at whole grid steps (..., -1.0, -0.5, 0.0, 0.5, 1.0, ...)
      return Math.round(coord / BRICK_GRID_UNIT) * BRICK_GRID_UNIT;
    }
  }

  public performAction() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects([this.scene.getObjectByName('FLOOR')!, ...this.bricks], true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      let target: THREE.Object3D | null = hit.object;
      while (target && target.parent && target.parent !== this.scene && target.name !== 'FLOOR') {
        target = target.parent;
      }

      if (!target) return;

      if (this.mode === 'BUILD') {
        const activeColor = COLORS[this.colorIdx]?.hex ?? 0x007aff;
        const b = this.createBrick(activeColor, false, this.rotation, this.brickTypeId);
        
        const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
        const p = hit.point.clone().add(normal.clone().multiplyScalar(0.08));

        // Snap coordinates according to brick dimensions and 0.5m grid
        const snapX = this.snapToGrid(p.x, b.userData.w);
        const snapZ = this.snapToGrid(p.z, b.userData.l);
        let snapY: number;

        if (target.name === 'FLOOR') {
          snapY = b.userData.h / 2;
        } else {
          if (Math.abs(normal.y) > 0.5) {
            if (normal.y > 0) {
              snapY = target.position.y + target.userData.h / 2 + b.userData.h / 2;
            } else {
              snapY = target.position.y - target.userData.h / 2 - b.userData.h / 2;
            }
          } else {
            snapY = target.position.y;
          }
        }

        const finalPos = new THREE.Vector3(snapX, snapY, snapZ);
        if (!this.checkCollision(finalPos, b.userData.w, b.userData.l, b.userData.h)) {
          b.position.copy(finalPos);
          this.scene.add(b);
          this.bricks.push(b);
          this.undoStack.push(b);
          this.updateSunPosition();
          playSnapSound(this.soundEnabled);
          this.spawnPlacementParticles(finalPos, activeColor);
          this.callbacks.onBrickCountChange(this.bricks.length);
          this.callbacks.onCanUndoChange(this.undoStack.length > 0);
        }
      } else if (this.mode === 'ERASE' && target.name !== 'FLOOR') {
        const brickGroup = target as THREE.Group;
        this.scene.remove(brickGroup);
        this.bricks = this.bricks.filter((x) => x !== brickGroup);
        this.undoStack = this.undoStack.filter((x) => x !== brickGroup);
        this.updateSunPosition();
        playRemoveSound(this.soundEnabled);
        this.callbacks.onBrickCountChange(this.bricks.length);
        this.callbacks.onCanUndoChange(this.undoStack.length > 0);
      }
    }
  }

  // Sparkling placement particle burst
  private spawnPlacementParticles(pos: THREE.Vector3, colorHex: number) {
    const count = 10;
    const pGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const pMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.95 });

    for (let i = 0; i < count; i++) {
      const pMesh = new THREE.Mesh(pGeo, pMat.clone());
      pMesh.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.1) * 0.25,
        (Math.random() - 0.5) * 0.4
      ));
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.6 + 0.6,
        (Math.random() - 0.5) * 1.5
      );
      this.scene.add(pMesh);
      this.particles.push({ mesh: pMesh, vel, life: 0, maxLife: 0.4 });
    }
  }

  public undo() {
    const last = this.undoStack.pop();
    if (last) {
      this.scene.remove(last);
      this.bricks = this.bricks.filter((b) => b !== last);
      this.updateSunPosition();
      playRemoveSound(this.soundEnabled);
      this.callbacks.onBrickCountChange(this.bricks.length);
      this.callbacks.onCanUndoChange(this.undoStack.length > 0);
      this.updateGhost();
    }
  }

  public clearAll() {
    for (const b of this.bricks) {
      this.scene.remove(b);
    }
    this.bricks = [];
    this.undoStack = [];
    this.updateSunPosition();
    playRemoveSound(this.soundEnabled);
    this.callbacks.onBrickCountChange(0);
    this.callbacks.onCanUndoChange(false);
    this.updateGhost();
  }

  public rotate() {
    this.rotation = (this.rotation + 1) % 4;
    playRotateSound(this.soundEnabled);
    this.updateGhost();
  }

  public setMode(m: 'BUILD' | 'ERASE') {
    this.mode = m;
    this.updateGhost();
  }

  public setColorIdx(idx: number) {
    this.colorIdx = idx;
    this.updateGhost();
  }

  public setBrickType(typeId: string) {
    this.brickTypeId = typeId;
    this.updateGhost();
  }

  public elevate(delta: number) {
    this.playerHeight = Math.max(this.minPlayerHeight, Math.min(this.maxPlayerHeight, this.playerHeight + delta));
    if (this.callbacks.onHeightChange) {
      this.callbacks.onHeightChange(this.playerHeight);
    }
  }

  public resetCamera() {
    this.playerHeight = this.EYE_HEIGHT;
    if (this.callbacks.onHeightChange) {
      this.callbacks.onHeightChange(this.playerHeight);
    }
    this.camera.position.set(0, this.EYE_HEIGHT, 4.0);
    this.input.pitch = 0;
    this.input.yaw = 0;
    this.camera.quaternion.setFromEuler(new THREE.Euler(0, 0, 0, 'YXZ'));
  }

  public addBrickAt(pos: THREE.Vector3, typeId: string, colorIdx: number, rot = 0): THREE.Group {
    const color = COLORS[colorIdx] || COLORS[1];
    const b = this.createBrick(color.hex, false, rot, typeId);
    b.position.copy(pos);
    this.scene.add(b);
    this.bricks.push(b);
    return b;
  }

  public loadPreset(name: 'tower' | 'pyramid' | 'house') {
    this.clearAll();
    const H = 0.6; // Brick height

    if (name === 'tower') {
      // 4-level fortress tower matching human height (2.4m tall)
      for (let lvl = 0; lvl < 4; lvl++) {
        const y = lvl * H + H / 2;
        const color = lvl % 2 === 0 ? 1 : 4; // Blue & White
        this.addBrickAt(new THREE.Vector3(0, y, -0.5), 'bb3004', color, 0);
        this.addBrickAt(new THREE.Vector3(0, y, 0.5), 'bb3004', color, 0);
        this.addBrickAt(new THREE.Vector3(-0.75, y, 0), 'bb3005', color, 0);
        this.addBrickAt(new THREE.Vector3(0.75, y, 0), 'bb3005', color, 0);
      }
      // Crenellations / Battlements
      const topY = 4 * H + H / 2;
      this.addBrickAt(new THREE.Vector3(-0.75, topY, -0.5), 'bb3005', 0, 0);
      this.addBrickAt(new THREE.Vector3(0.75, topY, -0.5), 'bb3005', 0, 0);
      this.addBrickAt(new THREE.Vector3(-0.75, topY, 0.5), 'bb3005', 0, 0);
      this.addBrickAt(new THREE.Vector3(0.75, topY, 0.5), 'bb3005', 0, 0);
    } else if (name === 'pyramid') {
      // Tier 0 base: 4x 2x2 bricks
      this.addBrickAt(new THREE.Vector3(-0.5, H / 2, -0.5), 'bb3003', 2, 0);
      this.addBrickAt(new THREE.Vector3(0.5, H / 2, -0.5), 'bb3003', 2, 0);
      this.addBrickAt(new THREE.Vector3(-0.5, H / 2, 0.5), 'bb3003', 2, 0);
      this.addBrickAt(new THREE.Vector3(0.5, H / 2, 0.5), 'bb3003', 2, 0);

      // Tier 1: 2x2 brick centered
      this.addBrickAt(new THREE.Vector3(0, H + H / 2, 0), 'bb3003', 0, 0);

      // Tier 2: 1x1 brick pinnacle
      this.addBrickAt(new THREE.Vector3(0.25, 2 * H + H / 2, 0.25), 'bb3005', 4, 0);
    } else if (name === 'house') {
      // Cabin structure
      this.addBrickAt(new THREE.Vector3(0, H / 2, -1.0), 'bb3001', 3, 0);
      this.addBrickAt(new THREE.Vector3(0, H + H / 2, -1.0), 'bb3001', 3, 0);
      
      this.addBrickAt(new THREE.Vector3(-1.0, H / 2, 0), 'bb3004', 3, 1);
      this.addBrickAt(new THREE.Vector3(-1.0, H + H / 2, 0), 'bb3004', 3, 1);
      this.addBrickAt(new THREE.Vector3(1.0, H / 2, 0), 'bb3004', 3, 1);
      this.addBrickAt(new THREE.Vector3(1.0, H + H / 2, 0), 'bb3004', 3, 1);

      this.addBrickAt(new THREE.Vector3(-0.75, H / 2, 0.75), 'bb3005', 0, 0);
      this.addBrickAt(new THREE.Vector3(-0.75, H + H / 2, 0.75), 'bb3005', 0, 0);
      this.addBrickAt(new THREE.Vector3(0.75, H / 2, 0.75), 'bb3005', 0, 0);
      this.addBrickAt(new THREE.Vector3(0.75, H + H / 2, 0.75), 'bb3005', 0, 0);

      // Lintel & roof plate
      this.addBrickAt(new THREE.Vector3(0, 2 * H + H / 2, 0.75), 'bb3004', 2, 0);
      this.addBrickAt(new THREE.Vector3(0, 2 * H + 0.1, -0.25), 'bb3001', 0, 0);
    }

    this.undoStack = [];
    this.updateSunPosition();
    playSnapSound(this.soundEnabled);
    this.callbacks.onBrickCountChange(this.bricks.length);
    this.callbacks.onCanUndoChange(false);
    this.updateGhost();
  }

  public updateGhost() {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost = null;
    }
    if (this.mode !== 'BUILD') return;
    const colorHex = COLORS[this.colorIdx]?.hex ?? 0x007aff;
    this.ghost = this.createBrick(colorHex, true, this.rotation, this.brickTypeId);
    this.ghost.visible = false;
    this.scene.add(this.ghost);
  }

  // Set joystick move input from touch
  public setJoystickInput(forward: number, side: number) {
    this.input.forward = forward;
    this.input.side = side;
  }

  // Touch look delta
  public addTouchLook(dx: number, dy: number) {
    this.input.yaw -= dx * this.LOOK_SPEED;
    this.input.pitch -= dy * this.LOOK_SPEED;
    this.input.pitch = Math.max(-1.5, Math.min(1.5, this.input.pitch));
  }

  private setupWindowEvents() {
    this.onKeyDownHandler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;
      this.keysDown.add(e.code);

      if (e.code === 'Escape') {
        const handled = this.callbacks.onEscape?.();
        if (!handled) {
          if (this.mode === 'ERASE') {
            this.setMode('BUILD');
          } else {
            this.undo();
          }
        }
      } else if (e.code === 'KeyR') {
        this.rotate();
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
        this.undo();
      } else if (e.code === 'KeyB') {
        this.setMode('BUILD');
      } else if (e.code === 'KeyE' || e.code === 'KeyX') {
        this.setMode('ERASE');
      } else if (e.code === 'PageUp') {
        this.elevate(0.5);
      } else if (e.code === 'PageDown') {
        this.elevate(-0.5);
      } else if (e.code === 'KeyQ') {
        this.elevate(-0.3);
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.performAction();
      }
    };

    this.onKeyUpHandler = (e: KeyboardEvent) => {
      this.keysDown.delete(e.code);
    };

    let mouseDownPos = { x: 0, y: 0, time: 0, button: 0 };

    // Desktop mouse look on drag, or single click to place/remove
    this.onMouseDownHandler = (e: MouseEvent) => {
      if (e.target === this.renderer.domElement) {
        this.isMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        mouseDownPos = { x: e.clientX, y: e.clientY, time: performance.now(), button: e.button };
      }
    };

    this.onMouseMoveHandler = (e: MouseEvent) => {
      if (this.isMouseDown) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.addTouchLook(dx, dy);
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    };

    this.onMouseUpHandler = (e: MouseEvent) => {
      this.isMouseDown = false;
      if (e.target === this.renderer.domElement && mouseDownPos.button === 0) {
        const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
        const elapsed = performance.now() - mouseDownPos.time;
        // If user clicked without dragging, place or erase brick
        if (dist < 6 && elapsed < 350) {
          this.performAction();
        }
      }
    };

    this.onWheelHandler = (e: WheelEvent) => {
      if (e.target === this.renderer.domElement) {
        e.preventDefault();
        if (e.ctrlKey || e.shiftKey) {
          this.rotate();
        } else {
          this.elevate(e.deltaY > 0 ? -0.25 : 0.25);
        }
      }
    };

    window.addEventListener('keydown', this.onKeyDownHandler);
    window.addEventListener('keyup', this.onKeyUpHandler);
    window.addEventListener('mousedown', this.onMouseDownHandler);
    window.addEventListener('mousemove', this.onMouseMoveHandler);
    window.addEventListener('mouseup', this.onMouseUpHandler);
    window.addEventListener('wheel', this.onWheelHandler, { passive: false });

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
  }

  public onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.ssaoPass) {
      this.ssaoPass.setSize(width, height);
    }
  }

  private animate = () => {
    if (this.isDestroyed) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Dynamic continuous sun orbit if enabled
    if (this.dynamicSunOrbit && this.realisticFx) {
      this.sunAngle = (this.sunAngle + 0.12) % 360;
      this.updateSunPosition();
    }

    // Process keyboard movement
    let kbForward = 0;
    let kbSide = 0;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) kbForward += 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) kbForward -= 1;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) kbSide -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) kbSide += 1;

    const totalForward = this.input.forward !== 0 ? this.input.forward : kbForward;
    const totalSide = this.input.side !== 0 ? this.input.side : kbSide;

    const df = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    df.y = 0;
    df.normalize();
    const ds = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    ds.y = 0;
    ds.normalize();

    this.camera.position.add(df.multiplyScalar(totalForward * this.MOVE_SPEED));
    this.camera.position.add(ds.multiplyScalar(totalSide * this.MOVE_SPEED));
    this.camera.position.y = this.playerHeight;
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.input.pitch, this.input.yaw, 0, 'YXZ'));

    // Update particle sparkles
    const delta = 0.016;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      } else {
        p.vel.y -= 4.0 * delta; // gravity
        p.mesh.position.addScaledVector(p.vel, delta);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - p.life / p.maxLife);
      }
    }

    // Update Ghost brick preview
    if (this.ghost && this.mode === 'BUILD') {
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      const hits = this.raycaster.intersectObjects([this.scene.getObjectByName('FLOOR')!, ...this.bricks], true);
      if (hits.length > 0) {
        const hit = hits[0];
        let target: THREE.Object3D | null = hit.object;
        while (target && target.parent && target.parent !== this.scene && target.name !== 'FLOOR') {
          target = target.parent;
        }

        if (target) {
          const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
          const p = hit.point.clone().add(normal.clone().multiplyScalar(0.08));

          const gx = this.snapToGrid(p.x, this.ghost.userData.w);
          const gz = this.snapToGrid(p.z, this.ghost.userData.l);
          let gy: number;

          if (target.name === 'FLOOR') {
            gy = this.ghost.userData.h / 2;
          } else {
            if (Math.abs(normal.y) > 0.5) {
              gy = normal.y > 0
                ? target.position.y + target.userData.h / 2 + this.ghost.userData.h / 2
                : target.position.y - target.userData.h / 2 - this.ghost.userData.h / 2;
            } else {
              gy = target.position.y;
            }
          }

          this.ghost.position.set(gx, gy, gz);
          this.ghost.visible = true;
        } else {
          this.ghost.visible = false;
        }
      } else {
        this.ghost.visible = false;
      }
    }

    // Render using EffectComposer with SSAO if enabled & realisticFx
    if (this.realisticFx && this.ssaoEnabled && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };

  public destroy() {
    this.isDestroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.onKeyDownHandler) window.removeEventListener('keydown', this.onKeyDownHandler);
    if (this.onKeyUpHandler) window.removeEventListener('keyup', this.onKeyUpHandler);
    if (this.onMouseDownHandler) window.removeEventListener('mousedown', this.onMouseDownHandler);
    if (this.onMouseMoveHandler) window.removeEventListener('mousemove', this.onMouseMoveHandler);
    if (this.onMouseUpHandler) window.removeEventListener('mouseup', this.onMouseUpHandler);
    if (this.onWheelHandler) window.removeEventListener('wheel', this.onWheelHandler);
    window.removeEventListener('resize', this.onResize);
    if (this.composer) {
      this.composer.dispose();
    }
    if (this.ssaoPass) {
      this.ssaoPass.dispose();
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
