"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Rnd } from "react-rnd";
import GlassWindow from "@/components/GlassWindow";
import NameIntro from "@/components/NameIntro";
import { chapters, VIDEO_END_SEC, type BreakpointSpan } from "@/lib/chapters";
import { minecardLCD, xbka } from "@/lib/fonts";

type SceneState = "IDLE_AT_STOP" | "TRANSITIONING";
type VisibilityMap = Record<string, boolean>;
type DrawerMap = Record<string, string[]>;
type CardLayout = { id: string; x: number; y: number; width: number; height: number };
type SectionLayout = Record<string, CardLayout>;
type StoryLayout = Record<string, SectionLayout>;
type CanvasSize = { width: number; height: number };

const FPS = 30;
const PLAYBACK_SPEED = 1.05;
const DIRECT_JUMP_SPEED = 5;
const DIRECT_JUMP_MIN_DURATION_SEC = 0.55;
const WHEEL_THRESHOLD = 34;
const WHEEL_BUFFER_WINDOW_MS = 90;
const WHEEL_SETTLE_MS = 180;
const TOUCH_SWIPE_THRESHOLD = 28;
const HYSTERESIS_ENTER_SEC = 0.08;
const HYSTERESIS_LEAVE_SEC = 0.08;
const MOBILE_BREAKPOINT_PX = 768;
const MOBILE_DRAWER_CLOSE_SWIPE_PX = 64;
const DESKTOP_EDIT_BREAKPOINT_PX = 1100;
const DESKTOP_GRID_COLUMNS = 12;
const DESKTOP_CARD_DEFAULT_HEIGHT_PCT = 0.3;
const DESKTOP_CARD_MIN_WIDTH_PX = 220;
const DESKTOP_CARD_MIN_HEIGHT_PX = 160;
const SNAP_GRID_PX = 20;
const LAYOUT_STORAGE_KEY = "portfolio_layout";

const REVEAL_RANGES: Record<string, { start: number; end: number }> = {
  intro: { start: 0, end: 4.0 },
  design: { start: 9.233, end: 15.633 },
  development: { start: 19.2, end: 21.733 },
  ai: { start: 24.367, end: 26.633 },
  contact: { start: 27.667, end: VIDEO_END_SEC }
};

// Mobile-only overflow windows that move to the More Info drawer.
const MOBILE_DRAWER_WINDOW_IDS: DrawerMap = {
  design: ["design-how", "design-carousel"],
  development: ["dev-3d-video-example", "dev-3d-stat"],
  ai: ["ai-example"]
};


const COL_SPAN: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12"
};

const MD_COL_SPAN: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12"
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function frameToSec(frame: number) {
  return frame / FPS;
}

function getTransitionDurationSec(startFrame: number, targetFrame: number) {
  return Math.max(0.001, Math.abs(targetFrame - startFrame) / FPS / PLAYBACK_SPEED);
}

function getDirectJumpDurationSec(startFrame: number, targetFrame: number) {
  const raw = Math.abs(targetFrame - startFrame) / FPS / DIRECT_JUMP_SPEED;
  return Math.max(DIRECT_JUMP_MIN_DURATION_SEC, raw);
}

function resolveNearestStopIndex(currentFrame: number, stopFrames: number[]) {
  let nearest = 0;
  let nearestDelta = Number.POSITIVE_INFINITY;

  for (let i = 0; i < stopFrames.length; i += 1) {
    const delta = Math.abs(currentFrame - stopFrames[i]);
    if (delta < nearestDelta) {
      nearestDelta = delta;
      nearest = i;
    }
  }

  return nearest;
}

function resolveTimelineChapterIndex(videoSec: number) {
  for (let i = 0; i < chapters.length; i += 1) {
    const chapter = chapters[i];
    const revealRange = REVEAL_RANGES[chapter.id];
    if (!revealRange) {
      continue;
    }

    const isLastChapter = i === chapters.length - 1;
    const inRange = videoSec >= revealRange.start && (isLastChapter ? videoSec <= revealRange.end : videoSec < revealRange.end);
    if (inRange) {
      return i;
    }
  }

  let active = 0;
  for (let i = 0; i < chapters.length; i += 1) {
    if (videoSec >= chapters[i].stopTimeSec) {
      active = i;
    }
  }

  return active;
}

function resolveSpanClasses(span?: BreakpointSpan) {
  const mobile = clamp(Math.round(span?.mobile ?? 12), 1, 12);
  const tablet = clamp(Math.round(span?.tablet ?? 12), 1, 12);
  return [COL_SPAN[mobile], MD_COL_SPAN[tablet], "story-grid-item"].join(" ");
}

function resolveDesktopPlacementClass(sectionId: string, windowId: string) {
  return `story-desktop-slot story-desktop-slot--${sectionId}-${windowId}`;
}

