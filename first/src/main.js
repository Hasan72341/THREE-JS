import * as THREE from "three";
const canvas = document.getElementById("myCanvas");
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import gsap from "gsap";
import texture from "/snow-8433815_1920.jpg"
import { TextureLoader } from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

scene.add(camera);
camera.position.z = 5;


const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;








// Function to sample N points from a geometry surface
function samplePoints(geometry, count) {
  const nonIndexed = geometry.toNonIndexed(); // expand indexed geometry
  const posAttr = nonIndexed.attributes.position;
  const vertices = posAttr.array;

  const points = [];

  // helper to sample a point inside a triangle
  function sampleTriangle(vA, vB, vC) {
    let r1 = Math.random();
    let r2 = Math.random();
    if (r1 + r2 > 1) {
      r1 = 1 - r1;
      r2 = 1 - r2;
    }
    const x = vA.x + r1 * (vB.x - vA.x) + r2 * (vC.x - vA.x);
    const y = vA.y + r1 * (vB.y - vA.y) + r2 * (vC.y - vA.y);
    const z = vA.z + r1 * (vB.z - vA.z) + r2 * (vC.z - vA.z);
    return new THREE.Vector3(x, y, z);
  }

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const faceIdx = Math.floor(Math.random() * (vertices.length / 9));
    vA.fromArray(vertices, faceIdx * 9 + 0);
    vB.fromArray(vertices, faceIdx * 9 + 3);
    vC.fromArray(vertices, faceIdx * 9 + 6);

    const p = sampleTriangle(vA, vB, vC);
    points.push(p.x, p.y, p.z);
  }

  return new Float32Array(points);
}

// --- define your geometries ---
const sphereGeo   = new THREE.SphereGeometry(5, 64, 64);
const cylinderGeo = new THREE.CylinderGeometry(3, 3, 8, 64, 64);

// --- sample 5000 points each ---
const spherePositions   = samplePoints(sphereGeo, 50000);
const cylinderPositions = samplePoints(cylinderGeo, 50000);

const geometry = new THREE.BufferGeometry();                                          
geometry.setAttribute('position', new THREE.BufferAttribute(spherePositions, 3));
geometry.setAttribute('aPosition', new THREE.BufferAttribute(cylinderPositions, 3));
// compute bounding sphere so we know the mesh size
geometry.computeBoundingSphere();



const textureLoader = new TextureLoader();
const snowTexture = textureLoader.load(texture);


const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
    uProgress: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio) },
    uSize: { value: 0.03},
    uTexture: { value: snowTexture }
  },
  side: THREE.DoubleSide,
  blending : THREE.AdditiveBlending,
  depthWrite: false

});

const nMesh = new THREE.Points(geometry, material)
scene.add(nMesh)

const button = document.getElementById('toggleButton');
console.log('toggle button element found:', !!button);
let isAnimating = false;
// show toggle by default for easier testing (visible outside AR)
if (button) button.style.display = 'block';

button.addEventListener('click', () => {
  // Only allow toggle when in AR session
  if (!renderer.xr.isPresenting) return;
  if (isAnimating) return; // Prevent multiple clicks during animation

  isAnimating = true;
  const currentValue = nMesh.material.uniforms.uProgress.value;
  const targetValue = currentValue === 0 ? 1 : 0;
  const targetScale = targetValue === 1 ? 1.2 : 0.6;

  // animate morph
  gsap.to(nMesh.material.uniforms.uProgress, {
    value: targetValue,
    duration: 2,
    ease: 'power2.inOut'
  });

  // animate scale together
  gsap.to(nMesh.scale, {
    x: targetScale,
    y: targetScale,
    z: targetScale,
    duration: 2,
    ease: 'power2.inOut',
    onComplete: () => {
      isAnimating = false;
    }
  });
});

nMesh.scale.set(0.6, 0.6, 0.6);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true; // enable WebXR

// add AR button to enter AR sessions (AR-only)
document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

// simple controllers (left/right)
const controller1 = renderer.xr.getController(0);
controller1.name = 'controller-1';
scene.add(controller1);
const controller2 = renderer.xr.getController(1);
controller2.name = 'controller-2';
scene.add(controller2);

// AR hit-test + reticle setup
let hitTestSource = null;
let hitTestSourceRequested = false;
const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

function onSelect() {
  if (!reticle.visible) return;

  // pick a position along the camera->reticle vector so camera stays outside the mesh
  const reticlePos = new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
  const cameraPos = new THREE.Vector3();
  camera.getWorldPosition(cameraPos);

  // ensure we have a bounding radius for the geometry
  const radius = (geometry.boundingSphere && geometry.boundingSphere.radius) ? geometry.boundingSphere.radius * Math.max(nMesh.scale.x, nMesh.scale.y, nMesh.scale.z) : 1.0;
  const padding = 0.5; // meters of padding between camera and mesh surface
  const desiredDistance = radius + padding;

  // direction from camera to reticle
  const dir = reticlePos.clone().sub(cameraPos).normalize();
  const targetPos = cameraPos.clone().add(dir.multiplyScalar(desiredDistance));

  nMesh.position.copy(targetPos);
  nMesh.visible = true;
}
controller1.addEventListener('select', onSelect);
controller2.addEventListener('select', onSelect);

// handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
});

// XR-friendly render loop
renderer.setAnimationLoop((time, xrFrame) => {
  // update controls only when not in XR
  if (!renderer.xr.isPresenting) controls.update();

  const session = renderer.xr.getSession && renderer.xr.getSession();
  if (session && xrFrame) {
    const referenceSpace = renderer.xr.getReferenceSpace();

    if (!hitTestSourceRequested) {
      session.requestReferenceSpace('viewer').then((refSpace) => {
        session.requestHitTestSource({ space: refSpace }).then((source) => {
          hitTestSource = source;
          // show toggle when AR hit-test is available
          if (button) button.style.display = 'block';
        });
      });
      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
        reticle.visible = false;
        // hide toggle when AR session ends
        if (button) button.style.display = 'none';
      });
      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = xrFrame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
});