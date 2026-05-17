import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Floor
export function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[22, 18]} />
      <meshStandardMaterial color="#2a2218" roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

// Walls with subtle panel effect
export function Walls() {
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 4.5, -9]} receiveShadow>
        <planeGeometry args={[22, 9]} />
        <meshStandardMaterial color="#1e1a14" roughness={0.9} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-11, 4.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[18, 9]} />
        <meshStandardMaterial color="#211d16" roughness={0.9} />
      </mesh>
      {/* Right wall */}
      <mesh position={[11, 4.5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[18, 9]} />
        <meshStandardMaterial color="#211d16" roughness={0.9} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 9, 0]}>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#151310" />
      </mesh>
      {/* Wall panels (left) */}
      {[-6, -2, 2, 6].map((z, i) => (
        <mesh key={`lp-${i}`} position={[-10.95, 4, z]}>
          <boxGeometry args={[0.05, 5, 3]} />
          <meshStandardMaterial color="#2a2418" roughness={0.7} />
        </mesh>
      ))}
      {/* Wall panels (right) */}
      {[-6, -2, 2, 6].map((z, i) => (
        <mesh key={`rp-${i}`} position={[10.95, 4, z]}>
          <boxGeometry args={[0.05, 5, 3]} />
          <meshStandardMaterial color="#2a2418" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// Classroom lighting
export function ClassroomLights() {
  return (
    <>
      <ambientLight intensity={0.25} color="#f0d0a0" />
      <directionalLight position={[5, 8, 3]} intensity={0.5} color="#ffe8c0" castShadow shadow-mapSize={1024} />
      <pointLight position={[0, 8, -7]} intensity={0.9} color="#f0a35a" distance={16} />
      <pointLight position={[-8, 6, 0]} intensity={0.25} color="#a0c0f0" distance={14} />
      <pointLight position={[8, 6, 0]} intensity={0.25} color="#a0c0f0" distance={14} />
      {/* Ceiling strip lights */}
      {[-4, 0, 4].map((x, i) => (
        <rectAreaLight key={i} position={[x, 8.9, -2]} width={1.5} height={8} intensity={0.6} color="#ffe0b0" rotation={[-Math.PI / 2, 0, 0]} />
      ))}
    </>
  );
}

// Bench with attached seat
export function Bench({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Desk surface */}
      <mesh position={[0, 0.78, -0.2]} castShadow>
        <boxGeometry args={[1.6, 0.06, 0.7]} />
        <meshStandardMaterial color="#5a4a32" roughness={0.5} />
      </mesh>
      {/* Desk front panel */}
      <mesh position={[0, 0.5, -0.52]} castShadow>
        <boxGeometry args={[1.6, 0.5, 0.04]} />
        <meshStandardMaterial color="#4a3a28" roughness={0.6} />
      </mesh>
      {/* Desk legs */}
      {[[-0.72, 0, -0.5], [0.72, 0, -0.5], [-0.72, 0, 0.1], [0.72, 0, 0.1]].map((p, i) => (
        <mesh key={i} position={[p[0], 0.375, p[2]]} castShadow>
          <boxGeometry args={[0.05, 0.75, 0.05]} />
          <meshStandardMaterial color="#2a2218" metalness={0.3} />
        </mesh>
      ))}
      {/* Seat */}
      <mesh position={[0, 0.44, 0.45]} castShadow>
        <boxGeometry args={[1.4, 0.05, 0.45]} />
        <meshStandardMaterial color="#3a3028" roughness={0.6} />
      </mesh>
      {/* Seat back */}
      <mesh position={[0, 0.78, 0.66]} castShadow>
        <boxGeometry args={[1.4, 0.65, 0.04]} />
        <meshStandardMaterial color="#3a3028" roughness={0.6} />
      </mesh>
      {/* Seat legs */}
      {[[-0.6, 0, 0.28], [0.6, 0, 0.28], [-0.6, 0, 0.62], [0.6, 0, 0.62]].map((p, i) => (
        <mesh key={`sl-${i}`} position={[p[0], 0.22, p[2]]}>
          <boxGeometry args={[0.04, 0.44, 0.04]} />
          <meshStandardMaterial color="#1e1a14" metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// Teacher desk at front
export function TeacherDesk() {
  return (
    <group position={[0, 0, -7]}>
      <mesh position={[0, 0.88, 0]} castShadow>
        <boxGeometry args={[3.5, 0.08, 1.2]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.4} />
      </mesh>
      {[[-1.6, 0, -0.5], [1.6, 0, -0.5], [-1.6, 0, 0.5], [1.6, 0, 0.5]].map((p, i) => (
        <mesh key={i} position={[p[0], 0.44, p[2]]}>
          <boxGeometry args={[0.07, 0.88, 0.07]} />
          <meshStandardMaterial color="#3a3020" metalness={0.2} />
        </mesh>
      ))}
      {/* Teacher's monitor */}
      <mesh position={[0, 1.35, -0.3]} castShadow>
        <boxGeometry args={[0.9, 0.55, 0.04]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0, 1.35, -0.28]}>
        <planeGeometry args={[0.84, 0.49]} />
        <meshStandardMaterial color="#1a2a3a" emissive="#1a2a3a" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// Dust particles atmosphere
export function DustParticles() {
  const ref = useRef<THREE.Points>(null!);
  const count = 250;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = Math.random() * 8 + 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
  }

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.015;
      const arr = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.0008;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#f0a35a" transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}
