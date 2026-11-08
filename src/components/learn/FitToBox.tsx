"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Takes whatever space its parent gives it and shrinks its content to fit, so a game never makes
 * the page scroll. The box's size depends only on the screen, never on the content, so nothing
 * shifts when the content changes.
 */
export function FitToBox({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    // ResizeObserver also fires once right away, which sets the first scale.
    const observer = new ResizeObserver(() => {
      const s = Math.min(
        1,
        box.clientHeight / content.offsetHeight,
        box.clientWidth / content.scrollWidth,
      );
      setScale(Number.isFinite(s) && s > 0 ? s : 1);
    });
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outer} className={`relative min-h-0 overflow-hidden ${className}`}>
      <div
        ref={inner}
        className="absolute top-1/2 left-1/2 w-full"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