const DEFAULT_LAYOUT_PERCENT: CardLayout[] = [
  { id: "design-main-story", x: 0, y: 0.011811023622047244, width: 0.43219076005961254, height: 0.2887139107611549 },
  { id: "design-what", x: 0, y: 0.3116649317303355, width: 0.20864381520119224, height: 0.2887139107611549 },
  { id: "design-how", x: 0.22205663189269748, y: 0.3250110856504265, width: 0.20864381520119224, height: 0.2099737532808399 },
  { id: "design-carousel", x: 0.4873323397913562, y: 0, width: 0.47690014903129657, height: 0.3937007874015748 },
  { id: "dev-3d-practice-main", x: 0, y: 0, width: 0.5067064083457526, height: 0.3674540682414698 },
  { id: "dev-3d-story", x: 0, y: 0.3937007874015748, width: 0.28315946348733234, height: 0.23622047244094488 },
  { id: "dev-3d-stat", x: 0.29999998180770304, y: 0.36750661294291337, width: 0.19374068554396423, height: 0.2099737532808399 },
  { id: "dev-3d-video-example", x: 0.6512667660208644, y: 0.026246719160104987, width: 0.31296572280178836, height: 0.49868766404199477 },
  { id: "ai-hero", x: 0, y: 0, width: 0.5067064083457526, height: 0.2887139107611549 },
  { id: "ai-what-i-do", x: 0, y: 0.3259545387015302, width: 0.25, height: 0.3 },
  { id: "ai-example", x: 0.6661698956780924, y: 0, width: 0.29806259314456035, height: 0.5774278215223098 },
  { id: "contact-main", x: 0.25, y: 0.1, width: 0.5, height: 0.3 }
];

const SAFARI_LAYOUT_PERCENT: CardLayout[] = [
  { id: "design-main-story", x: 0, y: 0, width: 0.41666666666666674, height: 0.3 },
  { id: "design-what", x: 0, y: 0.3261006289308176, width: 0.25, height: 0.3 },
  { id: "design-how", x: 0.2637853949329359, y: 0.3326408305066697, width: 0.2533532041728763, height: 0.2127659574468085 },
  { id: "design-carousel", x: 0.5476900149031296, y: 0.026595744680851064, width: 0.41666666666666674, height: 0.3 },
  { id: "dev-3d-practice-main", x: 0, y: 0, width: 0.5067064083457526, height: 0.3191489361702128 },
  { id: "dev-3d-story", x: 0, y: 0.34574468085106386, width: 0.32786885245901637, height: 0.2127659574468085 },
  { id: "dev-3d-stat", x: 0.3447093707793871, y: 0.34091086826206235, width: 0.19374068554396423, height: 0.2127659574468085 },
  { id: "dev-3d-video-example", x: 0.698956780923994, y: 0.08705342069585273, width: 0.2533532041728763, height: 0.3723404255319149 },
  { id: "ai-hero", x: 0, y: 0, width: 0.43219076005961254, height: 0.2925531914893617 },
  { id: "ai-what-i-do", x: 0, y: 0.3256055131807841, width: 0.25, height: 0.3 },
  { id: "ai-example", x: 0.7108792846497765, y: 0, width: 0.2533532041728763, height: 0.5851063829787234 },
  { id: "contact-main", x: 0.25, y: 0.1, width: 0.5, height: 0.3 }
];

function cloneStoryLayout(layout: StoryLayout) {
  const next: StoryLayout = {};
  for (const [sectionId, section] of Object.entries(layout)) {
    next[sectionId] = {};
    for (const [cardId, placement] of Object.entries(section)) {
      next[sectionId][cardId] = { ...placement };
    }
  }
  return next;
}

function sanitizeCardLayout(input: Partial<CardLayout> | undefined, fallback: CardLayout): CardLayout {
  return {
    id: fallback.id,
    x: clamp(input?.x ?? fallback.x, 0, 1),
    y: clamp(input?.y ?? fallback.y, 0, 1),
    width: clamp(input?.width ?? fallback.width, 0.05, 1),
    height: clamp(input?.height ?? fallback.height, 0.05, 1)
  };
}

function flattenStoryLayout(layout: StoryLayout) {
  return Object.values(layout).flatMap((section) => Object.values(section));
}

function buildDefaultStoryLayout(): StoryLayout {
  const output: StoryLayout = {};
  const percentById = new Map(DEFAULT_LAYOUT_PERCENT.map((card) => [card.id, card]));

  for (const chapter of chapters) {
    if (!chapter.windows.length || chapter.id === "intro") {
      continue;
    }

    const section: SectionLayout = {};

    for (const windowData of chapter.windows) {
      const percentCard = percentById.get(windowData.id);
      if (percentCard) {
        section[windowData.id] = sanitizeCardLayout(percentCard, {
          id: windowData.id,
          x: 0.1,
          y: 0.1,
          width: 0.32,
          height: DESKTOP_CARD_DEFAULT_HEIGHT_PCT
        });
        continue;
      }

      section[windowData.id] = {
        id: windowData.id,
        x: 0.1,
        y: 0.1,
        width: 0.32,
        height: DESKTOP_CARD_DEFAULT_HEIGHT_PCT
      };
    }

    output[chapter.id] = section;
  }

  return output;
}

function hydrateStoryLayout(defaults: StoryLayout, raw: string | null): StoryLayout {
  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as CardLayout[];
    if (!Array.isArray(parsed)) {
      return defaults;
    }

    const byId = new Map(parsed.map((card) => [card.id, card]));
    const next = cloneStoryLayout(defaults);
    for (const [sectionId, section] of Object.entries(defaults)) {
      for (const [cardId, fallback] of Object.entries(section)) {
        const incoming = byId.get(cardId);
        next[sectionId][cardId] = sanitizeCardLayout(incoming, fallback);
      }
    }
    return next;
  } catch {
    return defaults;
  }
}

function cardToPixels(card: CardLayout, canvas: CanvasSize) {
  return {
    x: card.x * canvas.width,
    y: card.y * canvas.height,
    width: card.width * canvas.width,
    height: card.height * canvas.height
  };
}

