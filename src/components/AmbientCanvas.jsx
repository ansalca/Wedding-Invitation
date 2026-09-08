import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { reducedMotion, subscribeReducedMotion } from '../lib/motion.js';

/* Ambient three.js layer, scoped to whichever section contains it.
   The original build put this behind opaque sections where it was invisible;
   here it sits inside the hero so the gold actually reads against emerald. */
function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export default function AmbientCanvas({ active = true }) {
  const mountRef = useRef(null);
  const activeRef = useRef(active);
  const [supported] = useState(() => webglAvailable());
  activeRef.current = active;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !supported) return;

    const width = () => mount.clientWidth || window.innerWidth;
    const height = () => mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width() / height(), 0.1, 1000);
    camera.position.z = 26;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width(), height());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const disposables = [];

    /* --- Drifting gold dust --- */
    const starCount = 340;
    const positions = new Float32Array(starCount * 3);
    const drift = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 74;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 54;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 6;
      drift[i] = 0.35 + Math.random() * 0.9;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xead6a0,
      size: 0.2,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    disposables.push(starGeo, starMat);

    /* --- Wireframe rings + gem, echoing the ring motif --- */
    const goldWire = new THREE.MeshBasicMaterial({
      color: 0xc9a24b, wireframe: true, transparent: true, opacity: 0.30,
    });
    const jadeWire = new THREE.MeshBasicMaterial({
      color: 0x6fbf9c, wireframe: true, transparent: true, opacity: 0.20,
    });
    disposables.push(goldWire, jadeWire);

    const meshes = [
      { m: new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.13, 8, 64), goldWire), p: [-12, 5, -12], r: [0.10, 0.07] },
      { m: new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.11, 8, 64), goldWire), p: [12, -5, -15],  r: [-0.09, 0.13] },
      { m: new THREE.Mesh(new THREE.IcosahedronGeometry(3.3, 0), jadeWire),     p: [0, 3, -20],    r: [0.05, 0.08] },
      { m: new THREE.Mesh(new THREE.OctahedronGeometry(2.0, 0), goldWire),      p: [-9, -7, -10],  r: [0.09, -0.06] },
    ];
    meshes.forEach(({ m, p }) => {
      m.position.set(...p);
      scene.add(m);
      disposables.push(m.geometry);
    });

    let frameId;
    const clock = new THREE.Clock();

    const render = () => renderer.render(scene, camera);

    const animate = () => {
      const t = clock.getElapsedTime();

      const pos = starGeo.attributes.position.array;
      for (let i = 0; i < starCount; i++) {
        pos[i * 3 + 1] += drift[i] * 0.006;
        if (pos[i * 3 + 1] > 27) pos[i * 3 + 1] = -27;
      }
      starGeo.attributes.position.needsUpdate = true;
      stars.rotation.y = t * 0.012;

      meshes.forEach(({ m, r }) => {
        m.rotation.x = t * r[0];
        m.rotation.y = t * r[1];
      });

      render();
      frameId = requestAnimationFrame(animate);
    };

    let running = false;
    const start = () => {
      /* Live check — the OS setting can change while the page is open. */
      if (running || reducedMotion()) return;
      running = true;
      clock.getDelta();
      animate();
    };
    const stop = () => {
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = null;
    };

    render();
    if (activeRef.current) start();

    /* Follow the motion decision live: freeze on the current frame when
       motion is reduced, resume when it is re-enabled. */
    const unsubscribeMotion = subscribeReducedMotion((isReduced) => {
      if (isReduced) stop();
      else if (activeRef.current) start();
    });

    /* Expose start/stop so the effect below can drive them, and idle the
       loop while the tab is in the background. */
    mount.__ambient = { start, stop };
    const onVisibility = () => {
      if (document.hidden) stop();
      else if (activeRef.current) start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onResize = () => {
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
      renderer.setSize(width(), height());
      render();
    };
    window.addEventListener('resize', onResize);

    return () => {
      unsubscribeMotion();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      delete mount.__ambient;
      if (frameId) cancelAnimationFrame(frameId);
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const api = mountRef.current && mountRef.current.__ambient;
    if (!api) return;
    if (active) api.start();
    else api.stop();
  }, [active]);

  return <div ref={mountRef} className="three-bg" aria-hidden="true" />;
}
