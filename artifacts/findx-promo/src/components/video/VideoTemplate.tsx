import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

export const SCENE_DURATIONS: Record<string, number> = {
  hero: 6000,
  discover: 8000,
  analyze: 8500,
  outreach: 8000,
  pipeline: 8500,
  close: 7000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hero: Scene1,
  discover: Scene2,
  analyze: Scene3,
  outreach: Scene4,
  pipeline: Scene5,
  close: Scene6,
};

const ORBS = [
  { x: ['5vw', '55vw', '25vw', '5vw'], y: ['8vh', '40vh', '65vh', '8vh'], dur: 18 },
  { x: ['70vw', '20vw', '80vw', '70vw'], y: ['60vh', '15vh', '45vh', '60vh'], dur: 22 },
  { x: ['40vw', '75vw', '10vw', '40vw'], y: ['30vh', '70vh', '20vh', '30vh'], dur: 15 },
];

const ORBS_COLOR = ['rgba(37,99,235,0.12)', 'rgba(79,70,229,0.1)', 'rgba(37,99,235,0.08)'];

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  // Persistent orb positions per scene
  const orbScalePerScene = [1.2, 0.9, 1.1, 0.95, 1.15, 1.3];

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#020817' }}>
      {/* Hero video background - visible only on first scene */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: sceneIndex === 0 ? 0.35 : 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          src={`${import.meta.env.BASE_URL}videos/hero-bg.mp4`}
        />
      </motion.div>

      {/* Persistent drifting orbs - live OUTSIDE AnimatePresence */}
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '40vw',
            height: '40vw',
            background: `radial-gradient(circle, ${ORBS_COLOR[i]} 0%, transparent 70%)`,
          }}
          animate={{
            x: orb.x,
            y: orb.y,
            scale: orbScalePerScene[sceneIndex] ?? 1,
          }}
          transition={{
            x: { duration: orb.dur, repeat: Infinity, ease: 'easeInOut' },
            y: { duration: orb.dur * 0.9, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
          }}
        />
      ))}

      {/* Persistent accent line - transforms with currentScene */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ height: '1px' }}
        animate={{
          left: ['5%', '10%', '55%', '5%', '30%', '20%'][sceneIndex] ?? '10%',
          width: ['30%', '45%', '20%', '40%', '35%', '25%'][sceneIndex] ?? '30%',
          top: ['48%', '35%', '62%', '40%', '70%', '50%'][sceneIndex] ?? '48%',
          background: [
            'linear-gradient(90deg, rgba(37,99,235,0.6), rgba(79,70,229,0.4), transparent)',
            'linear-gradient(90deg, rgba(37,99,235,0.4), rgba(52,211,153,0.3), transparent)',
            'linear-gradient(90deg, rgba(79,70,229,0.6), rgba(129,140,248,0.4), transparent)',
            'linear-gradient(90deg, rgba(251,191,36,0.4), rgba(245,158,11,0.3), transparent)',
            'linear-gradient(90deg, rgba(37,99,235,0.5), rgba(52,211,153,0.3), transparent)',
            'linear-gradient(90deg, rgba(37,99,235,0.7), rgba(79,70,229,0.5), transparent)',
          ][sceneIndex] ?? 'linear-gradient(90deg, rgba(37,99,235,0.5), transparent)',
          opacity: 0.7,
        }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Scene-specific foreground inside AnimatePresence */}
      <AnimatePresence initial={false} mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
