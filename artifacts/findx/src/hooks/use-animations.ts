import { useEffect, useRef, useState, useCallback } from "react";

/* ─────────────────────────────────────────
   useScrollReveal
   Adds .visible to elements when they enter the viewport.
   Usage: pass a container ref — all .reveal-item children inside will animate.
───────────────────────────────────────── */
export function useScrollReveal(containerRef?: React.RefObject<Element | null>) {
  useEffect(() => {
    const root = containerRef?.current ?? document;
    const items = root.querySelectorAll<HTMLElement>(".reveal-item:not(.visible)");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerRef]);
}

/* ─────────────────────────────────────────
   useCounterAnimation
   Counts from 0 to `target` when element enters viewport.
   Returns a ref to attach to the element.
───────────────────────────────────────── */
export function useCounterAnimation(
  target: number,
  duration = 1800,
  isFloat = false
) {
  const elRef = useRef<HTMLElement | null>(null);
  const animatedRef = useRef(false);

  const animate = useCallback(() => {
    const el = elRef.current;
    if (!el || animatedRef.current) return;
    animatedRef.current = true;

    const start = performance.now();
    function update(time: number) {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      el.textContent = isFloat
        ? current.toFixed(1) + "%"
        : Math.floor(current).toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }, [target, duration, isFloat]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  return elRef;
}

/* ─────────────────────────────────────────
   useTypewriter
   Types `text` char by char when `active` is true.
   Returns { displayText, isDone }
───────────────────────────────────────── */
export function useTypewriter(text: string, speed = 18, active = true) {
  const [displayText, setDisplayText] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!active || !text) {
      setDisplayText(text || "");
      setIsDone(true);
      return;
    }
    setDisplayText("");
    setIsDone(false);
    let i = 0;
    let cancelled = false;

    function type() {
      if (cancelled) return;
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
        setTimeout(type, speed);
      } else {
        setIsDone(true);
      }
    }
    type();
    return () => { cancelled = true; };
  }, [text, speed, active]);

  return { displayText, isDone };
}
