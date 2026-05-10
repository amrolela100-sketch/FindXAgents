import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: '#020817' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Expanding ring effect */}
      {[1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full pointer-events-none"
          style={{
            border: '1px solid rgba(37,99,235,0.15)',
            width: `${ring * 20}vw`,
            height: `${ring * 20}vw`,
          }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3 + ring * 0.5, repeat: Infinity, ease: 'easeInOut', delay: ring * 0.4 }}
        />
      ))}

      {/* Background glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '50vw',
          height: '50vw',
          background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, rgba(79,70,229,0.1) 40%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)',
          backgroundSize: '5vw 5vw',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <motion.div
          style={{
            width: '8vw',
            height: '8vw',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            borderRadius: '1.4vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '3.5vh',
            boxShadow: '0 0 5vw rgba(37,99,235,0.5)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <svg viewBox="0 0 24 24" style={{ width: '55%', height: '55%', fill: 'white' }}>
            <path d="M13 2L8 11H11L7 22L15 9H12L13 2Z" />
          </svg>
        </motion.div>

        {/* FINDX */}
        <motion.div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '8vw',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: 'white',
            lineHeight: 0.95,
            textAlign: 'center',
          }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.15 }}
        >
          FINDX
        </motion.div>

        {/* Divider */}
        <motion.div
          style={{
            width: '10vw',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.8), rgba(79,70,229,0.8), transparent)',
            margin: '2.5vh 0',
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={phase >= 2 ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Taglines */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8vh' }}>
          <motion.p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.4vw',
              fontWeight: 600,
              color: 'rgba(241,245,249,0.92)',
              letterSpacing: '-0.01em',
            }}
            initial={{ opacity: 0, y: 18 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            Prospect Smarter.
          </motion.p>
          <motion.p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.4vw',
              fontWeight: 600,
              color: '#2563eb',
              letterSpacing: '-0.01em',
            }}
            initial={{ opacity: 0, y: 18 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            Close Faster.
          </motion.p>
        </div>

        {/* Feature tags */}
        <motion.div
          style={{ display: 'flex', gap: '1vw', marginTop: '3.5vh' }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {['Discover', 'Analyze', 'Outreach', 'Pipeline'].map((tag, i) => (
            <motion.div
              key={tag}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75vw',
                letterSpacing: '0.2em',
                color: 'rgba(148,163,184,0.75)',
                background: 'rgba(30,41,59,0.6)',
                padding: '0.5vh 1vw',
                borderRadius: '99px',
                border: '1px solid rgba(37,99,235,0.2)',
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22, delay: phase >= 3 ? i * 0.08 : 0 }}
            >
              {tag.toUpperCase()}
            </motion.div>
          ))}
        </motion.div>

        {/* Floating dots around logo */}
        {phase >= 4 && (
          <>
            {[...Array(8)].map((_, i) => {
              const angle = (i / 8) * 360;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * 18;
              const y = Math.sin(rad) * 18;
              return (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    width: '0.4vw',
                    height: '0.4vw',
                    borderRadius: '50%',
                    background: i % 2 === 0 ? '#2563eb' : '#4f46e5',
                    left: `calc(50% + ${x}vw)`,
                    top: `calc(50% + ${y}vh)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.5 + i * 0.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
                />
              );
            })}
          </>
        )}
      </div>
    </motion.div>
  );
}
