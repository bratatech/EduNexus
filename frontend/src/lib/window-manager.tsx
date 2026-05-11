import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type WindowId =
  | "readme"
  | "programs"
  | "instructors"
  | "enroll"
  | "firefox"
  | "vscode"
  | "terminal"
  | "settings"
  | "courses"
  | "classroom"
  | "community"
  | "profile"
  | "tutor"
  | "summarizer";

export interface WindowState {
  id: WindowId;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { w: number; h: number };
  prevPosition?: { x: number; y: number };
  prevSize?: { w: number; h: number };
  zIndex: number;
  minSize: { w: number; h: number };
}

interface Ctx {
  windows: Record<WindowId, WindowState>;
  order: WindowId[];
  open: (id: WindowId) => void;
  close: (id: WindowId) => void;
  minimize: (id: WindowId) => void;
  maximize: (id: WindowId) => void;
  focus: (id: WindowId) => void;
  move: (id: WindowId, pos: { x: number; y: number }) => void;
  resize: (id: WindowId, size: { w: number; h: number }) => void;
  topId: WindowId | null;
}

const WindowCtx = createContext<Ctx | null>(null);

const DEFAULTS: Record<WindowId, Omit<WindowState, "zIndex">> = {
  readme: {
    id: "readme",
    title: "readme.txt — EduNexuZ",
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    position: { x: 120, y: 70 },
    size: { w: 820, h: 540 },
    minSize: { w: 400, h: 300 },
  },
  programs: {
    id: "programs",
    title: "programs/ — File Manager",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 200, y: 100 },
    size: { w: 880, h: 560 },
    minSize: { w: 500, h: 350 },
  },
  instructors: {
    id: "instructors",
    title: "instructors/ — Network",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 240, y: 130 },
    size: { w: 860, h: 560 },
    minSize: { w: 500, h: 350 },
  },
  enroll: {
    id: "enroll",
    title: "enroll.form — Secure Channel",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 300, y: 90 },
    size: { w: 720, h: 580 },
    minSize: { w: 400, h: 400 },
  },
  firefox: {
    id: "firefox",
    title: "Mozilla Firefox",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 80, y: 40 },
    size: { w: 960, h: 620 },
    minSize: { w: 500, h: 350 },
  },
  vscode: {
    id: "vscode",
    title: "Visual Studio Code",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 100, y: 50 },
    size: { w: 960, h: 600 },
    minSize: { w: 600, h: 400 },
  },
  terminal: {
    id: "terminal",
    title: "Terminal",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 280, y: 140 },
    size: { w: 760, h: 460 },
    minSize: { w: 400, h: 250 },
  },
  settings: {
    id: "settings",
    title: "Settings",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 220, y: 100 },
    size: { w: 800, h: 570 },
    minSize: { w: 500, h: 400 },
  },
  courses: {
    id: "courses",
    title: "Courses — EduVerse",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 160, y: 80 },
    size: { w: 900, h: 600 },
    minSize: { w: 600, h: 400 },
  },
  classroom: {
    id: "classroom",
    title: "Live Classroom — 3D",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 100, y: 50 },
    size: { w: 960, h: 620 },
    minSize: { w: 600, h: 400 },
  },
  community: {
    id: "community",
    title: "Live Community",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 140, y: 60 },
    size: { w: 880, h: 580 },
    minSize: { w: 500, h: 350 },
  },
  profile: {
    id: "profile",
    title: "profile.txt — User",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 260, y: 90 },
    size: { w: 700, h: 540 },
    minSize: { w: 400, h: 350 },
  },
  tutor: {
    id: "tutor",
    title: "AI Tutor — EduNexuZ",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 160, y: 70 },
    size: { w: 860, h: 600 },
    minSize: { w: 520, h: 420 },
  },
  summarizer: {
    id: "summarizer",
    title: "Document Summarizer — Gemini",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    position: { x: 180, y: 80 },
    size: { w: 980, h: 620 },
    minSize: { w: 720, h: 480 },
  },
};

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [counter, setCounter] = useState(20);
  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(() => {
    const init = {} as Record<WindowId, WindowState>;
    let z = 1;
    (Object.keys(DEFAULTS) as WindowId[]).forEach((k) => {
      init[k] = { ...DEFAULTS[k], zIndex: z++ };
    });
    return init;
  });

  const bump = useCallback(() => {
    const next = counter + 1;
    setCounter(next);
    return next;
  }, [counter]);

  const open = useCallback((id: WindowId) => {
    const z = bump();
    setWindows((w) => ({
      ...w,
      [id]: { ...w[id], isOpen: true, isMinimized: false, zIndex: z },
    }));
  }, [bump]);

  const close = useCallback((id: WindowId) => {
    setWindows((w) => ({ ...w, [id]: { ...w[id], isOpen: false, isMinimized: false, isMaximized: false } }));
  }, []);

  const minimize = useCallback((id: WindowId) => {
    setWindows((w) => ({ ...w, [id]: { ...w[id], isMinimized: true } }));
  }, []);

  const maximize = useCallback((id: WindowId) => {
    setWindows((w) => {
      const win = w[id];
      if (win.isMaximized) {
        // Restore
        return {
          ...w,
          [id]: {
            ...win,
            isMaximized: false,
            position: win.prevPosition ?? DEFAULTS[id].position,
            size: win.prevSize ?? DEFAULTS[id].size,
          },
        };
      }
      // Maximize
      return {
        ...w,
        [id]: {
          ...win,
          isMaximized: true,
          prevPosition: { ...win.position },
          prevSize: { ...win.size },
          position: { x: 0, y: 32 },
          size: { w: window.innerWidth, h: window.innerHeight - 32 },
        },
      };
    });
  }, []);

  const focus = useCallback((id: WindowId) => {
    const z = bump();
    setWindows((w) => ({ ...w, [id]: { ...w[id], isMinimized: false, zIndex: z } }));
  }, [bump]);

  const move = useCallback((id: WindowId, pos: { x: number; y: number }) => {
    setWindows((w) => ({ ...w, [id]: { ...w[id], position: pos } }));
  }, []);

  const resize = useCallback((id: WindowId, size: { w: number; h: number }) => {
    setWindows((w) => {
      const win = w[id];
      const newW = Math.max(size.w, win.minSize.w);
      const newH = Math.max(size.h, win.minSize.h);
      return { ...w, [id]: { ...win, size: { w: newW, h: newH } } };
    });
  }, []);

  const order = useMemo(
    () => (Object.keys(windows) as WindowId[]).sort((a, b) => windows[a].zIndex - windows[b].zIndex),
    [windows]
  );

  const topId = useMemo(() => {
    const opens = (Object.values(windows) as WindowState[]).filter((w) => w.isOpen && !w.isMinimized);
    if (!opens.length) return null;
    return opens.sort((a, b) => b.zIndex - a.zIndex)[0].id;
  }, [windows]);

  const value: Ctx = { windows, order, open, close, minimize, maximize, focus, move, resize, topId };
  return <WindowCtx.Provider value={value}>{children}</WindowCtx.Provider>;
}

export function useWindowManager() {
  const ctx = useContext(WindowCtx);
  if (!ctx) throw new Error("useWindowManager must be used inside WindowManagerProvider");
  return ctx;
}
