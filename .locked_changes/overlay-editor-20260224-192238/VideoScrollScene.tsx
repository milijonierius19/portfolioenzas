"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import localFont from "next/font/local";
import NameIntro from "@/components/NameIntro";
import OverlayRenderer from "@/components/OverlayRenderer";
import OverlayEditorPanel from "@/components/editor/OverlayEditorPanel";
import { chapters } from "@/lib/chapters";
import type { ChapterWindow } from "@/lib/chapters";
import {
  clearStoredLayout,
  cloneLayout,
  loadStoredLayout,
  mergeLayout,
  saveLayout,
  toPersistedLayout
} from "@/lib/layoutStorage";
import type {
  ChapterOverlayLayout,
  ImageOverlayElement,
  OverlayElement,
  OverlayElementType,
  StoryOverlayLayout,
  TextOverlayElement,
  WindowOverlayElement
} from "@/lib/layoutTypes";
import { useCursorParallax } from "@/hooks/useCursorParallax";

type SceneState = "IDLE_AT_STOP" | "TRANSITIONING";
type Selection = { chapterId: string; elementId: string } | null;

const FPS = 30;
const PLAYBACK_SPEED = 1.05;
const VIDEO_END_SEC = 28.333;
const DEFAULT_STOP_FRAMES = [120, 469, 652, 799, 850];
const STOP_LABELS = ["Intro", "Design", "Development", "Contact", "Final"];
const STOP_CHAPTER_IDS = ["intro", "design", "development", "contact", "contact"];

const REVEAL_RANGES: Record<string, { start: number; end: number }> = {
  intro: { start: 0, end: 4.0 },
  design: { start: 9.233, end: 15.633 },
  development: { start: 19.2, end: 21.733 },
  contact: { start: 24.367, end: 28.333 }
};

const WHEEL_THRESHOLD = 34;
const WHEEL_BUFFER_WINDOW_MS = 90;
const WHEEL_SETTLE_MS = 180;
const TOUCH_SWIPE_THRESHOLD = 28;
const HYSTERESIS_ENTER_SEC = 0.08;
const HYSTERESIS_LEAVE_SEC = 0.08;

