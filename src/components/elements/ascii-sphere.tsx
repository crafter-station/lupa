"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function RotatingMesh() {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.15;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.25;
    }
  });

  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[2, 0.6, 200, 32]} />
      <meshStandardMaterial
        color="#7877c6"
        wireframe
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

export function AsciiSphere() {
  return (
    <div className="relative h-[600px] w-full overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        className="!absolute !inset-0"
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <RotatingMesh />
      </Canvas>
    </div>
  );
}
