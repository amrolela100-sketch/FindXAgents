import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 80),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const chars = 'FINDX'.split('');

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #020817 0%, #0d1a38 50%, #020817 100%)' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ scale: 1.08, opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px)',
          backgroundSize: '5vw 5vw',
        }}
      />

      {/* Drifting glow orbs - short enough durations for visible motion */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '55vw',
          height: '55vw',
          top: '-15vh',
          left: '-15vw',
          background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)',
        }}
        animate={{ x: [0, 40, 0], y: [0, 20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '40vw',
          height: '40vw',
          bottom: '-10vh',
          right: '-10vw',
          background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 65%)',
        }}
        animate={{ x: [0, -30, 0], y: [0, -20, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      />

      {/* Floating accent dots */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${0.4 + i * 0.15}vw`,
            height: `${0.4 + i * 0.15}vw`,
            background: i % 2 === 0 ? 'rgba(37,99,235,0.6)' : 'rgba(129,140,248,0.5)',
            left: `${10 + i * 14}vw`,
            top: `${20 + (i % 3) * 25}vh`,
          }}
          animate={{ y: [0, -12, 0], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Lightning bolt logo */}
        <motion.div
          style={{
            width: '7vw',
            height: '7vw',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            borderRadius: '1.2vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '3vh',
            boxShadow: '0 0 4vw rgba(37,99,235,0.4)',
          }}
          initial={{ scale: 0, rotateY: -90 }}
          animate={phase >= 1 ? { scale: 1, rotateY: 0 } : { scale: 0, rotateY: -90 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <svg
            viewBox="0 0 24 24"
            style={{ width: '55%', height: '55%', fill: 'white' }}
          >
            <motion.path
              d="M13 2L8 11H11L7 22L15 9H12L13 2Z"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={phase >= 1 ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              stroke="white"
              strokeWidth="0.5"
              fill="white"
            />
          </svg>
        </motion.div>

        {/* FINDX kinetic type */}
        <div style={{ perspective: '1000px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '11vw',
              fontWeight: 700,
              letterSpacing: '-0.05em',
              lineHeight: 1,
              color: 'white',
              display: 'flex',
              gap: '0.02em',
            }}
          >
            {chars.map((char, i) => (
              <motion.span
                key={i}
                style={{ display: 'inline-block' }}
                initial={{ opacity: 0, y: 90, rotateX: -60 }}
                animate={
                  phase >= 2
                    ? { opacity: 1, y: 0, rotateX: 0 }
                    : { opacity: 0, y: 90, rotateX: -60 }
                }
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 26,
                  delay: phase >= 2 ? i * 0.07 : 0,
                }}
              >
                {char}
              </motion.span>
            ))}
          </h1>
        </div>

        {/* Subtitle */}
        <motion.p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.3vw',
            letterSpacing: '0.35em',
            color: 'rgba(148,163,184,0.85)',
            marginTop: '2vh',
            textTransform: 'uppercase',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          AI Prospecting Platform
        </motion.p>

        {/* Accent divider */}
        <div style={{ marginTop: '2.5vh', display: 'flex', alignItems: 'center', gap: '1vw' }}>
          <motion.div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #2563eb)',
              transformOrigin: 'right',
            }}
            initial={{ width: 0, opacity: 0 }}
            animate={phase >= 4 ? { width: '8vw', opacity: 1 } : { width: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            style={{
              width: '0.5vw',
              height: '0.5vw',
              borderRadius: '50%',
              background: '#2563eb',
            }}
            initial={{ scale: 0 }}
            animate={phase >= 4 ? { scale: 1 } : { scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.4 }}
          />
          <motion.div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, #4f46e5, transparent)',
              transformOrigin: 'left',
            }}
            initial={{ width: 0, opacity: 0 }}
            animate={phase >= 4 ? { width: '8vw', opacity: 1 } : { width: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </motion.div>
  );
}
