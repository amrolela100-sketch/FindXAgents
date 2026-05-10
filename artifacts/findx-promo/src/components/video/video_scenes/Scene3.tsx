import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const METRICS = [
  { label: 'Website Quality', value: 91, color: '#34d399' },
  { label: 'Social Presence', value: 78, color: '#818cf8' },
  { label: 'Review Score', value: 85, color: '#2563eb' },
  { label: 'Business Activity', value: 94, color: '#34d399' },
];

const INSIGHTS = [
  { icon: '⚡', text: 'High review velocity', tag: 'SIGNAL' },
  { icon: '📍', text: 'Prime location footfall', tag: 'CONTEXT' },
  { icon: '🎯', text: 'Ready for outreach', tag: 'ACTION' },
];

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center"
      style={{ background: 'linear-gradient(150deg, #020817 0%, #0d1030 55%, #020817 100%)' }}
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      exit={{ clipPath: 'inset(0 0 0 100%)' }}
      transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Indigo background glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '60vw',
          height: '60vw',
          top: '-20vh',
          right: '-15vw',
          background: 'radial-gradient(circle, rgba(79,70,229,0.13) 0%, transparent 65%)',
        }}
        animate={{ scale: [1, 1.1, 1], x: [0, -20, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Left: headline */}
      <div className="absolute left-[6vw] top-0 bottom-0 flex flex-col justify-center" style={{ width: '34vw' }}>
        <motion.div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85vw',
            letterSpacing: '0.35em',
            color: 'rgba(129,140,248,0.9)',
            textTransform: 'uppercase',
            marginBottom: '2vh',
          }}
          initial={{ opacity: 0, x: -20 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          AI Analysis
        </motion.div>

        <motion.h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '4.2vw',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'white',
            lineHeight: 1.05,
            marginBottom: '2vh',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          Deep Analysis.
          <br />
          <span style={{ color: '#818cf8' }}>Instant</span>
          <br />
          Intelligence.
        </motion.h2>

        <motion.p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1vw',
            color: 'rgba(148,163,184,0.75)',
            lineHeight: 1.6,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          AI agents visit every website,
          <br />
          score every signal, rank every lead.
        </motion.p>

        {/* Insights */}
        <div style={{ marginTop: '2.5vh', display: 'flex', flexDirection: 'column', gap: '1.2vh' }}>
          {INSIGHTS.map((insight, i) => (
            <motion.div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1vw',
              }}
              initial={{ opacity: 0, x: -15 }}
              animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -15 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: phase >= 3 ? i * 0.12 : 0 }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65vw',
                  letterSpacing: '0.2em',
                  color: 'rgba(129,140,248,0.7)',
                  background: 'rgba(79,70,229,0.12)',
                  padding: '0.3vh 0.6vw',
                  borderRadius: '0.3vw',
                  border: '1px solid rgba(79,70,229,0.25)',
                }}
              >
                {insight.tag}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9vw', color: 'rgba(241,245,249,0.8)' }}>
                {insight.text}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right: score card + metric bars */}
      <div className="absolute right-[5vw] top-0 bottom-0 flex flex-col justify-center" style={{ width: '46vw' }}>
        {/* Overall score ring */}
        <motion.div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2vw',
            marginBottom: '3vh',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          {/* Score ring */}
          <div style={{ position: 'relative', width: '8vw', height: '8vw', flexShrink: 0 }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke="url(#scoreGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="263.9"
                initial={{ strokeDashoffset: 263.9 }}
                animate={phase >= 2 ? { strokeDashoffset: 263.9 * (1 - 0.91) } : { strokeDashoffset: 263.9 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8vw', fontWeight: 700, color: '#34d399' }}>91</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55vw', color: 'rgba(148,163,184,0.6)', letterSpacing: '0.2em' }}>SCORE</span>
            </div>
          </div>

          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4vw', fontWeight: 600, color: 'rgba(241,245,249,0.9)' }}>
              Amsterdam Eats
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8vw', color: 'rgba(52,211,153,0.85)', marginTop: '0.5vh' }}>
              High Priority Lead
            </div>
          </div>
        </motion.div>

        {/* Metric bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8vh' }}>
          {METRICS.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, x: 30 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: phase >= 2 ? 0.1 + i * 0.1 : 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6vh' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85vw', color: 'rgba(148,163,184,0.8)' }}>{metric.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9vw', fontWeight: 600, color: metric.color }}>{metric.value}</span>
              </div>
              <div style={{ height: '0.5vh', background: 'rgba(30,41,59,0.9)', borderRadius: '99px', overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', background: `linear-gradient(90deg, ${metric.color}99, ${metric.color})`, borderRadius: '99px' }}
                  initial={{ width: '0%' }}
                  animate={phase >= 2 ? { width: `${metric.value}%` } : { width: '0%' }}
                  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: phase >= 2 ? 0.2 + i * 0.1 : 0 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Live scanning indicator */}
        <motion.div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8vw',
            marginTop: '2.5vh',
            padding: '1.2vh 1.5vw',
            background: 'rgba(15,23,42,0.7)',
            borderRadius: '0.6vw',
            border: '1px solid rgba(129,140,248,0.2)',
          }}
          initial={{ opacity: 0 }}
          animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#818cf8' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8vw', color: 'rgba(129,140,248,0.8)' }}>
            Scanning 5 more leads...
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
