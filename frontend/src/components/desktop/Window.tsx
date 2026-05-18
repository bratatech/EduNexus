import { useEffect, useRef, useState, type ReactNode } from "react";
import { Minus, Square, X, Maximize2 } from "lucide-react";
import {
  useWindowManager,
  clampWindowSize,
  getViewportWorkArea,
  WINDOW_TITLE_BAR_H,
  type WindowId,
} from "@/lib/window-manager";
import { cn } from "@/lib/utils";

interface Props {
  id: WindowId;
  children: ReactNode;
}

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const RESIZE_CURSORS: Record<ResizeDir, string> = {
  n: "cursor-n-resize", s: "cursor-s-resize", e: "cursor-e-resize", w: "cursor-w-resize",
  ne: "cursor-ne-resize", nw: "cursor-nw-resize", se: "cursor-se-resize", sw: "cursor-sw-resize",
};

export function Window({ id, children }: Props) {
  const { windows, close, minimize, maximize, focus, move, resize, topId } = useWindowManager();
  const w = windows[id];
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const resizeRef = useRef<{
    dir: ResizeDir; sx: number; sy: number;
    ow: number; oh: number; ox: number; oy: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  // Dragging
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.sx;
      const dy = e.clientY - drag.current.sy;
      const nx = Math.max(-200, Math.min(window.innerWidth - 100, drag.current.ox + dx));
      const ny = Math.max(32, Math.min(window.innerHeight - 60, drag.current.oy + dy));
      move(id, { x: nx, y: ny });
    }
    function onUp() {
      drag.current = null;
      setDragging(false);
    }
    if (dragging) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
    }
  }, [dragging, id, move]);

  // Resizing
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!resizeRef.current) return;
      const r = resizeRef.current;
      const dx = e.clientX - r.sx;
      const dy = e.clientY - r.sy;
      let newW = r.ow, newH = r.oh, newX = r.ox, newY = r.oy;

      if (r.dir.includes("e")) newW = r.ow + dx;
      if (r.dir.includes("w")) { newW = r.ow - dx; newX = r.ox + dx; }
      if (r.dir.includes("s")) newH = r.oh + dy;
      if (r.dir.includes("n")) { newH = r.oh - dy; newY = r.oy + dy; }

      const vp = getViewportWorkArea();
      const maxW = Math.min(w.maxSize?.w ?? vp.w, vp.w);
      const maxH = Math.min(w.maxSize?.h ?? vp.h, vp.h);
      const minW = w.minSize.w;
      const minH = w.minSize.h;

      if (newW < minW) { if (r.dir.includes("w")) newX = r.ox + r.ow - minW; newW = minW; }
      if (newH < minH) { if (r.dir.includes("n")) newY = r.oy + r.oh - minH; newH = minH; }
      if (newW > maxW) { if (r.dir.includes("w")) newX = r.ox + r.ow - maxW; newW = maxW; }
      if (newH > maxH) { if (r.dir.includes("n")) newY = r.oy + r.oh - maxH; newH = maxH; }

      newY = Math.max(WINDOW_TITLE_BAR_H, newY);

      const clamped = clampWindowSize(w, { w: newW, h: newH });
      resize(id, clamped);
      if (r.dir.includes("w") || r.dir.includes("n")) move(id, { x: newX, y: newY });
    }
    function onUp() {
      resizeRef.current = null;
      setResizing(false);
    }
    if (resizing) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
    }
  }, [resizing, id, move, resize, w]);

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && topId === id) close(id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, topId, close]);

  if (!w.isOpen || w.isMinimized) return null;

  const isTop = topId === id;

  function startResize(e: React.PointerEvent, dir: ResizeDir) {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    resizeRef.current = {
      dir, sx: e.clientX, sy: e.clientY,
      ow: w.size.w, oh: w.size.h, ox: w.position.x, oy: w.position.y,
    };
    setResizing(true);
    focus(id);
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={w.title}
      onPointerDown={() => focus(id)}
      className={cn(
        "absolute flex flex-col rounded-lg border border-border bg-surface text-foreground overflow-hidden",
        !w.isMaximized && "window-shadow",
        !isTop && "opacity-95",
        (dragging || resizing) ? "" : "transition-[width,height] duration-0"
      )}
      style={{
        left: w.position.x,
        top: w.position.y,
        width: w.size.w,
        height: w.size.h,
        zIndex: w.zIndex,
      }}
    >
      {/* Title bar */}
      <div
        onPointerDown={(e) => {
          if (w.isMaximized) return;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          drag.current = { ox: w.position.x, oy: w.position.y, sx: e.clientX, sy: e.clientY };
          setDragging(true);
        }}
        onDoubleClick={() => maximize(id)}
        className={cn(
          "relative flex items-center justify-between px-3 h-9 select-none border-b border-border font-mono text-xs uppercase tracking-widest",
          !w.isMaximized && "cursor-grab active:cursor-grabbing",
          isTop ? "bg-surface-2 text-primary" : "bg-surface-2/70 text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", isTop ? "bg-primary animate-flicker" : "bg-muted-foreground")} />
          <span className="truncate">{w.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Minimize"
            onClick={(e) => { e.stopPropagation(); minimize(id); }}
            className="grid place-items-center h-5 w-5 rounded-sm border border-border bg-surface hover:bg-primary/20 hover:text-primary transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            aria-label="Maximize"
            onClick={(e) => { e.stopPropagation(); maximize(id); }}
            className="grid place-items-center h-5 w-5 rounded-sm border border-border bg-surface hover:bg-cyan-signal/20 transition-colors"
          >
            {w.isMaximized ? <Square className="h-2.5 w-2.5" /> : <Maximize2 className="h-3 w-3" />}
          </button>
          <button
            aria-label="Close"
            onClick={(e) => { e.stopPropagation(); close(id); }}
            className="grid place-items-center h-5 w-5 rounded-sm border border-destructive/40 bg-surface hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        {isTop && <div className="scan-line" />}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-background/40">{children}</div>

      {/* Resize handles */}
      {!w.isMaximized && (
        <>
          {(["n","s","e","w","ne","nw","se","sw"] as ResizeDir[]).map((dir) => {
            const isCorner = dir.length === 2;
            const base = "absolute z-50 ";
            let pos = "";
            if (dir === "n") pos = "top-0 left-2 right-2 h-1.5 cursor-n-resize";
            if (dir === "s") pos = "bottom-0 left-2 right-2 h-1.5 cursor-s-resize";
            if (dir === "e") pos = "top-2 bottom-2 right-0 w-1.5 cursor-e-resize";
            if (dir === "w") pos = "top-2 bottom-2 left-0 w-1.5 cursor-w-resize";
            if (dir === "ne") pos = "top-0 right-0 w-3 h-3 cursor-ne-resize";
            if (dir === "nw") pos = "top-0 left-0 w-3 h-3 cursor-nw-resize";
            if (dir === "se") pos = "bottom-0 right-0 w-3 h-3 cursor-se-resize";
            if (dir === "sw") pos = "bottom-0 left-0 w-3 h-3 cursor-sw-resize";
            return (
              <div
                key={dir}
                className={base + pos}
                onPointerDown={(e) => startResize(e, dir)}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
