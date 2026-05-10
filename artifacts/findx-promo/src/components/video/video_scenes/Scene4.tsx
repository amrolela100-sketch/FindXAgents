import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const EMAIL_LINES = [
  { delay: 0, text: 'Subject: Grow your reservations with zero extra effort', dim: false },
  { delay: 300, text: '', dim: false },
  { delay: 600, text: 'Hi Sarah,', dim: false },
  { delay: 900, text: '', dim: false },
  { delay: 1200, text: 'I came across Amsterdam Eats while researching top restaurants', dim: true },
  { delay: 1500, text: 'in the Jordaan district. Your 4.8-star rating caught my eye —', dim: true },
  { delay: 1800, text: 'clearly you\'re doing something right.', dim: true },
  { delay: 2100, text: '', dim: false },
  { delay: 2400, text: 'We help restaurants like yours fill 20% more tables per month', dim: false },
  { delay: 2700, text: 'using AI-driven reservation tools. Would a quick call make sense?', dim: false },
];

export function Scene4() {
  const [phase, setPhase] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 4500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase < 2) return;
    const timers = EMAIL_LINES.map((line, i) =>
      setTimeout(() => setVisibleLines(i + 1), line.delay)
    );
    return () => timers.forEach(t => clearTimeout(t));
  }, [phase]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center"
      style={{ background: 'linear-gradient(160deg, #020817 0%, #1a0d00 50%, #020817 100%)' }}
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      exit={{ clipPath: 'inset(0 0 0 100%)' }}
      transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Amber background glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '55vw',
          height: '55vw',
          bottom: '-25vh',
          left: '-10vw',
          background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 65%)',
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Left side: headline */}
      <div className="absolute left-[6vw] top-0 bottom-0 flex flex-col justify-center" style={{ width: '32vw' }}>
        <motion.div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85vw',
            letterSpacing: '0.35em',
            color: 'rgba(251,191,36,0.9)',
            textTransform: 'uppercase',
            marginBottom: '2vh',
          }}
          initial={{ opacity: 0, x: -20 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          Auto Outreach
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
          Personalized.
          <br />
          <span style={{ color: '#fbbf24' }}>Automated.</span>
          <br />
          Sent.
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
          AI writes hyper-personalized emails
          <br />
          using real lead data. You approve.
          <br />
          It sends.
        </motion.p>

        {/* Stats */}
        <motion.div
          style={{ display: 'flex', gap: '2vw', marginTop: '3vh' }}
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {[{ val: '3x', label: 'Open Rate' }, { val: '< 5s', label: 'Generated' }].map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2vw', fontWeight: 700, color: '#fbbf24' }}>{s.val}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8vw', color: 'rgba(148,163,184,0.65)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right side: email card */}
      <div className="absolute right-[5vw] top-0 bottom-0 flex flex-col justify-center" style={{ width: '50vw' }}>
        <motion.div
          style={{
            background: 'rgba(15,23,42,0.9)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: '1vw',
            overflow: 'hidden',
            backdropFilter: 'blur(12px)',
          }}
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={phase >= 2 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.96 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Email header bar */}
          <div
            style={{
              padding: '1.2vh 1.8vw',
              background: 'rgba(251,191,36,0.06)',
              borderBottom: '1px solid rgba(251,191,36,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '1vw',
            }}
          >
            <div style={{ display: 'flex', gap: '0.4vw' }}>
              {['#ef4444', '#fbbf24', '#34d399'].map((c, i) => (
                <div key={i} style={{ width: '0.6vw', height: '0.6vw', borderRadius: '50%', background: c }} />
              ))}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75vw', color: 'rgba(148,163,184,0.6)', flex: 1, textAlign: 'center' }}>
              New Email Draft
            </span>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65vw',
                color: 'rgba(251,191,36,0.7)',
                background: 'rgba(251,191,36,0.1)',
                padding: '0.2vh 0.6vw',
                borderRadius: '0.3vw',
                border: '1px solid rgba(251,191,36,0.2)',
              }}
            >
              AI Generated
            </div>
          </div>

          {/* Recipient */}
          <div
            style={{
              padding: '1vh 1.8vw',
              borderBottom: '1px solid rgba(30,41,59,0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '1vw',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75vw', color: 'rgba(148,163,184,0.5)', width: '3vw' }}>To:</span>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85vw',
                color: 'rgba(52,211,153,0.85)',
                background: 'rgba(52,211,153,0.08)',
                padding: '0.2vh 0.6vw',
                borderRadius: '0.3vw',
              }}
            >
              sarah@amsterdameats.nl
            </div>
          </div>

          {/* Email body */}
          <div style={{ padding: '1.5vh 1.8vw', minHeight: '20vh' }}>
            {EMAIL_LINES.map((line, i) => (
              <motion.div
                key={i}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85vw',
                  color: line.dim ? 'rgba(148,163,184,0.55)' : 'rgba(241,245,249,0.88)',
                  lineHeight: 1.8,
                  minHeight: line.text ? '1.4em' : '0.8em',
                }}
                initial={{ opacity: 0 }}
                animate={i < visibleLines ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {line.text || '\u00A0'}
              </motion.div>
            ))}
          </div>

          {/* Send bar */}
          <div
            style={{
              padding: '1.2vh 1.8vw',
              background: 'rgba(251,191,36,0.05)',
              borderTop: '1px solid rgba(251,191,36,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '1vw',
            }}
          >
            <motion.div
              style={{
                flex: 1,
                height: '0.4vh',
                background: 'rgba(30,41,59,0.8)',
                borderRadius: '99px',
                overflow: 'hidden',
              }}
            >
              <motion.div
                style={{ height: '100%', background: 'linear-gradient(90deg, #fbbf24, #f59e0b)', borderRadius: '99px' }}
                initial={{ width: '0%' }}
                animate={phase >= 3 ? { width: '100%' } : { width: '0%' }}
                transition={{ duration: 3.5, ease: 'linear' }}
              />
            </motion.div>
            <motion.div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75vw',
                color: 'rgba(251,191,36,0.85)',
              }}
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Sending...
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
