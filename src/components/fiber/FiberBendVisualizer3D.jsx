import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from 'lucide-react';

export default function FiberBendVisualizer3D({ minBendRadius = 30 }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [bendRadius, setBendRadius] = useState(minBendRadius * 2);
  const [signalLoss, setSignalLoss] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Fiber cable outer jacket
    const cableGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-8, 0, 0),
        new THREE.Vector3(-5, 0, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(5, 0, 0),
        new THREE.Vector3(8, 0, 0),
      ]),
      64,
      0.2,
      8,
      false
    );
    const cableMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.6
    });
    const cable = new THREE.Mesh(cableGeometry, cableMaterial);
    scene.add(cable);

    // Fiber core (thinner, yellow)
    const coreGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-8, 0, 0),
        new THREE.Vector3(-5, 0, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(5, 0, 0),
        new THREE.Vector3(8, 0, 0),
      ]),
      64,
      0.05,
      8,
      false
    );
    const coreMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xfbbf24,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.5
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);

    // Light rays particles
    const lightRays = [];
    const createLightRay = (position) => {
      const rayGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      const rayMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xfef3c7,
        transparent: true,
        opacity: 0.8
      });
      const ray = new THREE.Mesh(rayGeometry, rayMaterial);
      ray.position.copy(position);
      scene.add(ray);
      return ray;
    };

    // Animation
    let animationId;
    let time = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.016;

      // Rotate scene slightly for better view
      scene.rotation.y = Math.sin(time * 0.2) * 0.1;

      // Animate light rays traveling through fiber
      lightRays.forEach((ray, i) => {
        ray.position.x += 0.1;
        if (ray.position.x > 8) {
          ray.position.x = -8;
        }

        // Calculate position along curve and check if in bend area
        const normalizedPos = (ray.position.x + 8) / 16;
        const bendStrength = Math.abs(normalizedPos - 0.5) < 0.15 ? 1 : 0;
        
        // Escape light at bend if radius is too small
        if (bendRadius < minBendRadius && bendStrength > 0) {
          ray.position.y -= 0.02 * (minBendRadius - bendRadius) / minBendRadius;
          ray.material.opacity = Math.max(0.1, 0.8 - Math.abs(ray.position.y) * 0.5);
        } else {
          ray.position.y = Math.sin(ray.position.x * 0.5) * 0.02;
          ray.material.opacity = 0.8;
        }
      });

      // Spawn new light rays periodically
      if (Math.random() < 0.05 && lightRays.length < 20) {
        lightRays.push(createLightRay(new THREE.Vector3(-8, 0, 0)));
      }

      // Remove escaped rays
      lightRays.forEach((ray, i) => {
        if (Math.abs(ray.position.y) > 2) {
          scene.remove(ray);
          lightRays.splice(i, 1);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      mountRef.current?.removeChild(renderer.domElement);
      lightRays.forEach(ray => scene.remove(ray));
      scene.clear();
      renderer.dispose();
    };
  }, []);

  // Update fiber curve when bend radius changes
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    
    // Calculate bend curve based on radius
    const bendScale = Math.max(0.1, bendRadius / 100);
    const bendHeight = Math.max(0.5, 3 * (1 - bendScale));

    // Update cable geometry
    const newCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-8, 0, 0),
      new THREE.Vector3(-3, 0, 0),
      new THREE.Vector3(0, bendHeight, 0),
      new THREE.Vector3(3, 0, 0),
      new THREE.Vector3(8, 0, 0),
    ]);

    const cable = scene.children.find(c => c.geometry?.type === 'TubeGeometry' && c.material?.color?.getHex() === 0x3b82f6);
    const core = scene.children.find(c => c.geometry?.type === 'TubeGeometry' && c.material?.color?.getHex() === 0xfbbf24);

    if (cable) {
      cable.geometry.dispose();
      cable.geometry = new THREE.TubeGeometry(newCurve, 64, 0.2, 8, false);
    }

    if (core) {
      core.geometry.dispose();
      core.geometry = new THREE.TubeGeometry(newCurve, 64, 0.05, 8, false);
    }

    // Calculate signal loss based on bend radius
    let loss = 0;
    if (bendRadius < minBendRadius) {
      loss = Math.min(100, ((minBendRadius - bendRadius) / minBendRadius) * 150);
    }
    setSignalLoss(Math.round(loss * 10) / 10);

  }, [bendRadius, minBendRadius]);

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 overflow-hidden">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Interactive Bend Visualization</h3>
          {signalLoss > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              -{signalLoss}dB
            </Badge>
          )}
        </div>

        <div 
          ref={mountRef} 
          className="w-full h-64 rounded-lg overflow-hidden bg-slate-950 border border-slate-700"
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Bend Radius</span>
            <span className="font-mono font-bold text-white">
              {bendRadius}mm
              {bendRadius < minBendRadius && (
                <span className="text-red-400 text-xs ml-2">(Too tight!)</span>
              )}
            </span>
          </div>
          
          <Slider
            value={[bendRadius]}
            onValueChange={(v) => setBendRadius(v[0])}
            min={5}
            max={150}
            step={1}
            className="cursor-pointer"
          />

          <div className="flex justify-between text-xs text-slate-400">
            <span>5mm (tight)</span>
            <span className="text-amber-400">Min: {minBendRadius}mm</span>
            <span>150mm (gentle)</span>
          </div>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-300 space-y-1">
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
              Yellow particles = light rays traveling through fiber
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
              Blue tube = fiber optic cable
            </p>
            <p className="text-slate-400 mt-2">
              When bend radius is too small, light escapes the core causing signal loss.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}