import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  RotateCw,
  Compass,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  SunMedium,
  Moon,
} from 'lucide-react';
import { HourlyTelemetry, LunarSite } from '../lib/nasaApi';

interface TerrainViewerProps {
  currentTelemetry: HourlyTelemetry;
  selectedSite: LunarSite;
  isSimulating: boolean;
}

export const TerrainViewer: React.FC<TerrainViewerProps> = ({
  currentTelemetry,
  selectedSite,
  isSimulating,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunGizmoRef = useRef<THREE.Mesh | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const ringsRef = useRef<THREE.Group | null>(null);
  const landerRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [viewMode, setViewMode] = useState<'perspective' | 'topDown'>(
    'perspective'
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software GL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Slate 950 deep space
    scene.fog = new THREE.FogExp2(0x020617, 0.0035);
    sceneRef.current = scene;

    // 2. CAMERA
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1200);
    camera.position.set(0, 38, 62);
    cameraRef.current = camera;

    // 3. RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. ORBIT CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Do not go underground
    controls.minDistance = 15;
    controls.maxDistance = 180;
    controls.target.set(0, 3, 0);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.6;
    controlsRef.current = controls;

    // 5. LIGHTING RIG
    // Ambient / Earthshine fill
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.22);
    scene.add(hemiLight);

    // Dynamic Sun Key Light (Directional with real shadow mapping)
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = isSoftwareGl ? 512 : 2048;
    sunLight.shadow.mapSize.height = isSoftwareGl ? 512 : 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 250;
    const d = 50;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0003;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Sun Visual Billboard Sphere
    const sunGeo = new THREE.SphereGeometry(2.5, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    const sunGizmo = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunGizmo);
    sunGizmoRef.current = sunGizmo;

    // 6. DISTANT EARTH SPHERE IN LUNAR SKY
    const earthGroup = new THREE.Group();
    const earthGeo = new THREE.SphereGeometry(3.6, 32, 32);
    const earthCanvas = document.createElement('canvas');
    earthCanvas.width = 256;
    earthCanvas.height = 128;
    const ect = earthCanvas.getContext('2d')!;
    ect.fillStyle = '#1d4ed8'; // Ocean blue
    ect.fillRect(0, 0, 256, 128);
    ect.fillStyle = '#15803d'; // Continents
    ect.beginPath();
    ect.ellipse(80, 60, 45, 30, 0.2, 0, Math.PI * 2);
    ect.ellipse(190, 70, 40, 25, -0.1, 0, Math.PI * 2);
    ect.fill();
    // Swirling clouds
    ect.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ect.beginPath();
    ect.arc(60, 45, 30, 0, Math.PI * 2);
    ect.arc(170, 55, 35, 0, Math.PI * 2);
    ect.fill();
    const earthTex = new THREE.CanvasTexture(earthCanvas);
    earthTex.colorSpace = THREE.SRGBColorSpace;

    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.25,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.set(65, 14, -80);
    earthGroup.add(earthMesh);

    // Atmospheric limb glow for Earth
    const earthGlowGeo = new THREE.SphereGeometry(3.85, 32, 32);
    const earthGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
    });
    const earthGlowMesh = new THREE.Mesh(earthGlowGeo, earthGlowMat);
    earthMesh.add(earthGlowMesh);
    scene.add(earthGroup);
    earthMeshRef.current = earthMesh;

    // 7. STARFIELD BACKGROUND
    const starCount = isSoftwareGl ? 400 : 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 220 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = Math.max(8, radius * Math.cos(phi)); // Keep stars in sky
      starPositions[i + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(starPositions, 3)
    );
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.1,
      transparent: true,
      opacity: 0.85,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 8. PROCEDURAL TOPOGRAPHIC LUNAR CRATER RELIEF
    const terrainSize = 100;
    const segments = isSoftwareGl ? 80 : 150;
    const terrainGeo = new THREE.PlaneGeometry(
      terrainSize,
      terrainSize,
      segments,
      segments
    );
    terrainGeo.rotateX(-Math.PI / 2);

    // Displace vertices to form a realistic lunar impact crater (Shackleton style)
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const distFromCenter = Math.sqrt(x * x + z * z);

      let y = 0;
      const craterRadius = 24;
      const rimWidth = 9;

      // Crater bowl
      if (distFromCenter < craterRadius) {
        // Deep depression inside the crater (Permanently Shadowed Region)
        const t = distFromCenter / craterRadius;
        y = -14 * Math.cos(t * (Math.PI / 2));

        // Central rebound peak in the middle of crater
        if (distFromCenter < 5.5) {
          y += 4.5 * Math.cos((distFromCenter / 5.5) * (Math.PI / 2));
        }
      } else if (
        distFromCenter >= craterRadius &&
        distFromCenter < craterRadius + rimWidth
      ) {
        // Elevated crater rim / mountain ridge
        const t = (distFromCenter - craterRadius) / rimWidth;
        y = 5.8 * Math.sin(t * Math.PI);
      } else {
        // Outer ejecta blanket and rolling highlands
        const t = distFromCenter - (craterRadius + rimWidth);
        y = Math.max(0, 1.8 * Math.exp(-t * 0.08));
      }

      // Procedural micro-craters and rough lunar regolith noise
      const microCraters =
        Math.sin(x * 0.45) * Math.cos(z * 0.45) * 0.65 +
        Math.sin(x * 1.1 + 1.2) * Math.cos(z * 1.1) * 0.32 +
        Math.sin(x * 2.3) * Math.cos(z * 2.3) * 0.12;

      // Safe landing plateau flat ridge area (around x: 18, z: 12)
      const landingDist = Math.hypot(x - 17, z - 13);
      if (landingDist < 6.5) {
        // Flatten landing plateau for realistic rover / lander touchdown
        y = 5.2 + microCraters * 0.08;
      } else {
        y += microCraters;
      }

      pos.setY(i, y);
    }
    terrainGeo.computeVertexNormals();

    // Regolith material
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Lunar slate gray
      roughness: 0.92,
      metalness: 0.08,
      flatShading: false,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = !isSoftwareGl;
    terrainMesh.castShadow = !isSoftwareGl;
    scene.add(terrainMesh);

    // 9. LUMINOUS LANDING ZONE RINGS (Neon Purple & Cyan)
    const landingGroup = new THREE.Group();
    landingGroup.position.set(17, 5.35, 13);

    // Inner bright cyan ring
    const innerRingGeo = new THREE.RingGeometry(2.8, 3.15, 48);
    innerRingGeo.rotateX(-Math.PI / 2);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    landingGroup.add(innerRing);

    // Outer neon purple ring
    const outerRingGeo = new THREE.RingGeometry(4.6, 5.0, 48);
    outerRingGeo.rotateX(-Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7, // Purple
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    landingGroup.add(outerRing);

    // Crosshairs
    const crossMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
    });
    const crossPoints = [
      new THREE.Vector3(-5.5, 0.02, 0),
      new THREE.Vector3(5.5, 0.02, 0),
      new THREE.Vector3(0, 0.02, -5.5),
      new THREE.Vector3(0, 0.02, 5.5),
    ];
    const crossGeo = new THREE.BufferGeometry().setFromPoints(crossPoints);
    const crossLines = new THREE.LineSegments(crossGeo, crossMat);
    landingGroup.add(crossLines);

    // Vertical holographic beacon column
    const beaconGeo = new THREE.CylinderGeometry(0.08, 0.08, 9, 16);
    beaconGeo.translate(0, 4.5, 0);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    landingGroup.add(beacon);

    scene.add(landingGroup);
    ringsRef.current = landingGroup;

    // 10. COMPOSITE PROCEDURAL LUNAR LANDER MODEL (Multi-part THREE.Group)
    const lander = new THREE.Group();
    lander.position.set(17, 5.35, 13);
    lander.scale.set(0.7, 0.7, 0.7);

    // Descent Stage: Hexagonal gold MLI foil core
    const coreGeo = new THREE.CylinderGeometry(1.4, 1.6, 1.2, 6);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25,
    });
    const core = new THREE.Mesh(coreGeo, goldMat);
    core.position.y = 1.1;
    core.castShadow = !isSoftwareGl;
    lander.add(core);

    // Ascent Cabin / Avionics Hab: Titanium white cylinder with viewport
    const cabinGeo = new THREE.CylinderGeometry(1.0, 1.25, 1.3, 16);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.4,
      roughness: 0.35,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = 2.3;
    cabin.castShadow = !isSoftwareGl;
    lander.add(cabin);

    // Dome cap
    const domeGeo = new THREE.SphereGeometry(
      1.0,
      16,
      12,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const dome = new THREE.Mesh(domeGeo, cabinMat);
    dome.position.y = 2.95;
    lander.add(dome);

    // Descent Engine Bell Nozzle
    const nozzleGeo = new THREE.ConeGeometry(0.55, 0.9, 16, 1, true);
    nozzleGeo.rotateX(Math.PI);
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.position.y = 0.45;
    lander.add(nozzle);

    // 4 Landing Struts / Footpads
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.3,
    });
    const footpadMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.7,
      roughness: 0.4,
    });

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const legGroup = new THREE.Group();

      // Main diagonal shock absorber strut
      const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.1, 8);
      strutGeo.rotateZ(0.65);
      const strut = new THREE.Mesh(strutGeo, legMat);
      strut.position.set(1.1 * Math.cos(angle), 0.7, 1.1 * Math.sin(angle));
      strut.rotation.y = -angle;
      legGroup.add(strut);

      // Footpad grounded on surface
      const footGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 12);
      const foot = new THREE.Mesh(footGeo, footpadMat);
      foot.position.set(2.1 * Math.cos(angle), 0.04, 2.1 * Math.sin(angle));
      legGroup.add(foot);

      lander.add(legGroup);
    }

    // Deployable Photovoltaic Solar Wings
    const solarWingMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // Deep solar blue
      metalness: 0.7,
      roughness: 0.2,
      emissive: 0x1e40af,
      emissiveIntensity: 0.15,
    });
    const wingGeo = new THREE.BoxGeometry(2.8, 0.06, 0.9);

    const leftWing = new THREE.Mesh(wingGeo, solarWingMat);
    leftWing.position.set(-2.5, 2.3, 0);
    leftWing.castShadow = !isSoftwareGl;
    lander.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, solarWingMat);
    rightWing.position.set(2.5, 2.3, 0);
    rightWing.castShadow = !isSoftwareGl;
    lander.add(rightWing);

    // High Gain Antenna (HGA) dish pointed towards Earth
    const dishGeo = new THREE.SphereGeometry(
      0.55,
      16,
      12,
      0,
      Math.PI * 2,
      0,
      Math.PI / 3
    );
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.3,
      roughness: 0.4,
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0.6, 3.4, 0.4);
    dish.rotation.x = -0.6;
    dish.rotation.y = 0.5;
    lander.add(dish);

    scene.add(lander);
    landerRef.current = lander;

    // 11. ANIMATION TICK LOOP
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Slowly rotate landing ring indicators for visual dynamism
      if (ringsRef.current) {
        ringsRef.current.rotation.y += delta * 0.2;
      }

      // Update controls
      controls.update();

      // Render
      renderer.render(scene, camera);
    };

    animate();

    // 12. RESIZE LISTENER
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Controls autoRotate state
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Update View Mode (Perspective vs Top-down Nadir)
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    if (viewMode === 'topDown') {
      cameraRef.current.position.set(0, 75, 0.01);
      controlsRef.current.target.set(0, 0, 0);
    } else {
      cameraRef.current.position.set(0, 38, 62);
      controlsRef.current.target.set(0, 3, 0);
    }
    controlsRef.current.update();
  }, [viewMode]);

  // Synchronize dynamic Sun position with hourly telemetry (azimuth + elevation)
  useEffect(() => {
    if (!sunLightRef.current || !sunGizmoRef.current) return;

    const solarAzimuth = currentTelemetry.solarAzimuthDeg ?? 45;
    const solarElevation =
      currentTelemetry.solarElevationDeg ??
      currentTelemetry.solarElevation ??
      1.2;
    const radius = 90;
    const azRad = (solarAzimuth * Math.PI) / 180;
    const elRad = (solarElevation * Math.PI) / 180;

    // Calculate Cartesian coordinate of the sun relative to the crater
    // Note: in lunar south pole, solar elevation is very low (-2° to +2.5°)
    const sunY = Math.max(-12, radius * Math.sin(elRad));
    const sunX = radius * Math.cos(elRad) * Math.sin(azRad);
    const sunZ = radius * Math.cos(elRad) * Math.cos(azRad);

    sunLightRef.current.position.set(sunX, sunY, sunZ);
    sunGizmoRef.current.position.set(sunX, sunY, sunZ);

    // Adjust light intensity based on elevation (sunset / darkness / sun)
    if (solarElevation > 0.5) {
      sunLightRef.current.intensity = 2.8;
      sunGizmoRef.current.visible = true;
    } else if (solarElevation > 0) {
      sunLightRef.current.intensity = 1.0;
      sunGizmoRef.current.visible = true;
    } else {
      // In permanent shadow or below horizon
      sunLightRef.current.intensity = 0.05;
      sunGizmoRef.current.visible = false;
    }
  }, [currentTelemetry]);

  // Synchronize Earth Mesh position in the lunar sky
  useEffect(() => {
    if (!earthMeshRef.current) return;
    const earthElevation =
      currentTelemetry.earthElevationDeg ??
      currentTelemetry.earthElevation ??
      5.0;
    const earthAzimuth = currentTelemetry.earthAzimuthDeg ?? 12.4;
    const dist = 110;
    const azRad = (earthAzimuth * Math.PI) / 180;
    const elRad = (Math.max(0.2, earthElevation) * Math.PI) / 180;

    const ey = dist * Math.sin(elRad) + 8;
    const ex = dist * Math.cos(elRad) * Math.sin(azRad);
    const ez = -dist * Math.cos(elRad) * Math.cos(azRad);

    earthMeshRef.current.position.set(ex, ey, ez);
  }, [currentTelemetry]);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 38, 62);
      controlsRef.current.target.set(0, 3, 0);
      controlsRef.current.update();
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!cameraRef.current) return;
    const factor = direction === 'in' ? 0.8 : 1.25;
    cameraRef.current.position.multiplyScalar(factor);
  };

  return (
    <div className="relative w-full h-full min-h-[460px] lg:min-h-[580px] flex flex-col justify-between select-none">
      {/* 3D Canvas Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full rounded-[2rem] overflow-hidden cursor-grab active:cursor-grabbing"
      />

      {/* Top Floating Overlay Badge on 3D Viewport */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 p-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-medium text-slate-300 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>SITIO ACTIVO:</span>
          <span className="font-semibold text-white">{selectedSite.name}</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-slate-300">
          <SunMedium className="w-3.5 h-3.5 text-amber-400" />
          <span>Ángulo solar:</span>
          <span
            className={`font-mono font-semibold ${
              (currentTelemetry.solarElevationDeg ??
                currentTelemetry.solarElevation ??
                0) > 0
                ? 'text-amber-300'
                : 'text-slate-400'
            }`}
          >
            {(currentTelemetry.solarElevationDeg ??
              currentTelemetry.solarElevation ??
              0) > 0
              ? `+${
                  currentTelemetry.solarElevationDeg ??
                  currentTelemetry.solarElevation ??
                  0
                }°`
              : `${
                  currentTelemetry.solarElevationDeg ??
                  currentTelemetry.solarElevation ??
                  0
                }°`}
          </span>
        </div>
      </div>

      {/* Bottom Floating Control Dock & Visual Legend */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-3 p-4 pointer-events-none">
        {/* Visual Legend (Usability & Accessibility) */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-[11px] text-slate-300 shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/80"></span>
            <span>Zona iluminada = Energía solar</span>
          </div>
          <div className="hidden sm:block text-slate-600">|</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/80"></span>
            <span>Sombra = Potencial hielo</span>
          </div>
          <div className="hidden sm:block text-slate-600">|</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span>Zona Aterrizaje Artemis</span>
          </div>
        </div>

        {/* 3D Viewport Controls Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
              autoRotate
                ? 'bg-purple-600/60 text-purple-200 border border-purple-500/40'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Pausar o reanudar rotación automática"
            aria-label="Pausar o reanudar rotación automática"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`}
            />
            <span>{autoRotate ? 'Pausar giro' : 'Girar'}</span>
          </button>

          <button
            onClick={() =>
              setViewMode(
                viewMode === 'perspective' ? 'topDown' : 'perspective'
              )
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'topDown'
                ? 'bg-cyan-600/60 text-cyan-200 border border-cyan-500/40'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Cambiar entre vista en perspectiva y vista cenital"
            aria-label="Alternar vista en perspectiva y cenital"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>
              {viewMode === 'perspective' ? 'Cenital' : 'Perspectiva'}
            </span>
          </button>

          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Reiniciar cámara"
            aria-label="Reiniciar cámara a posición inicial"
          >
            <Compass className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleZoom('in')}
            className="p-1.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Acercar vista"
            aria-label="Acercar cámara"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleZoom('out')}
            className="p-1.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Alejar vista"
            aria-label="Alejar cámara"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
