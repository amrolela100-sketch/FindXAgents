import { useEffect, useRef, useCallback } from "react";

interface KeyboardShortcutOptions {
  /** Target element to attach listener. Defaults to window. */
  target?: HTMLElement | null;
  /** Only fire when this element (or its descendants) has focus. */
  requireFocus?: boolean;
  /** Ignore when focus is inside an input / textarea / contenteditable. */
  ignoreInputs?: boolean;
  /** Whether the shortcut is currently active. Defaults to true. */
  enabled?: boolean;
}

/**
 * Register a keyboard shortcut with automatic cleanup.
 *
 * @example
 * // Ctrl/Cmd + K → open search
 * useKeyboardShortcut("k", openSearch, { metaKey: true });
 *
 * @example
 * // Escape → close modal
 * useKeyboardShortcut("Escape", closeModal);
 */
export function useKeyboardShortcut(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: KeyboardShortcutOptions & {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  } = {},
): void {
  const {
    target,
    requireFocus = false,
    ignoreInputs = true,
    enabled = true,
    ctrlKey = false,
    metaKey = false,
    shiftKey = false,
    altKey = false,
  } = options;

  // Keep callback ref stable so we don't re-attach on every render
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const handler = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore when typing in inputs unless explicitly allowed
      if (ignoreInputs) {
        const t = event.target as HTMLElement | null;
        if (
          t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.tagName === "SELECT" ||
            t.isContentEditable)
        ) {
          return;
        }
      }

      const keyMatches = event.key === key || event.code === key;
      const ctrlMatches = ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey || event.metaKey;
      const metaMatches = metaKey ? event.metaKey || event.ctrlKey : !event.metaKey || event.ctrlKey;
      const shiftMatches = shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatches = altKey ? event.altKey : !event.altKey;

      // Simpler: just check exactly what was requested
      const modifiersMatch =
        (!ctrlKey || event.ctrlKey || event.metaKey) &&
        (!metaKey || event.metaKey || event.ctrlKey) &&
        (!shiftKey || event.shiftKey) &&
        (!altKey || event.altKey);

      if (keyMatches && modifiersMatch) {
        callbackRef.current(event);
      }
    },
    [enabled, ignoreInputs, key, ctrlKey, metaKey, shiftKey, altKey],
  );

  useEffect(() => {
    if (!enabled) return;

    const el: EventTarget = target ?? window;
    el.addEventListener("keydown", handler as EventListener);
    return () => {
      el.removeEventListener("keydown", handler as EventListener);
    };
  }, [enabled, target, handler]);
}
