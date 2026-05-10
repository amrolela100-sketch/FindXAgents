import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const COLUMNS = [
  { label: 'DISCOVERED', color: '#2563eb', count: 12 },
  { label: 'ANALYZING', color: '#818cf8', count: 8 },
  { label: 'CONTACTED', color: '#fbbf24', count: 5 },
  { label: 'WON', color: '#34d399', count: 3 },
];

const CARDS = [
  { col: 0, name: 'Vondelpark Cafe', score: 87 },
  { col: 0, name: 'Dam Square Diner', score: 83 },
  { col: 1, name: 'Amsterdam Eats', score: 91 },
  { col: 1, name: 'Canal House Bar', score: 78 },
  { col: 2, name: 'Leidseplein Bistro', score: 85 },
  { col: 3, name: 'Jordan Bites', score: 92 },
];

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 4500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col"
      style={{ background: 'linear-gradient(170deg, #020817 0%, #0a1020 50%, #020817 100%)' }}
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      exit={{ clipPath: 'inset(0 0 0 100%)' }}
      transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Blue glow top-right */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '45vw',
          height: '45vw',
          top: '-10vh',
          right: '-5vw',
          background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 65%)',
        }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Header label + title */}
      <div style={{ padding: '4vh 6vw 2vh' }}>
        <motion.div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8vw',
            letterSpacing: '0.35em',
            color: 'rgba(37,99,235,0.9)',
            textTransform: 'uppercase',
            marginBottom: '1.2vh',
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          Live Pipeline
        </motion.div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2vw' }}>
          <motion.h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '3.5vw',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'white',
              lineHeight: 1,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          >
            Every Lead.{' '}
            <span style={{ color: '#2563eb' }}>Every Stage.</span>
          </motion.h2>

          {/* Live badge */}
          <motion.div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5vw',
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.25)',
              borderRadius: '99px',
              padding: '0.4vh 1vw',
            }}
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <motion.div
              style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#34d399' }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7vw', color: 'rgba(52,211,153,0.85)' }}>LIVE</span>
          </motion.div>
        </div>
      </div>

      {/* Kanban board */}
      <div style={{ flex: 1, display: 'flex', gap: '1.2vw', padding: '0 5vw 4vh', overflow: 'hidden' }}>
        {COLUMNS.map((col, colIdx) => {
          const colCards = CARDS.filter(c => c.col === colIdx);

          return (
            <motion.div
              key={col.label}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1vh' }}
              initial={{ opacity: 0, y: 30 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: phase >= 2 ? 0.05 + colIdx * 0.1 : 0 }}
            >
              {/* Column header */}
              <div
                style={{
                  padding: '1vh 1.2vw',
                  background: `${col.color}0d`,
                  border: `1px solid ${col.color}22`,
                  borderRadius: '0.6vw',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65vw', letterSpacing: '0.2em', color: col.color }}>
                  {col.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75vw',
                    fontWeight: 700,
                    color: col.color,
                    background: `${col.color}1a`,
                    padding: '0.15vh 0.5vw',
                    borderRadius: '0.3vw',
                  }}
                >
                  {col.count}
                </span>
              </div>

              {/* Cards */}
              {colCards.map((card, cardIdx) => (
                <motion.div
                  key={card.name}
                  style={{
                    background: 'rgba(15,23,42,0.85)',
                    border: `1px solid ${col.color}1a`,
                    borderRadius: '0.5vw',
                    padding: '1.2vh 1.2vw',
                    backdropFilter: 'blur(8px)',
                  }}
                  initial={{ opacity: 0, y: 15 }}
                  animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: phase >= 3 ? cardIdx * 0.12 : 0 }}
                >
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9vw', fontWeight: 600, color: 'rgba(241,245,249,0.9)', marginBottom: '0.6vh' }}>
                    {card.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ height: '0.3vh', flex: 1, background: 'rgba(30,41,59,0.8)', borderRadius: '99px', overflow: 'hidden', marginRight: '0.8vw' }}>
                      <motion.div
                        style={{ height: '100%', background: col.color, borderRadius: '99px' }}
                        initial={{ width: '0%' }}
                        animate={phase >= 3 ? { width: `${card.score}%` } : { width: '0%' }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: phase >= 3 ? 0.3 + cardIdx * 0.08 : 0 }}
                      />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75vw', fontWeight: 600, color: col.color }}>
                      {card.score}
                    </span>
                  </div>
                </motion.div>
              ))}

              {/* Pulse placeholder for WON column */}
              {colIdx === 3 && (
                <motion.div
                  style={{
                    border: '1px dashed rgba(52,211,153,0.2)',
                    borderRadius: '0.5vw',
                    padding: '1.2vh 1.2vw',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  initial={{ opacity: 0 }}
                  animate={phase >= 4 ? { opacity: [0.3, 0.7, 0.3] } : { opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7vw', color: 'rgba(52,211,153,0.4)' }}>
                    + incoming
                  </span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
