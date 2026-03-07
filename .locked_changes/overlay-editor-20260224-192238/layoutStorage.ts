import type {
  ChapterOverlayLayout,
  LegacyGeometryLayout,
  OverlayElement,
  PersistedChapterLayout,
  PersistedOverlayElement,
  PersistedStoryLayout,
  StoryOverlayLayout
} from "@/lib/layoutTypes";

export const STORY_LAYOUT_STORAGE_KEY = "story_layout_v1";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isString = (value: unknown): value is string => typeof value === "string";

function isOverlayType(value: unknown): value is OverlayElement["type"] {
  return value === "window" || value === "text" || value === "image";
}

function parsePersistedElement(candidate: unknown): PersistedOverlayElement | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const value = candidate as Record<string, unknown>;
  if (!isString(value.id) || !isOverlayType(value.type)) {
    return null;
  }
  if (![value.x, value.y, value.w, value.h, value.zIndex, value.parallaxStrength].every(isNumber)) {
    return null;
  }
  if (!value.props || typeof value.props !== "object") {
    return null;
  }

  return {
    id: value.id,
    type: value.type,
    x: Number(value.x),
    y: Number(value.y),
    w: Number(value.w),
    h: Number(value.h),
    zIndex: Number(value.zIndex),
    parallaxStrength: Number(value.parallaxStrength),
    props: value.props as PersistedOverlayElement["props"]
  };
}

function parsePersistedLayout(raw: string): PersistedStoryLayout | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const value = parsed as Record<string, unknown>;
    if (value.version !== 1 || !Array.isArray(value.chapters)) {
      return null;
    }

    const chapters: PersistedChapterLayout[] = [];
    for (const chapterCandidate of value.chapters) {
      if (!chapterCandidate || typeof chapterCandidate !== "object") {
        continue;
      }

      const chapter = chapterCandidate as Record<string, unknown>;
      if (!isString(chapter.chapterId) || !Array.isArray(chapter.elements)) {
        continue;
      }

      const elements = chapter.elements
        .map((entry) => parsePersistedElement(entry))
        .filter((entry): entry is PersistedOverlayElement => entry !== null);

      chapters.push({
        chapterId: chapter.chapterId,
        elements
      });
    }

    return {
      version: 1,
      chapters
    };
  } catch {
    return null;
  }
}

function parseLegacyLayout(raw: string): LegacyGeometryLayout | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const value = parsed as Record<string, unknown>;
    if (!value.windows || typeof value.windows !== "object") {
      return null;
    }

    const windows: LegacyGeometryLayout["windows"] = {};
    for (const [id, geometry] of Object.entries(value.windows as Record<string, unknown>)) {
      if (!geometry || typeof geometry !== "object") {
        continue;
      }
      const v = geometry as Record<string, unknown>;
      if (!isNumber(v.x) || !isNumber(v.y)) {
        continue;
      }
      windows[id] = {
        x: v.x,
        y: v.y,
        w: isNumber(v.w) ? v.w : undefined,
        h: isNumber(v.h) ? v.h : undefined,
        z: isNumber(v.z) ? v.z : undefined
      };
    }

    return { windows };
  } catch {
    return null;
  }
}

export function toPersistedLayout(layout: StoryOverlayLayout): PersistedStoryLayout {
  return {
    version: 1,
    chapters: layout.chapters.map((chapter) => ({
      chapterId: chapter.chapterId,
      elements: chapter.elements.map((element) => ({
        id: element.id,
        type: element.type,
        x: element.x,
        y: element.y,
        w: element.w,
        h: element.h,
        zIndex: element.zIndex,
        parallaxStrength: element.parallaxStrength,
        props: element.props
      }))
    }))
  };
}

export function saveLayout(layout: StoryOverlayLayout): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORY_LAYOUT_STORAGE_KEY, JSON.stringify(toPersistedLayout(layout)));
}

export function loadStoredLayout(): PersistedStoryLayout | LegacyGeometryLayout | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORY_LAYOUT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  return parsePersistedLayout(raw) ?? parseLegacyLayout(raw);
}

export function clearStoredLayout(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORY_LAYOUT_STORAGE_KEY);
}

function mergeElements(baseElements: OverlayElement[], overrides: PersistedOverlayElement[]): OverlayElement[] {
  const overrideById = new Map(overrides.map((element) => [element.id, element]));

  const merged = baseElements.map((element) => {
    const override = overrideById.get(element.id);
    if (!override) {
      return element;
    }

    return {
      ...element,
      type: override.type,
      x: clamp(override.x, 0, 100),
      y: clamp(override.y, 0, 100),
      w: clamp(override.w, 1, 100),
      h: clamp(override.h, 1, 100),
      zIndex: override.zIndex,
      parallaxStrength: override.parallaxStrength,
      props: override.props as OverlayElement["props"]
    } as OverlayElement;
  });

  for (const override of overrides) {
    if (baseElements.some((element) => element.id === override.id)) {
      continue;
    }

    merged.push({
      id: override.id,
      type: override.type,
      x: clamp(override.x, 0, 100),
      y: clamp(override.y, 0, 100),
      w: clamp(override.w, 1, 100),
      h: clamp(override.h, 1, 100),
      zIndex: override.zIndex,
      parallaxStrength: override.parallaxStrength,
      props: override.props as OverlayElement["props"]
    } as OverlayElement);
  }

  return merged;
}

export function mergeLayout(defaultLayout: StoryOverlayLayout, stored: PersistedStoryLayout | LegacyGeometryLayout | null): StoryOverlayLayout {
  if (!stored) {
    return defaultLayout;
  }

  if ("windows" in stored) {
    return {
      ...defaultLayout,
      chapters: defaultLayout.chapters.map((chapter) => ({
        ...chapter,
        elements: chapter.elements.map((element) => {
          const geometry = stored.windows[element.id];
          if (!geometry) {
            return element;
          }
          return {
            ...element,
            x: clamp(geometry.x, 0, 100),
            y: clamp(geometry.y, 0, 100),
            w: geometry.w ? clamp(geometry.w, 1, 100) : element.w,
            h: geometry.h ? clamp(geometry.h, 1, 100) : element.h,
            zIndex: geometry.z ?? element.zIndex
          };
        })
      }))
    };
  }

  const chapterOverrideMap = new Map(stored.chapters.map((chapter) => [chapter.chapterId, chapter.elements]));

  return {
    ...defaultLayout,
    chapters: defaultLayout.chapters.map((chapter) => ({
      ...chapter,
      elements: mergeElements(chapter.elements, chapterOverrideMap.get(chapter.chapterId) ?? [])
    }))
  };
}

export function cloneLayout(layout: StoryOverlayLayout): StoryOverlayLayout {
  return {
    version: 1,
    chapters: layout.chapters.map((chapter) => ({
      chapterId: chapter.chapterId,
      label: chapter.label,
      elements: chapter.elements.map((element) => ({ ...element, props: { ...element.props } } as OverlayElement))
    }))
  };
}