function cardFromPixels(id: string, x: number, y: number, width: number, height: number, canvas: CanvasSize): CardLayout {
  const safeWidth = Math.max(canvas.width, 1);
  const safeHeight = Math.max(canvas.height, 1);
  return {
    id,
    x: clamp(x / safeWidth, 0, 1),
    y: clamp(y / safeHeight, 0, 1),
    width: clamp(width / safeWidth, DESKTOP_CARD_MIN_WIDTH_PX / safeWidth, 1),
    height: clamp(height / safeHeight, DESKTOP_CARD_MIN_HEIGHT_PX / safeHeight, 1)
  };
}

const DEFAULT_STORY_LAYOUT = buildDefaultStoryLayout();
const EDITOR_CANVAS_STYLE = { position: "relative", width: "100%", height: "100dvh" } as const;

const GLITCH_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomGlyph() {
  return GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)];
}

function scrambleLine(target: string, progress: number) {
  const revealCount = Math.floor(target.length * progress);
  let output = "";
  for (let i = 0; i < target.length; i += 1) {
    if (target[i] === " ") {
      output += " ";
      continue;
    }
    output += i < revealCount ? target[i] : randomGlyph();
  }
  return output;
}

function isSafariBrowser() {
  const ua = navigator.userAgent;
  const isSafari = /Safari/i.test(ua);
  const isChromium = /Chrome|CriOS|Chromium|Edg|OPR|SamsungBrowser/i.test(ua);
  return isSafari && !isChromium;
}

function buildSafariStoryLayout() {
  const fallback = cloneStoryLayout(DEFAULT_STORY_LAYOUT);
  const byId = new Map(SAFARI_LAYOUT_PERCENT.map((card) => [card.id, card]));
  for (const section of Object.values(fallback)) {
    for (const [cardId, existing] of Object.entries(section)) {
      const incoming = byId.get(cardId);
      if (!incoming) {
        continue;
      }
      section[cardId] = sanitizeCardLayout(incoming, existing);
    }
  }
  return fallback;
}

function isInquiryModalOpen() {
  return document.body.dataset.inquiryOpen === "true";
}

function ThreeDStatWidget({ active, className }: { active: boolean; className: string }) {
  const [valueText, setValueText] = useState("0");
  const [labelText, setLabelText] = useState("");
  const mainTarget = "2";
  const labelTarget = "years of experiene in the 3d world";

  useEffect(() => {
    if (!active) {
      setValueText("0");
      setLabelText("");
      return;
    }

    let frame = 0;
    const totalMainFrames = 18;
    const totalLabelFrames = 26;
    const labelDelayFrames = 6;

    const timer = window.setInterval(() => {
      frame += 1;
      const mainDone = frame >= totalMainFrames;
      setValueText(mainDone ? mainTarget : randomGlyph());

      const labelFrame = frame - labelDelayFrames;
      if (labelFrame > 0) {
        const progress = clamp(labelFrame / totalLabelFrames, 0, 1);
        setLabelText(progress >= 1 ? labelTarget : scrambleLine(labelTarget, progress));
      }

      if (frame >= totalMainFrames + totalLabelFrames) {
        window.clearInterval(timer);
        setValueText(mainTarget);
        setLabelText(labelTarget);
      }
    }, 42);

    return () => window.clearInterval(timer);
  }, [active]);

  return (
    <div
      className={`${className} story-3d-stat ${
        active ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
      } transition-[opacity,transform] duration-300 ease-out`}
    >
      <div className={`${minecardLCD.className} story-3d-stat__value`}>{valueText}</div>
      <div className={`${minecardLCD.className} story-3d-stat__label`}>{labelText}</div>
    </div>
  );
}

