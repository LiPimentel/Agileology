"use client";

import { useRef } from "react";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Wraps an image/video block's real-size preview with a drag handle at its
 * bottom-right corner, so its "Tamaño" (width%) can be changed by grabbing
 * and dragging right there on the canvas -- like the resize handles on a
 * selected element in Wix -- instead of only through the "Tamaño" slider
 * below it (kept alongside this, for precise/typed adjustment).
 *
 * Only one degree of freedom exists here (width% -- height always follows
 * from the image/video's own aspect ratio, this isn't free XY resizing),
 * so a single corner handle is honest about what's actually adjustable
 * rather than pretending to be a full multi-handle resize box.
 */
export function ResizableBlockBox({
  width,
  onWidthChange,
  maxWidthClass,
  alignClass,
  children,
}: {
  width: number;
  onWidthChange: (width: number) => void;
  maxWidthClass: string;
  alignClass: string;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startWidthPct = useRef(width);
  const startClientX = useRef(0);
  // The pixel width this box would have at 100% -- fixed for the whole
  // drag (computed once at pointerdown from the box's current rendered
  // size), so percentage math stays linear even as width% itself changes
  // mid-drag.
  const fullWidthPx = useRef(0);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || width <= 0) return;
    dragging.current = true;
    startWidthPct.current = width;
    startClientX.current = e.clientX;
    fullWidthPx.current = rect.width / (width / 100);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current || !fullWidthPx.current) return;
    const dx = e.clientX - startClientX.current;
    const deltaPct = (dx / fullWidthPx.current) * 100;
    onWidthChange(clamp(Math.round(startWidthPct.current + deltaPct), 20, 100));
  }
  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div ref={wrapRef} className={`relative ${maxWidthClass} ${alignClass}`} style={{ width: `${width}%` }}>
      {children}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="absolute -bottom-2 -right-2 z-10 h-5 w-5 cursor-nwse-resize touch-none rounded-full border-2 border-white bg-violet-600 shadow-md hover:bg-violet-700"
        title="Arrastra para cambiar el tamaño"
      />
    </div>
  );
}
