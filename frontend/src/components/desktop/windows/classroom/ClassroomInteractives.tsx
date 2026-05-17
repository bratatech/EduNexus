import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

// Student data
export interface StudentData {
  id: number;
  name: string;
  color: string;
  benchPos: [number, number, number];
}

/* eslint-disable-next-line react-refresh/only-export-components */
export const STUDENTS: StudentData[] = [
  { id: 0, name: "Alex", color: "#c07040", benchPos: [-5, 0, -2] },
  { id: 1, name: "Jordan", color: "#907050", benchPos: [-2, 0, -2] },
  { id: 2, name: "Mira", color: "#b08060", benchPos: [2, 0, -2] },
  { id: 3, name: "Theo", color: "#a06848", benchPos: [5, 0, -2] },
  { id: 4, name: "Sana", color: "#8a6050", benchPos: [-5, 0, 1.5] },
  { id: 5, name: "Diego", color: "#c88060", benchPos: [-2, 0, 1.5] },
  { id: 6, name: "Lena", color: "#b07848", benchPos: [2, 0, 1.5] },
  { id: 7, name: "Kai", color: "#9a7058", benchPos: [5, 0, 1.5] },
  { id: 8, name: "Priya", color: "#c09068", benchPos: [-5, 0, 5] },
  { id: 9, name: "Yuki", color: "#a87850", benchPos: [-2, 0, 5] },
  { id: 10, name: "Omar", color: "#b88858", benchPos: [2, 0, 5] },
  { id: 11, name: "Zara", color: "#c08048", benchPos: [5, 0, 5] },
];

// Individual student 3D character
interface StudentProps {
  student: StudentData;
  isPresent: boolean;
  onMark: (id: number) => void;
}

export function StudentCharacter({ student, isPresent, onMark }: StudentProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Group>(null!);
  const checkRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const animating = useRef(false);

  // Seat position offset from bench
  const seatX = student.benchPos[0];
  const seatY = student.benchPos[1] + 0.48;
  const seatZ = student.benchPos[2] + 0.45;

  // Subtle idle animation
  useFrame((state) => {
    if (bodyRef.current && !animating.current) {
      bodyRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.4 + student.id * 1.3) * 0.02;
    }
    if (glowRef.current && isPresent) {
      glowRef.current.material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
    }
  });

  function handleClick() {
    if (isPresent || animating.current) return;
    animating.current = true;
    onMark(student.id);

    const body = bodyRef.current;
    const check = checkRef.current;
    if (!body || !check) { animating.current = false; return; }

    // GSAP stand-up → wave → sit-down
    const tl = gsap.timeline({
      onComplete: () => { animating.current = false; },
    });

    tl.to(body.position, { y: 0.35, duration: 0.3, ease: "back.out(1.7)" })
      .to(body.rotation, { z: 0.15, duration: 0.15, ease: "power2.out" }, "-=0.1")
      .to(body.rotation, { z: -0.15, duration: 0.15, ease: "power2.out" })
      .to(body.rotation, { z: 0, duration: 0.15, ease: "power2.out" })
      .to(body.position, { y: 0, duration: 0.25, ease: "power2.in" })
      .fromTo(check.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: 0.35, ease: "elastic.out(1.2, 0.5)" }, "-=0.15");
  }

  return (
    <group ref={groupRef} position={[seatX, seatY, seatZ]}>
      {/* Clickable area */}
      <mesh
        position={[0, 0.6, 0]}
        onClick={handleClick}
        onPointerOver={(e) => { if (!isPresent) { e.stopPropagation(); document.body.style.cursor = "pointer"; } }}
        onPointerOut={() => { document.body.style.cursor = "default"; }}
      >
        <boxGeometry args={[0.8, 1.6, 0.6]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>

      <group ref={bodyRef}>
        {/* Head */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <sphereGeometry args={[0.17, 16, 16]} />
          <meshStandardMaterial color={student.color} roughness={0.6} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.06, 1.17, 0.15]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0.06, 1.17, 0.15]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        {/* Torso */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[0.34, 0.45, 0.22]} />
          <meshStandardMaterial color={student.color} roughness={0.5} />
        </mesh>
        {/* Left arm */}
        <mesh position={[-0.24, 0.75, 0]} castShadow>
          <boxGeometry args={[0.1, 0.35, 0.12]} />
          <meshStandardMaterial color={student.color} roughness={0.6} />
        </mesh>
        {/* Right arm */}
        <mesh position={[0.24, 0.75, 0]} castShadow>
          <boxGeometry args={[0.1, 0.35, 0.12]} />
          <meshStandardMaterial color={student.color} roughness={0.6} />
        </mesh>
        {/* Left leg (seated: horizontal) */}
        <mesh position={[-0.1, 0.5, 0.15]} rotation={[Math.PI / 2.5, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 0.35, 0.12]} />
          <meshStandardMaterial color="#2a2520" roughness={0.7} />
        </mesh>
        {/* Right leg (seated: horizontal) */}
        <mesh position={[0.1, 0.5, 0.15]} rotation={[Math.PI / 2.5, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 0.35, 0.12]} />
          <meshStandardMaterial color="#2a2520" roughness={0.7} />
        </mesh>
      </group>

      {/* Attendance glow ring (shows when present) */}
      {isPresent && (
        <mesh ref={glowRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.5, 32]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Check mark (hidden until clicked, animated by GSAP) */}
      <group ref={checkRef} position={[0, 1.55, 0]} scale={isPresent ? [1, 1, 1] : [0, 0, 0]}>
        <Text fontSize={0.2} color="#4ade80" anchorX="center" anchorY="middle">
          ✓
        </Text>
      </group>

      {/* Name label */}
      <Text
        position={[0, 1.45, 0]}
        fontSize={0.1}
        color={isPresent ? "#4ade80" : "#e8d5c0"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#000"
      >
        {student.name}
      </Text>
    </group>
  );
}

// Camera entrance animation
export function CameraAnimation() {
  const { camera } = useThree();
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current) return;
    animated.current = true;

    // Start from far overview
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 3, -2);

    // Animate to classroom view
    gsap.to(camera.position, {
      x: 0,
      y: 7,
      z: 12,
      duration: 2.5,
      ease: "power2.inOut",
      onUpdate: () => camera.lookAt(0, 3, -2),
    });
  }, [camera]);

  return null;
}