const plank = localFont({
  src: "../public/fonts/PLANK___.ttf",
  display: "swap"
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function frameToSec(frame: number) {
  return frame / FPS;
}

function getTransitionDurationSec(startFrame: number, targetFrame: number) {
  return Math.max(0.001, Math.abs(targetFrame - startFrame) / FPS / PLAYBACK_SPEED);
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

function parseWidthFromCss(widthCss: string | undefined): number | undefined {
  if (!widthCss) {
    return undefined;
  }
  const match = widthCss.match(/([0-9]+(?:\.[0-9]+)?)vw/i);
  return match ? Number(match[1]) : undefined;
}

function windowToElement(windowData: ChapterWindow): WindowOverlayElement {
  const inferredW =
    windowData.wPercent ??
    parseWidthFromCss(windowData.widthCss) ??
    (windowData.ctaOnly ? 16 : windowData.compact ? 22 : 28);

  const inferredH = windowData.hPercent ?? (windowData.ctaOnly ? 8 : windowData.compact ? 20 : 24);

  return {
    id: windowData.id,
    type: "window",
    x: windowData.xPercent,
    y: windowData.yPercent,
    w: inferredW,
    h: inferredH,
    zIndex: windowData.zIndex ?? 10,
    parallaxStrength: windowData.parallaxStrength,
    props: {
      label: windowData.eyebrow,
      title: windowData.title,
      body: windowData.body,
      ctas: windowData.ctas,
      logoSrc: windowData.logoSrc,
      logoHref: windowData.logoHref,
      logoHeightPx: windowData.logoHeightPx,
      ctaOnly: windowData.ctaOnly,
      compact: windowData.compact
    }
  };
}

function buildDefaultLayout(): StoryOverlayLayout {
  return {
    version: 1,
    chapters: chapters.map((chapter) => ({
      chapterId: chapter.id,
      label: chapter.label,
      elements: chapter.windows.map((windowData) => windowToElement(windowData))
    }))
  };
}

function updateChapterElements(
  layout: StoryOverlayLayout,
  chapterId: string,
  updater: (elements: OverlayElement[]) => OverlayElement[]
): StoryOverlayLayout {
  return {
    ...layout,
    chapters: layout.chapters.map((chapter) =>
      chapter.chapterId === chapterId ? { ...chapter, elements: updater(chapter.elements) } : chapter
    )
  };
}

function createNewElement(type: OverlayElementType, chapterId: string): OverlayElement {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  if (type === "window") {
    return {
      id: `${chapterId}-window-${id}`,
      type: "window",
      x: 50,
      y: 52,
      w: 26,
      h: 24,
      zIndex: 30,
      parallaxStrength: 1,
      props: {
        label: "LABEL",
        title: "Window Title",
        body: "Editable body text",
        ctas: []
      }
    };
  }

  if (type === "text") {
    const element: TextOverlayElement = {
      id: `${chapterId}-text-${id}`,
      type: "text",
      x: 50,
      y: 50,
      w: 28,
      h: 14,
      zIndex: 30,
      parallaxStrength: 0.4,
      props: {
        text: "Edit this text",
        fontKey: "inherit",
        size: 24,
        weight: 600,
        color: "#ffffff",
        align: "left",
        letterSpacing: 0,
        lineHeight: 1.2
      }
    };
    return element;
  }

  const image: ImageOverlayElement = {
    id: `${chapterId}-image-${id}`,
    type: "image",
    x: 50,
    y: 50,
    w: 24,
    h: 24,
    zIndex: 30,
    parallaxStrength: 0.6,
    props: {
      src: "/elements/",
      fit: "contain",
      opacity: 1,
      rotateDeg: 0,
      tint: "none"
    }
  };

  return image;
}

export default function VideoScrollScene() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const visibleElementsRef = useRef<Record<string, boolean>>({});

  const stateRef = useRef<SceneState>("IDLE_AT_STOP");
  const gestureInProgressRef = useRef(false);
  const wheelBufferRef = useRef(0);
  const wheelBufferTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const lastWheelTimeRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const touchLastYRef = useRef<number | null>(null);
  const currentTimeRef = useRef(0);
  const currentStopIndexRef = useRef(-1);
  const hasAutoOpenedRef = useRef(false);
  const zCounterRef = useRef(30);
  const spaceHeldRef = useRef(false);
  const editorInteractingRef = useRef(false);

  const stopFramesRef = useRef<number[]>([...DEFAULT_STOP_FRAMES]);

  const [durationReady, setDurationReady] = useState(false);
  const [sceneState, setSceneState] = useState<SceneState>("IDLE_AT_STOP");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [visibleById, setVisibleById] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);
  const [lockPlayback, setLockPlayback] = useState(true);
  const [layout, setLayout] = useState<StoryOverlayLayout>(() => buildDefaultLayout());
  const [selected, setSelected] = useState<Selection>(null);
  const [editorChapterId, setEditorChapterId] = useState<string | null>(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(-1);
  const [viewport, setViewport] = useState({ width: 1440, height: 900 });

  const isTransitioning = sceneState === "TRANSITIONING";

  const { enabled: parallaxEnabled, getOffset } = useCursorParallax({
    paused: isTransitioning || (editMode && lockPlayback),
    reducedMotion
  });

  const currentFrame = Math.round(videoTime * FPS);
  const nearestStopIndex = resolveNearestStopIndex(currentFrame, stopFramesRef.current);
  const currentStopLabel = STOP_LABELS[nearestStopIndex] ?? "Unknown";
  const activeStopChapterId = STOP_CHAPTER_IDS[nearestStopIndex] ?? "intro";

  useEffect(() => {
    if (!editorChapterId) {
      setEditorChapterId(activeStopChapterId);
    }
  }, [activeStopChapterId, editorChapterId]);

  const selectedElement = useMemo(() => {
    if (!selected) {
      return null;
    }

    const chapter = layout.chapters.find((entry) => entry.chapterId === selected.chapterId);
    return chapter?.elements.find((entry) => entry.id === selected.elementId) ?? null;
  }, [layout.chapters, selected]);

  const designTitleVisible = useMemo(() => {
    const chapter = layout.chapters.find((entry) => entry.chapterId === "design");
    if (!chapter) {
      return false;
    }
    return chapter.elements.some((element) => visibleById[element.id]);
  }, [layout.chapters, visibleById]);

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

    const clamped = clamp(time, 0, VIDEO_END_SEC);
    currentTimeRef.current = clamped;

    if (Math.abs(videoEl.currentTime - clamped) > 0.001) {
      videoEl.currentTime = clamped;
    }

    setVideoTime(clamped);
  }, []);

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
    (nextStopIndex: number) => {
      if (!durationReady || stateRef.current !== "IDLE_AT_STOP") {
        return;
      }

      const frames = stopFramesRef.current;
      const clampedIndex = clamp(nextStopIndex, -1, frames.length - 1);
      if (clampedIndex === currentStopIndexRef.current) {
        gestureInProgressRef.current = false;
        return;
      }

      const startFrame = Math.round(currentTimeRef.current * FPS);
      const targetFrame = clampedIndex >= 0 ? frames[clampedIndex] : 0;
      const targetTime = frameToSec(targetFrame);

      tweenRef.current?.kill();
      setSceneStateSafe("TRANSITIONING");

      if (reducedMotion) {
        commitVideoTime(targetTime);
        currentStopIndexRef.current = clampedIndex;
        setCurrentStopIndex(clampedIndex);
        setSceneStateSafe("IDLE_AT_STOP");
        scheduleGestureReset();
        return;
      }

      const duration = getTransitionDurationSec(startFrame, targetFrame);
      const proxy = { time: currentTimeRef.current };
      const videoEl = videoRef.current;
      if (!videoEl) {
        setSceneStateSafe("IDLE_AT_STOP");
        gestureInProgressRef.current = false;
        return;
      }

      tweenRef.current = gsap.to(proxy, {
        time: targetTime,
        duration,
        ease: "none",
        overwrite: true,
        onUpdate: () => {
          currentTimeRef.current = proxy.time;
          videoEl.currentTime = proxy.time;
          setVideoTime(proxy.time);
        },
        onComplete: () => {
          commitVideoTime(targetTime);
          currentStopIndexRef.current = clampedIndex;
          setCurrentStopIndex(clampedIndex);
          setSceneStateSafe("IDLE_AT_STOP");
          scheduleGestureReset();
        }
      });
    },
    [commitVideoTime, durationReady, reducedMotion, scheduleGestureReset, setSceneStateSafe]
  );

  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMediaChange = () => {
      setReducedMotion(mediaQuery.matches);
    };

    const isDevMode = process.env.NODE_ENV === "development";
    const updateEditMode = () => {
      const params = new URLSearchParams(window.location.search);
      setEditMode(isDevMode || params.get("edit") === "1");
    };

    updateEditMode();
    handleMediaChange();

    mediaQuery.addEventListener("change", handleMediaChange);
    window.addEventListener("popstate", updateEditMode);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.removeEventListener("popstate", updateEditMode);
    };
  }, []);

  useEffect(() => {
    const defaultLayout = buildDefaultLayout();
    const merged = mergeLayout(defaultLayout, loadStoredLayout());
    setLayout(merged);
  }, []);

  useEffect(() => {
    if (!editMode) {
      return;
    }

    const timeout = window.setTimeout(() => {
      saveLayout(layout);
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [editMode, layout]);

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
      setDurationReady(videoEl.duration > 0);
      currentStopIndexRef.current = -1;
      setCurrentStopIndex(-1);
      currentTimeRef.current = 0;
      commitVideoTime(0);
      setSceneStateSafe("IDLE_AT_STOP");
      gestureInProgressRef.current = false;
      hasAutoOpenedRef.current = false;
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
    if (!durationReady || hasAutoOpenedRef.current) {
      return;
    }

    hasAutoOpenedRef.current = true;
    gestureInProgressRef.current = true;
    goToStop(0);
  }, [durationReady, goToStop]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spaceHeldRef.current = true;
      }

      if (!editMode || !selected) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        setLayout((prev) =>
          updateChapterElements(prev, selected.chapterId, (elements) => elements.filter((entry) => entry.id !== selected.elementId))
        );
        setSelected(null);
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        const delta = event.shiftKey ? 1 : 0.2;
        const dx = event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0;
        const dy = event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0;

        event.preventDefault();

        setLayout((prev) =>
          updateChapterElements(prev, selected.chapterId, (elements) =>
            elements.map((element) => {
              if (element.id !== selected.elementId) {
                return element;
              }
              return {
                ...element,
                x: clamp(element.x + dx, 0, 100),
                y: clamp(element.y + dy, 0, 100)
              };
            })
          )
        );
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spaceHeldRef.current = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [editMode, selected]);

  useEffect(() => {
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) {
      return;
    }

    const shouldBlockNavigation =
      editMode && lockPlayback && !spaceHeldRef.current;

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
      const currentIndex = currentStopIndexRef.current;
      const nextIndex = clamp(currentIndex + direction, -1, stopFramesRef.current.length - 1);

      if (nextIndex === currentIndex) {
        return;
      }

      gestureInProgressRef.current = true;
      goToStop(nextIndex);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      lastWheelTimeRef.current = Date.now();

      if (!durationReady || editorInteractingRef.current || shouldBlockNavigation) {
        return;
      }

      if (stateRef.current !== "IDLE_AT_STOP" || gestureInProgressRef.current) {
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
      event.preventDefault();
      if (event.touches.length !== 1) {
        return;
      }
      touchLastYRef.current = event.touches[0].clientY;
    };

    const onTouchEnd = () => {
      if (!durationReady || editorInteractingRef.current || shouldBlockNavigation) {
        touchStartYRef.current = null;
        touchLastYRef.current = null;
        return;
      }

      if (stateRef.current !== "IDLE_AT_STOP" || gestureInProgressRef.current) {
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
      const magnitude = Math.abs(deltaY);
      touchStartYRef.current = null;
      touchLastYRef.current = null;

      if (magnitude < TOUCH_SWIPE_THRESHOLD) {
        return;
      }

      const direction = deltaY < 0 ? 1 : -1;
      const currentIndex = currentStopIndexRef.current;
      const nextIndex = clamp(currentIndex + direction, -1, stopFramesRef.current.length - 1);
      if (nextIndex === currentIndex) {
        return;
      }

      lastWheelTimeRef.current = Date.now();
      gestureInProgressRef.current = true;
      goToStop(nextIndex);
    };

    wrapperEl.addEventListener("wheel", onWheel, { passive: false });
    wrapperEl.addEventListener("touchstart", onTouchStart, { passive: false });
    wrapperEl.addEventListener("touchmove", onTouchMove, { passive: false });
    wrapperEl.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      wrapperEl.removeEventListener("wheel", onWheel);
      wrapperEl.removeEventListener("touchstart", onTouchStart);
      wrapperEl.removeEventListener("touchmove", onTouchMove);
      wrapperEl.removeEventListener("touchend", onTouchEnd);

      if (wheelBufferTimerRef.current !== null) {
        window.clearTimeout(wheelBufferTimerRef.current);
        wheelBufferTimerRef.current = null;
      }
    };
  }, [durationReady, editMode, goToStop, lockPlayback]);

  useEffect(() => {
    const nextVisibility: Record<string, boolean> = {};
    const previous = visibleElementsRef.current;

    for (const chapter of layout.chapters) {
      const range = REVEAL_RANGES[chapter.chapterId];
      if (!range) {
        continue;
      }

      const softStart = range.start - HYSTERESIS_ENTER_SEC;
      const softEnd = range.end + HYSTERESIS_ENTER_SEC;
      const hardStart = range.start - HYSTERESIS_LEAVE_SEC;
      const hardEnd = range.end + HYSTERESIS_LEAVE_SEC;

      for (const element of chapter.elements) {
        const wasVisible = previous[element.id] ?? false;
        const shouldShow = videoTime >= softStart && videoTime <= softEnd;
        const forceHide = videoTime < hardStart || videoTime > hardEnd;
        nextVisibility[element.id] = wasVisible ? !forceHide : shouldShow;
      }
    }

    setVisibleById((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(nextVisibility);
      if (prevKeys.length !== nextKeys.length) {
        visibleElementsRef.current = nextVisibility;
        return nextVisibility;
      }
      for (const key of nextKeys) {
        if (prev[key] !== nextVisibility[key]) {
          visibleElementsRef.current = nextVisibility;
          return nextVisibility;
        }
      }
      return prev;
    });
  }, [layout.chapters, videoTime]);

  useEffect(() => {
    return () => {
      tweenRef.current?.kill();
      if (wheelBufferTimerRef.current !== null) {
        window.clearTimeout(wheelBufferTimerRef.current);
      }
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }
    };
  }, []);

  const onSelectElement = useCallback((chapterId: string, elementId: string) => {
    setSelected({ chapterId, elementId });
    zCounterRef.current += 1;
    const nextZ = zCounterRef.current;

    setLayout((prev) =>
      updateChapterElements(prev, chapterId, (elements) =>
        elements.map((element) => (element.id === elementId ? { ...element, zIndex: nextZ } : element))
      )
    );
  }, []);

  const onChangeElement = useCallback((chapterId: string, nextElement: OverlayElement) => {
    setLayout((prev) =>
      updateChapterElements(prev, chapterId, (elements) =>
        elements.map((element) => (element.id === nextElement.id ? nextElement : element))
      )
    );
  }, []);

  const onUpdateSelected = useCallback(
    (patch: Partial<OverlayElement>) => {
      if (!selected) {
        return;
      }

      setLayout((prev) =>
        updateChapterElements(prev, selected.chapterId, (elements) =>
          elements.map((element) => {
            if (element.id !== selected.elementId) {
              return element;
            }

            return {
              ...element,
              ...patch,
              x: patch.x !== undefined ? clamp(Number(patch.x), 0, 100) : element.x,
              y: patch.y !== undefined ? clamp(Number(patch.y), 0, 100) : element.y,
              w: patch.w !== undefined ? clamp(Number(patch.w), 1, 100) : element.w,
              h: patch.h !== undefined ? clamp(Number(patch.h), 1, 100) : element.h,
              zIndex: patch.zIndex !== undefined ? Number(patch.zIndex) : element.zIndex,
              parallaxStrength:
                patch.parallaxStrength !== undefined ? Number(patch.parallaxStrength) : element.parallaxStrength
            } as OverlayElement;
          })
        )
      );
    },
    [selected]
  );

  const onUpdateSelectedProps = useCallback(
    (patch: Record<string, unknown>) => {
      if (!selected) {
        return;
      }

      setLayout((prev) =>
        updateChapterElements(prev, selected.chapterId, (elements) =>
          elements.map((element) => {
            if (element.id !== selected.elementId) {
              return element;
            }
            return {
              ...element,
              props: {
                ...element.props,
                ...patch
              }
            } as OverlayElement;
          })
        )
      );
    },
    [selected]
  );

  const onAddElement = useCallback(
    (type: OverlayElementType) => {
      const targetChapterId = editorChapterId ?? activeStopChapterId;
      const nextElement = createNewElement(type, targetChapterId);

      setLayout((prev) =>
        updateChapterElements(prev, targetChapterId, (elements) => [...elements, nextElement])
      );

      setSelected({ chapterId: targetChapterId, elementId: nextElement.id });
    },
    [activeStopChapterId, editorChapterId]
  );

  const onDeleteSelected = useCallback(() => {
    if (!selected) {
      return;
    }

    setLayout((prev) =>
      updateChapterElements(prev, selected.chapterId, (elements) => elements.filter((element) => element.id !== selected.elementId))
    );
    setSelected(null);
  }, [selected]);

  const onSaveLayout = useCallback(() => {
    saveLayout(layout);
  }, [layout]);

  const onCopyJson = useCallback(async () => {
    const json = JSON.stringify(toPersistedLayout(layout), null, 2);
    await navigator.clipboard.writeText(json);
  }, [layout]);

  const onResetLayout = useCallback(() => {
    clearStoredLayout();
    setLayout(cloneLayout(buildDefaultLayout()));
    setSelected(null);
  }, []);

  return (
    <section ref={wrapperRef} className="relative h-screen w-full overflow-hidden touch-none bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src="/story.mp4"
        poster="/poster.jpg"
        muted
        playsInline
        preload="auto"
        aria-label="Cinematic portfolio video"
      />

      {!durationReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <p className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs tracking-[0.18em] text-white/75">LOADING STORY</p>
        </div>
      )}

      {editMode && (
        <OverlayEditorPanel
          chapters={layout.chapters}
          activeChapterId={editorChapterId ?? activeStopChapterId}
          onActiveChapterChange={setEditorChapterId}
          selectedElement={selectedElement}
          lockPlayback={lockPlayback}
          onLockPlaybackChange={setLockPlayback}
          onAddElement={onAddElement}
          onDeleteSelected={onDeleteSelected}
          onUpdateSelected={onUpdateSelected}
          onUpdateSelectedProps={onUpdateSelectedProps}
          onSave={onSaveLayout}
          onReset={onResetLayout}
          onCopyJson={() => void onCopyJson()}
        />
      )}

      <div className="absolute inset-0">
        <NameIntro opacity={introOpacity} />

        <div
          className={`${plank.className} absolute right-[6vw] top-[12vh] uppercase leading-none pointer-events-none`}
          style={{
            fontSize: "clamp(64px, 10vw, 150px)",
            opacity: designTitleVisible ? 1 : 0,
            transition: "opacity 0.8s ease-out",
            color: "#ff8e43",
            width: "auto",
            overflow: "visible",
            paddingRight: "0.2em",
            zIndex: 30
          }}
          aria-hidden={!designTitleVisible}
        >
          DESIGN
        </div>

        <OverlayRenderer
          chapters={layout.chapters}
          viewport={viewport}
          visibleById={visibleById}
          editMode={editMode}
          editableChapterId={editorChapterId ?? activeStopChapterId}
          selectedElementId={selected?.elementId ?? null}
          reducedMotion={reducedMotion}
          disableInteraction={!editMode && isTransitioning}
          onSelectElement={onSelectElement}
          onChangeElement={onChangeElement}
          onCommitElement={onSaveLayout}
          onInteraction={(active) => {
            editorInteractingRef.current = active;
          }}
          getOffset={(strength) => (parallaxEnabled ? getOffset(strength) : { x: 0, y: 0 })}
        />
      </div>
    </section>
  );
}