export default function VideoScrollScene() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const gridWrapRef = useRef<HTMLDivElement | null>(null);
  const storyLayoutRef = useRef<StoryLayout>(cloneStoryLayout(DEFAULT_STORY_LAYOUT));

  const transitionRafRef = useRef<number | null>(null);
  const wheelBufferTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);

  const stateRef = useRef<SceneState>("IDLE_AT_STOP");
  const gestureInProgressRef = useRef(false);
  const wheelBufferRef = useRef(0);
  const lastWheelTimeRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const touchLastYRef = useRef<number | null>(null);
  const currentTimeRef = useRef(0);
  const currentStopIndexRef = useRef(-1);
  const visibleWindowsRef = useRef<VisibilityMap>({});
  const drawerTouchStartYRef = useRef<number | null>(null);
  const drawerTouchLastYRef = useRef<number | null>(null);
  const drawerOpenRef = useRef(false);

  const [durationReady, setDurationReady] = useState(false);
  const [durationSec, setDurationSec] = useState(VIDEO_END_SEC);
  const [sceneState, setSceneState] = useState<SceneState>("IDLE_AT_STOP");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [visibleWindows, setVisibleWindows] = useState<VisibilityMap>({});
  const [currentStopIndex, setCurrentStopIndex] = useState(-1);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isDesktopEditorEligible, setIsDesktopEditorEligible] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditQueryEnabled, setIsEditQueryEnabled] = useState(false);
  const [defaultStoryLayout, setDefaultStoryLayout] = useState<StoryLayout>(() => cloneStoryLayout(DEFAULT_STORY_LAYOUT));
  const [storyLayout, setStoryLayout] = useState<StoryLayout>(() => cloneStoryLayout(DEFAULT_STORY_LAYOUT));
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 1, height: 1 });
  const [layoutDirty, setLayoutDirty] = useState(false);

  const effectiveDurationSec = durationSec > 0 ? durationSec : VIDEO_END_SEC;
  const timeScale = effectiveDurationSec / VIDEO_END_SEC;

  const revealRanges = useMemo(() => {
    const scaled: Record<string, { start: number; end: number }> = {};
    for (const chapter of chapters) {
      const baseRange = REVEAL_RANGES[chapter.id];
      if (!baseRange) {
        continue;
      }
      scaled[chapter.id] = {
        start: baseRange.start * timeScale,
        end: baseRange.end * timeScale
      };
    }
    return scaled;
  }, [timeScale]);

  const stopFrames = useMemo(
    () => chapters.map((chapter) => Math.round(chapter.stopTimeSec * timeScale * FPS)),
    [timeScale]
  );

  const currentFrame = Math.round(videoTime * FPS);
  const nearestStopIndex = resolveNearestStopIndex(currentFrame, stopFrames);
  const timelineChapterIndex = resolveTimelineChapterIndex(videoTime / Math.max(timeScale, 0.001));
  const activeChapterIndex = sceneState === "IDLE_AT_STOP" && currentStopIndex >= 0 ? currentStopIndex : timelineChapterIndex;
  const activeChapter = chapters[activeChapterIndex];
  const showChapterHeading = activeChapterIndex >= 1;
  const activeChapterId = chapters[timelineChapterIndex]?.id;

  const introOpacity = useMemo(() => {
    if (videoTime < 3) {
      return 0;
    }
    if (videoTime < 4) {
      return clamp((videoTime - 3) / 1, 0, 1);
    }
    if (currentStopIndex === 0 && sceneState === "IDLE_AT_STOP") {
      return 1;
    }
    return 0;
  }, [currentStopIndex, sceneState, videoTime]);

  const setSceneStateSafe = useCallback((nextState: SceneState) => {
    stateRef.current = nextState;
    setSceneState(nextState);
  }, []);

  const commitVideoTime = useCallback((time: number) => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }

    const clamped = clamp(time, 0, effectiveDurationSec);
    currentTimeRef.current = clamped;

    if (Math.abs(videoEl.currentTime - clamped) > 0.001) {
      videoEl.currentTime = clamped;
    }

    setVideoTime(clamped);
  }, [effectiveDurationSec]);

  useEffect(() => {
    drawerOpenRef.current = isDrawerOpen;
  }, [isDrawerOpen]);

  const scheduleGestureReset = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }

    settleTimerRef.current = window.setTimeout(() => {
      if (stateRef.current !== "IDLE_AT_STOP") {
        scheduleGestureReset();
        return;
      }

      const elapsed = Date.now() - lastWheelTimeRef.current;
      if (elapsed >= WHEEL_SETTLE_MS) {
        gestureInProgressRef.current = false;
        wheelBufferRef.current = 0;
        return;
      }

      scheduleGestureReset();
    }, WHEEL_SETTLE_MS);
  }, []);

  const goToStop = useCallback(
    (nextStopIndex: number, options?: { fast?: boolean }) => {
      if (!durationReady || stateRef.current !== "IDLE_AT_STOP") {
        return;
      }

      const clampedIndex = clamp(nextStopIndex, 0, stopFrames.length - 1);
      if (clampedIndex === currentStopIndexRef.current) {
        gestureInProgressRef.current = false;
        return;
      }

      const startFrame = Math.round(currentTimeRef.current * FPS);
      const targetFrame = stopFrames[clampedIndex];
      const targetTime = frameToSec(targetFrame);

      if (transitionRafRef.current !== null) {
        window.cancelAnimationFrame(transitionRafRef.current);
        transitionRafRef.current = null;
      }

      setSceneStateSafe("TRANSITIONING");

      if (reducedMotion) {
        commitVideoTime(targetTime);
        currentStopIndexRef.current = clampedIndex;
        setCurrentStopIndex(clampedIndex);
        setSceneStateSafe("IDLE_AT_STOP");
        scheduleGestureReset();
        return;
      }

      const durationSec = options?.fast
        ? getDirectJumpDurationSec(startFrame, targetFrame)
        : getTransitionDurationSec(startFrame, targetFrame);
      const startTime = performance.now();
      const from = currentTimeRef.current;
      const delta = targetTime - from;

      const tick = (now: number) => {
        const t = clamp((now - startTime) / (durationSec * 1000), 0, 1);
        const nextTime = from + delta * t;
        commitVideoTime(nextTime);

        if (t < 1) {
          transitionRafRef.current = window.requestAnimationFrame(tick);
          return;
        }

        transitionRafRef.current = null;
        commitVideoTime(targetTime);
        currentStopIndexRef.current = clampedIndex;
        setCurrentStopIndex(clampedIndex);
        setSceneStateSafe("IDLE_AT_STOP");
        scheduleGestureReset();
      };

      transitionRafRef.current = window.requestAnimationFrame(tick);
    },
    [commitVideoTime, durationReady, reducedMotion, scheduleGestureReset, setSceneStateSafe, stopFrames]
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMediaChange = () => setReducedMotion(mediaQuery.matches);

    handleMediaChange();
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsMobileViewport(window.innerWidth <= MOBILE_BREAKPOINT_PX);
      setIsDesktopEditorEligible(window.innerWidth >= DESKTOP_EDIT_BREAKPOINT_PX);
    };

    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsEditQueryEnabled(params.get("edit") === "1");
  }, []);

  useEffect(() => {
    const defaults = isSafariBrowser() ? buildSafariStoryLayout() : cloneStoryLayout(DEFAULT_STORY_LAYOUT);
    setDefaultStoryLayout(defaults);
    const persisted = hydrateStoryLayout(defaults, window.localStorage.getItem(LAYOUT_STORAGE_KEY));
    storyLayoutRef.current = persisted;
    setStoryLayout(persisted);
    setLayoutDirty(false);
  }, [isEditQueryEnabled]);

  useEffect(() => {
    const grid = gridWrapRef.current;
    if (!grid) {
      return;
    }

    const syncSize = () => {
      const rect = grid.getBoundingClientRect();
      setCanvasSize({
        width: Math.max(rect.width, 1),
        height: Math.max(rect.height, 1)
      });
    };

    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [activeChapterId]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }

    const onLoadedMetadata = () => {
      const resolvedDuration = Number.isFinite(videoEl.duration) && videoEl.duration > 0 ? videoEl.duration : VIDEO_END_SEC;
      setDurationSec(resolvedDuration);
      setDurationReady(resolvedDuration > 0);
      currentStopIndexRef.current = -1;
      setCurrentStopIndex(-1);
      currentTimeRef.current = 0;
      commitVideoTime(0);
      setSceneStateSafe("IDLE_AT_STOP");
      gestureInProgressRef.current = false;
    };

    if (videoEl.readyState >= 1 && videoEl.duration > 0) {
      onLoadedMetadata();
    } else {
      videoEl.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    }

    return () => {
      videoEl.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [commitVideoTime, setSceneStateSafe]);

  useEffect(() => {
    if (!durationReady || currentStopIndexRef.current >= 0) {
      return;
    }

    gestureInProgressRef.current = true;
    goToStop(0);
  }, [durationReady, goToStop]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sectionId = params.get("section");
    if (!sectionId || !durationReady || stateRef.current !== "IDLE_AT_STOP") {
      return;
    }

    const index = chapters.findIndex((chapter) => chapter.id === sectionId);
    if (index < 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      gestureInProgressRef.current = true;
      goToStop(index);
    }, 70);

    return () => {
      window.clearTimeout(timer);
    };
  }, [durationReady, goToStop]);

  useEffect(() => {
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) {
      return;
    }

    const tryCommitWheelGesture = () => {
      if (Math.abs(wheelBufferRef.current) < WHEEL_THRESHOLD) {
        wheelBufferRef.current = 0;
        return;
      }

      if (!durationReady || stateRef.current !== "IDLE_AT_STOP" || gestureInProgressRef.current) {
        wheelBufferRef.current = 0;
        return;
      }

      const direction = wheelBufferRef.current > 0 ? 1 : -1;
      wheelBufferRef.current = 0;

      const currentIndex = currentStopIndexRef.current < 0 ? 0 : currentStopIndexRef.current;
      const nextIndex = clamp(currentIndex + direction, 0, stopFrames.length - 1);
      if (nextIndex === currentIndex) {
        return;
      }

      gestureInProgressRef.current = true;
      goToStop(nextIndex);
    };

      const onWheel = (event: WheelEvent) => {
      lastWheelTimeRef.current = Date.now();

      if (!durationReady || stateRef.current !== "IDLE_AT_STOP" || gestureInProgressRef.current) {
        return;
      }
      if (isInquiryModalOpen()) {
        return;
      }
      if (drawerOpenRef.current) {
        return;
      }

      wheelBufferRef.current += event.deltaY;
      tryCommitWheelGesture();

      if (wheelBufferTimerRef.current !== null) {
        window.clearTimeout(wheelBufferTimerRef.current);
      }

      wheelBufferTimerRef.current = window.setTimeout(() => {
        tryCommitWheelGesture();
        wheelBufferRef.current = 0;
      }, WHEEL_BUFFER_WINDOW_MS);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }
      touchStartYRef.current = event.touches[0].clientY;
      touchLastYRef.current = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }
      touchLastYRef.current = event.touches[0].clientY;
    };

    const onTouchEnd = () => {
      if (!durationReady || stateRef.current !== "IDLE_AT_STOP" || gestureInProgressRef.current) {
        touchStartYRef.current = null;
        touchLastYRef.current = null;
        return;
      }
      if (isInquiryModalOpen()) {
        touchStartYRef.current = null;
        touchLastYRef.current = null;
        return;
      }
      if (drawerOpenRef.current) {
        touchStartYRef.current = null;
        touchLastYRef.current = null;
        return;
      }

      if (touchStartYRef.current === null || touchLastYRef.current === null) {
        touchStartYRef.current = null;
        touchLastYRef.current = null;
        return;
      }

      const deltaY = touchLastYRef.current - touchStartYRef.current;
      touchStartYRef.current = null;
      touchLastYRef.current = null;

      if (Math.abs(deltaY) < TOUCH_SWIPE_THRESHOLD) {
        return;
      }

      const direction = deltaY < 0 ? 1 : -1;
      const currentIndex = currentStopIndexRef.current < 0 ? 0 : currentStopIndexRef.current;
      const nextIndex = clamp(currentIndex + direction, 0, stopFrames.length - 1);
      if (nextIndex === currentIndex) {
        return;
      }

      lastWheelTimeRef.current = Date.now();
      gestureInProgressRef.current = true;
      goToStop(nextIndex);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!durationReady || stateRef.current !== "IDLE_AT_STOP" || gestureInProgressRef.current) {
        return;
      }
      if (isInquiryModalOpen()) {
        return;
      }
      if (drawerOpenRef.current) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        const current = currentStopIndexRef.current < 0 ? 0 : currentStopIndexRef.current;
        const next = clamp(current + 1, 0, stopFrames.length - 1);
        if (next !== current) {
          gestureInProgressRef.current = true;
          goToStop(next);
        }
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        const current = currentStopIndexRef.current < 0 ? 0 : currentStopIndexRef.current;
        const next = clamp(current - 1, 0, stopFrames.length - 1);
        if (next !== current) {
          gestureInProgressRef.current = true;
          goToStop(next);
        }
      }
    };

    wrapperEl.addEventListener("wheel", onWheel, { passive: false });
    wrapperEl.addEventListener("touchstart", onTouchStart, { passive: false });
    wrapperEl.addEventListener("touchmove", onTouchMove, { passive: false });
    wrapperEl.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      wrapperEl.removeEventListener("wheel", onWheel);
      wrapperEl.removeEventListener("touchstart", onTouchStart);
      wrapperEl.removeEventListener("touchmove", onTouchMove);
      wrapperEl.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);

      if (wheelBufferTimerRef.current !== null) {
        window.clearTimeout(wheelBufferTimerRef.current);
        wheelBufferTimerRef.current = null;
      }
    };
  }, [durationReady, goToStop, stopFrames.length]);

  useEffect(() => {
    const chapter = chapters[timelineChapterIndex];
    const range = revealRanges[chapter.id];
    const previous = visibleWindowsRef.current;
    const nextVisibility: VisibilityMap = {};

    if (range) {
      const sectionProgress = clamp((videoTime - range.start) / Math.max(range.end - range.start, 0.001), 0, 1.2);

      chapter.windows.forEach((windowData, index) => {
        const key = windowData.id;
        const revealPoint = index === 0 ? 0.02 : Math.min(0.12 + index * 0.16, 0.78);
        const hidePoint = Math.max(revealPoint - 0.1, 0);

        const softStart = range.start - HYSTERESIS_ENTER_SEC;
        const softEnd = range.end + HYSTERESIS_ENTER_SEC;
        const hardStart = range.start - HYSTERESIS_LEAVE_SEC;
        const hardEnd = range.end + HYSTERESIS_LEAVE_SEC;

        const wasVisible = previous[key] ?? false;
        const inSoftBand = videoTime >= softStart && videoTime <= softEnd;
        const inHardBand = videoTime >= hardStart && videoTime <= hardEnd;

        const stagedVisible = wasVisible ? sectionProgress >= hidePoint : sectionProgress >= revealPoint;
        nextVisibility[key] = wasVisible ? inHardBand && stagedVisible : inSoftBand && stagedVisible;
      });
    }

    setVisibleWindows((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(nextVisibility);

      if (prevKeys.length !== nextKeys.length) {
        visibleWindowsRef.current = nextVisibility;
        return nextVisibility;
      }

      for (const key of nextKeys) {
        if (prev[key] !== nextVisibility[key]) {
          visibleWindowsRef.current = nextVisibility;
          return nextVisibility;
        }
      }

      return prev;
    });
  }, [revealRanges, timelineChapterIndex, videoTime]);

  useEffect(() => {
    return () => {
      if (transitionRafRef.current !== null) {
        window.cancelAnimationFrame(transitionRafRef.current);
      }
      if (wheelBufferTimerRef.current !== null) {
        window.clearTimeout(wheelBufferTimerRef.current);
      }
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }
    };
  }, []);

  const chapterWindows = useMemo(() => {
    const chapter = chapters[timelineChapterIndex];
    return chapter?.windows ?? [];
  }, [timelineChapterIndex]);

  const mobileDrawerIds = useMemo(() => MOBILE_DRAWER_WINDOW_IDS[activeChapterId] ?? [], [activeChapterId]);

  const { mainWindows, drawerWindows } = useMemo(() => {
    if (!isMobileViewport) {
      return {
        mainWindows: chapterWindows,
        drawerWindows: [] as typeof chapterWindows
      };
    }

    const drawerIdSet = new Set(mobileDrawerIds);
    return {
      mainWindows: chapterWindows.filter((windowData) => !drawerIdSet.has(windowData.id)),
      drawerWindows: chapterWindows.filter((windowData) => drawerIdSet.has(windowData.id))
    };
  }, [chapterWindows, isMobileViewport, mobileDrawerIds]);
  const navChapters = useMemo(() => chapters.slice(1), []);
  const isDesktopEditMode = isEditQueryEnabled && isDesktopEditorEligible;

  const renderWindowContent = useCallback(
    (windowData: (typeof mainWindows)[number], sectionId: string, isVisible: boolean, className: string) => {
      if (windowData.id === "dev-3d-stat") {
        return <ThreeDStatWidget active={isVisible} className={className} />;
      }

      return (
        <GlassWindow
          windowData={windowData}
          sectionId={sectionId}
          reducedMotion={reducedMotion}
          className={className}
        />
      );
    },
    [reducedMotion]
  );

  const saveStoryLayout = useCallback(() => {
    const payload = JSON.stringify(flattenStoryLayout(storyLayoutRef.current));
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, payload);
    setLayoutDirty(false);
  }, []);

  const copyMainLayoutJson = useCallback(async () => {
    const payload = JSON.stringify(flattenStoryLayout(storyLayoutRef.current), null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      setLayoutDirty(false);
    } catch {
      // Clipboard API can fail on insecure contexts; fallback to console.
      // eslint-disable-next-line no-console
      console.log(payload);
    }
  }, []);

  const resetStoryLayout = useCallback(() => {
    const defaults = cloneStoryLayout(defaultStoryLayout);
    storyLayoutRef.current = defaults;
    setStoryLayout(defaults);
    window.localStorage.removeItem(LAYOUT_STORAGE_KEY);
    setLayoutDirty(false);
  }, [defaultStoryLayout]);

  const exitEditMode = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setIsEditQueryEnabled(false);
  }, []);

  const updateCardPlacement = useCallback((sectionId: string, cardId: string, next: CardLayout) => {
    setStoryLayout((prev) => {
      const fallback = prev[sectionId]?.[cardId];
      if (!fallback) {
        return prev;
      }

      const placement = sanitizeCardLayout(next, fallback);
      const nextLayout = {
        ...prev,
        [sectionId]: {
          ...(prev[sectionId] ?? {}),
          [cardId]: placement
        }
      };
      storyLayoutRef.current = nextLayout;
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(flattenStoryLayout(nextLayout)));
      return nextLayout;
    });
    setLayoutDirty(true);
  }, []);

  return (
    <section ref={wrapperRef} className="story-scene story-scene--locked relative min-h-[100dvh] h-auto w-full overflow-hidden touch-none bg-black">
      <video
        ref={videoRef}
        className="story-video"
        src="/story.mp4"
        muted
        playsInline
        preload="metadata"
        aria-label="Cinematic portfolio video"
      />

      <div className="story-vignette" />

      {!durationReady ? <div className="story-loading">LOADING STORY</div> : null}

      <div className="story-overlay">
        <NameIntro opacity={introOpacity} />

        <header className="story-heading-wrap">
          {showChapterHeading ? (
            <>
              <h1 className={`${xbka.className} story-title`}>{activeChapter?.label ?? chapters[nearestStopIndex]?.label ?? "Intro"}</h1>
              <div className="story-progress-track" aria-hidden="true">
                <span
                  className="story-progress-fill"
                  style={{ transform: `scaleX(${clamp(videoTime / Math.max(effectiveDurationSec, 0.001), 0, 1)})` }}
                />
              </div>
            </>
          ) : null}
        </header>

        <div className="story-content-shell">
          <div
            ref={gridWrapRef}
            className={`story-grid-wrap ${isDesktopEditMode ? "is-editing" : ""}`}
            style={isDesktopEditMode ? EDITOR_CANVAS_STYLE : undefined}
          >
            {isDesktopEditMode ? (
              <div className="story-grid-overlay" aria-hidden="true">
                {Array.from({ length: DESKTOP_GRID_COLUMNS }).map((_, index) => (
                  <span key={`grid-col-${index}`} />
                ))}
              </div>
            ) : null}
            <div
              key={chapters[timelineChapterIndex].id}
              className={`story-window-grid story-window-grid--${chapters[timelineChapterIndex].id}`}
              style={isDesktopEditMode ? EDITOR_CANVAS_STYLE : undefined}
              aria-live="polite"
            >
              {mainWindows.map((windowData) => {
                const isVisible = Boolean(visibleWindows[windowData.id]);
                const sectionId = chapters[timelineChapterIndex].id;
                const fallback = defaultStoryLayout[sectionId]?.[windowData.id];
                const activeCard = storyLayout[sectionId]?.[windowData.id] ?? fallback;
                const pixelCard = activeCard ? cardToPixels(activeCard, canvasSize) : null;

                if (isDesktopEditMode && activeCard && pixelCard) {
                  return (
                    <Rnd
                      key={windowData.id}
                      bounds="parent"
                      size={{ width: pixelCard.width, height: pixelCard.height }}
                      position={{ x: pixelCard.x, y: pixelCard.y }}
                      minWidth={DESKTOP_CARD_MIN_WIDTH_PX}
                      minHeight={DESKTOP_CARD_MIN_HEIGHT_PX}
                      disableDragging={!isDesktopEditMode}
                      enableResizing={isDesktopEditMode}
                      dragGrid={[SNAP_GRID_PX, SNAP_GRID_PX]}
                      resizeGrid={[SNAP_GRID_PX, SNAP_GRID_PX]}
                      onDragStop={(_, data) => {
                        const next = cardFromPixels(
                          windowData.id,
                          data.x,
                          data.y,
                          pixelCard.width,
                          pixelCard.height,
                          canvasSize
                        );
                        updateCardPlacement(sectionId, windowData.id, next);
                      }}
                      onResizeStop={(_, __, ref, ___, position) => {
                        const width = Number.parseFloat(ref.style.width);
                        const height = Number.parseFloat(ref.style.height);
                        const next = cardFromPixels(windowData.id, position.x, position.y, width, height, canvasSize);
                        updateCardPlacement(sectionId, windowData.id, next);
                      }}
                      className={`story-grid-card ${resolveDesktopPlacementClass(sectionId, windowData.id)} ${
                        isDesktopEditMode ? "cursor-move" : ""
                      }`}
                    >
                      {renderWindowContent(
                        windowData,
                        sectionId,
                        isVisible,
                        `h-full w-full ${
                          isVisible
                            ? "opacity-100 translate-y-0 pointer-events-auto"
                            : "opacity-0 translate-y-2 pointer-events-none"
                        } transition-[opacity,transform] duration-300 ease-out`
                      )}
                    </Rnd>
                  );
                }

                if (isDesktopEditorEligible && activeCard) {
                  return (
                    <div
                      key={windowData.id}
                      className={`story-grid-card ${resolveDesktopPlacementClass(sectionId, windowData.id)}`}
                      style={{
                        position: "absolute",
                        left: `${activeCard.x * 100}%`,
                        top: `${activeCard.y * 100}%`,
                        width: `${activeCard.width * 100}%`,
                        height: `${activeCard.height * 100}%`
                      }}
                    >
                    {renderWindowContent(
                      windowData,
                      sectionId,
                      isVisible,
                      `h-full w-full ${
                        isVisible
                          ? "opacity-100 translate-y-0 pointer-events-auto"
                          : "opacity-0 translate-y-2 pointer-events-none"
                      } transition-[opacity,transform] duration-300 ease-out`
                    )}
                  </div>
                );
              }

                return (
                  <div
                    key={windowData.id}
                    className={`story-grid-card ${resolveDesktopPlacementClass(sectionId, windowData.id)}`}
                  >
                    {renderWindowContent(
                      windowData,
                      sectionId,
                      isVisible,
                      `${resolveSpanClasses(windowData.span)} ${
                        isVisible
                          ? "opacity-100 translate-y-0 pointer-events-auto"
                          : "opacity-0 translate-y-2 pointer-events-none"
                      } transition-[opacity,transform] duration-300 ease-out`
                    )}
                  </div>
                );
              })}
              {sceneState === "TRANSITIONING" ? <div className="story-transition-lock" aria-hidden="true" /> : null}
            </div>
          </div>
        </div>

        {isDesktopEditMode ? (
          <div className="story-layout-controls">
            <button type="button" className={`${minecardLCD.className} story-layout-controls__btn`} onClick={saveStoryLayout}>
              Save
            </button>
            <button type="button" className={`${minecardLCD.className} story-layout-controls__btn`} onClick={copyMainLayoutJson}>
              Copy Main JSON
            </button>
            <button type="button" className={`${minecardLCD.className} story-layout-controls__btn`} onClick={resetStoryLayout}>
              Reset
            </button>
            <button type="button" className={`${minecardLCD.className} story-layout-controls__btn`} onClick={exitEditMode}>
              Exit Edit Mode
            </button>
            <span className={`${minecardLCD.className} story-layout-controls__hint`}>{layoutDirty ? "Unsaved changes" : "Saved"}</span>
          </div>
        ) : null}

        {isMobileViewport && drawerWindows.length > 0 ? (
          <div className="story-more-info-wrap">
            <button
              type="button"
              className={`${minecardLCD.className} story-more-info-button`}
              onClick={() => setIsDrawerOpen(true)}
              aria-expanded={isDrawerOpen}
              aria-controls="story-mobile-drawer"
            >
              More Info
            </button>
          </div>
        ) : null}

        <nav className="story-legacy-nav" aria-label="Story section navigation">
          <div className="story-legacy-nav__bar story-legacy-nav__bar--two-row">
            <div className="story-legacy-nav__brand" aria-hidden="true">
              <Image src="/elements/baltas_ks.svg" alt="" width={124} height={40} className="story-legacy-nav__logo" />
            </div>

            <div className="story-legacy-nav__sections">
              <div className="story-nav-tabs">
                {navChapters.map((chapter, index) => {
                  const chapterIndex = index + 1;
                  const isActive = chapterIndex === activeChapterIndex;
                  const isDisabled = sceneState === "TRANSITIONING";
                  return (
                    <button
                      key={`section-tab-${chapter.id}`}
                      type="button"
                      className={`${minecardLCD.className} story-legacy-nav__link ${isActive ? "is-active" : ""}`}
                      onClick={() => {
                        if (!isDisabled) {
                          gestureInProgressRef.current = true;
                          goToStop(chapterIndex, { fast: true });
                        }
                      }}
                      disabled={isDisabled}
                      aria-current={isActive ? "true" : undefined}
                      aria-label={`Fast forward to ${chapter.label}`}
                    >
                      <span>{chapter.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        {isMobileViewport && drawerWindows.length > 0 ? (
          <div
            className={`story-mobile-drawer-backdrop ${isDrawerOpen ? "is-open" : ""}`}
            aria-hidden={!isDrawerOpen}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setIsDrawerOpen(false);
              }
            }}
          >
            <aside
              id="story-mobile-drawer"
              className={`story-mobile-drawer ${isDrawerOpen ? "is-open" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-label="More section information"
              onTouchStart={(event) => {
                drawerTouchStartYRef.current = event.touches[0]?.clientY ?? null;
                drawerTouchLastYRef.current = event.touches[0]?.clientY ?? null;
              }}
              onTouchMove={(event) => {
                drawerTouchLastYRef.current = event.touches[0]?.clientY ?? drawerTouchLastYRef.current;
              }}
              onTouchEnd={() => {
                const startY = drawerTouchStartYRef.current;
                const endY = drawerTouchLastYRef.current;
                drawerTouchStartYRef.current = null;
                drawerTouchLastYRef.current = null;

                if (startY === null || endY === null) {
                  return;
                }

                if (endY - startY >= MOBILE_DRAWER_CLOSE_SWIPE_PX) {
                  setIsDrawerOpen(false);
                }
              }}
            >
              <div className="story-mobile-drawer__header">
                <h2 className={`${minecardLCD.className} story-mobile-drawer__title`}>More Info</h2>
                <button
                  type="button"
                  className={`${minecardLCD.className} story-mobile-drawer__close`}
                  onClick={() => setIsDrawerOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="story-mobile-drawer__content">
                {drawerWindows.map((windowData) => (
                  <div key={`drawer-${windowData.id}`} className="col-span-12">
                    {renderWindowContent(windowData, chapters[timelineChapterIndex].id, true, "h-full w-full")}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  );
}