// Smartboard with YouTube embed
export function Smartboard() {
  const videoUrl = typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_YOUTUBE_VIDEO_URL || "https://www.youtube.com/embed/dQw4w9WgXcQ"
    : "https://www.youtube.com/embed/dQw4w9WgXcQ";

  return (
    <group position={[0, 5, -8.85]}>
      {/* Board frame — outer */}
      <mesh>
        <boxGeometry args={[11, 5.5, 0.15]} />
        <meshStandardMaterial color="#2a2418" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Glowing edge */}
      <mesh position={[0, 0, 0.08]}>
        <boxGeometry args={[10.6, 5.1, 0.01]} />
        <meshStandardMaterial color="#f0a35a" emissive="#f0a35a" emissiveIntensity={0.15} transparent opacity={0.3} />
      </mesh>
      {/* Screen surface */}
      <mesh position={[0, 0, 0.09]}>
        <planeGeometry args={[10.2, 4.8]} />
        <meshStandardMaterial color="#0a0a0f" roughness={0.2} />
      </mesh>
      {/* YouTube iframe embed */}
      <Html
        transform
        position={[0, 0, 0.1]}
        scale={0.55}
        occlude={false}
        style={{ pointerEvents: "auto" }}
      >
        <iframe
          width="960"
          height="450"
          src={videoUrl}
          title="Classroom Video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            borderRadius: "4px",
            border: "1px solid rgba(240,163,90,0.2)",
          }}
        />
      </Html>
      {/* "LIVE CLASS" label */}
      <Text
        position={[-4.5, 2.85, 0.1]}
        fontSize={0.18}
        color="#f0a35a"
        anchorX="left"
        anchorY="middle"
      >
        ● LIVE CLASS
      </Text>
    </group>
  );
}

// Celebration particles when all present
export function CelebrationParticles({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null!);
  const count = 150;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = Math.random() * 3 + 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      vel[i * 3] = (Math.random() - 0.5) * 0.05;
      vel[i * 3 + 1] = -Math.random() * 0.03 - 0.01;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame(() => {
    if (!ref.current || !active) return;
    const arr = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i * 3];
      arr[i * 3 + 1] += velocities[i * 3 + 1];
      arr[i * 3 + 2] += velocities[i * 3 + 2];
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = Math.random() * 3 + 7;
        arr[i * 3] = (Math.random() - 0.5) * 12;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#fbbf24" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}
