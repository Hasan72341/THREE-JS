import * as THREE from "three";
const canvas = document.getElementById("myCanvas");
import { OrbitControls } from "three/examples/jsm/Addons.js";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import gsap from "gsap";

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

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 },
    uProgress: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio) },
    uSize: { value: 0.03}
  },
  side: THREE.DoubleSide,
  blending : THREE.AdditiveBlending,
  depthWrite: false

});

const nMesh = new THREE.Points(geometry, material)
scene.add(nMesh)

const button = document.getElementById('toggleButton');
let isAnimating = false;

button.addEventListener('click', () => {
  if (isAnimating) return; // Prevent multiple clicks during animation
  
  isAnimating = true;
  const currentValue = nMesh.material.uniforms.uProgress.value;
  const targetValue = currentValue === 0 ? 1 : 0;
  
  gsap.to(nMesh.material.uniforms.uProgress, {
    value: targetValue,
    duration: 2,
    ease: "power2.inOut",
    onComplete: () => {
      isAnimating = false; // Allow next animation
    }
  });
});

nMesh.scale.set(0.6, 0.6, 0.6);

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);  

const tick = () => {
  window.requestAnimationFrame(tick);
  renderer.render(scene, camera);
  controls.update();
};

tick();