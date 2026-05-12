/**
 * MagneticButton — pulls toward cursor using Framer Motion's useMotionValue.
 *
 * PERFORMANCE: NEVER uses useState for animation. All motion values live
 * outside the React render cycle via useMotionValue + useTransform.
 * Safe for production — zero re-renders on mouse move.
 */
import { useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  href?: string;
  strength?: number; // 0–1, default 0.35
  as?: "button" | "a";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function MagneticButton({
  children,
  className = "",
  style,
  onClick,
  href,
  strength = 0.35,
  as: Tag = "button",
  disabled,
  type = "button",
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springConfig = { stiffness: 180, damping: 14, mass: 0.5 };
  const x = useSpring(rawX, springConfig);
  const y = useSpring(rawY, springConfig);

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    rawX.set((e.clientX - cx) * strength);
    rawY.set((e.clientY - cy) * strength);
  }

  function handleMouseLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  const scale = useTransform(
    [rawX, rawY],
    ([lx, ly]: number[]) => {
      const dist = Math.sqrt(lx * lx + ly * ly);
      return 1 + Math.min(dist / 300, 0.04);
    }
  );

  const inner = (
    <motion.div
      ref={ref}
      style={{ x, y, scale, display: "inline-flex" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.97, transition: { duration: 0.08 } }}
    >
      {Tag === "a" ? (
        <a href={href} className={className} style={style} onClick={onClick}>
          {children}
        </a>
      ) : (
        <button
          type={type}
          className={className}
          style={style}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </button>
      )}
    </motion.div>
  );

  return inner;
}
