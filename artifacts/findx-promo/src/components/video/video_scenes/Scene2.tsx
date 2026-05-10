import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const COMPANIES = [
  { name: 'Amsterdam Eats', score: 94, tag: 'Restaurant', color: '#34d399' },
  { name: 'Vondelpark Cafe', score: 87, tag: 'Cafe', color: '#2563eb' },
  { name: 'Leidseplein Bistro', score: 91, tag: 'Bistro', color: '#34d399' },
  { name: 'Canal House Bar', score: 78, tag: 'Bar', color: '#818cf8' },
  { name: 'Dam Square Diner', score: 83, tag: 'Diner', color: '#2563eb' },
];

export function Scene2() {
  const [phase, setPhase] = useState(0);
  const [typedText, setTypedText] = useState('');
  const fullQuery = 'restaurants in Amsterdam';

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase < 1) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullQuery.length) {
        setTypedText(fullQuery.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 55);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center"
      style={{ background: 'linear-gradient(160deg, #020817 0%, #0a1628 60%, #020817 100%)' }}
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      exit={{ clipPath: 'inset(0 0 0 100%)' }}
      transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Background glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '50vw',
          height: '50vw',
          top: '10vh',
          left: '-10vw',
          background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 65%)',
        }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Left side: label + search bar */}
      <div className="absolute left-[6vw] top-0 bottom-0 flex flex-col justify-center" style={{ width: '40vw' }}>
        {/* Label */}
        <motion.div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9vw',
            letterSpacing: '0.3em',
            color: 'rgba(37,99,235,0.9)',
            textTransform: 'uppercase',
            marginBottom: '2vh',
          }}
          initial={{ opacity: 0, x: -20 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          Prospecting Query
        </motion.div>

        {/* Search bar */}
        <motion.div
          style={{
            background: 'rgba(30,41,59,0.8)',
            border: '1px solid rgba(37,99,235,0.4)',
            borderRadius: '0.8vw',
            padding: '1.4vh 1.8vw',
            display: 'flex',
            alignItems: 'center',
            gap: '1vw',
            marginBottom: '3vh',
            backdropFilter: 'blur(8px)',
          }}
          initial={{ opacity: 0, y: 20, scaleX: 0.9 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, scaleX: 1 } : { opacity: 0, y: 20, scaleX: 0.9 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <svg viewBox="0 0 24 24" style={{ width: '1.5vw', height: '1.5vw', fill: 'rgba(37,99,235,0.8)', flexShrink: 0 }}>
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="rgba(37,99,235,0.8)" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.2vw',
              color: 'rgba(241,245,249,0.9)',
            }}
          >
            {typedText}
            <motion.span
              style={{ opacity: 1 }}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              |
            </motion.span>
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '4.5vw',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'white',
            lineHeight: 1.05,
            marginBottom: '1.5vh',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          Discover
          <br />
          <span style={{ color: '#2563eb' }}>Any Business</span>
          <br />
          Instantly
        </motion.h2>

        <motion.p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.05vw',
            color: 'rgba(148,163,184,0.8)',
            letterSpacing: '0.02em',
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          Natural language search &rarr; instant results
        </motion.p>

        {/* Stats row */}
        <motion.div
          style={{
            display: 'flex',
            gap: '2vw',
            marginTop: '2.5vh',
          }}
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {[{ val: '50M+', label: 'Businesses' }, { val: '180+', label: 'Countries' }].map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2vw', fontWeight: 700, color: '#2563eb' }}>{s.val}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85vw', color: 'rgba(148,163,184,0.7)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right side: company cards */}
      <div
        className="absolute right-[6vw] top-0 bottom-0 flex flex-col justify-center"
        style={{ width: '40vw', gap: '1.2vh' }}
      >
        {COMPANIES.map((company, i) => (
          <motion.div
            key={company.name}
            style={{
              background: 'rgba(15,23,42,0.85)',
              border: `1px solid rgba(${company.color === '#34d399' ? '52,211,153' : company.color === '#2563eb' ? '37,99,235' : '129,140,248'},0.25)`,
              borderRadius: '0.7vw',
              padding: '1.2vh 1.5vw',
              display: 'flex',
              alignItems: 'center',
              gap: '1.2vw',
              backdropFilter: 'blur(8px)',
            }}
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: phase >= 2 ? 0.1 + i * 0.1 : 0 }}
          >
            {/* Avatar */}
            <div
              style={{
                width: '2.8vw',
                height: '2.8vw',
                borderRadius: '0.5vw',
                background: `linear-gradient(135deg, ${company.color}33, ${company.color}11)`,
                border: `1px solid ${company.color}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9vw', fontWeight: 700, color: company.color }}>
                {company.name[0]}
              </span>
            </div>

            {/* Name + tag */}
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1vw', fontWeight: 600, color: 'rgba(241,245,249,0.92)' }}>
                {company.name}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75vw', color: 'rgba(148,163,184,0.65)', marginTop: '0.3vh' }}>
                {company.tag}
              </div>
            </div>

            {/* Score */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1vw', fontWeight: 700, color: company.color }}>
                {company.score}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65vw', color: 'rgba(148,163,184,0.5)', letterSpacing: '0.15em' }}>
                SCORE
              </div>
            </div>
          </motion.div>
        ))}

        {/* "AI analyzing..." indicator */}
        <motion.div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8vw',
            padding: '1vh 1.5vw',
          }}
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            style={{ width: '0.6vw', height: '0.6vw', borderRadius: '50%', background: '#34d399' }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85vw', color: 'rgba(52,211,153,0.85)' }}>
            AI agents analyzing leads...
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
