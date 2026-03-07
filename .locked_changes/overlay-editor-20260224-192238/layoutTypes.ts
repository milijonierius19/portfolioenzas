export type OverlayElementType = "window" | "text" | "image";

export type ElementCTA = {
  label: string;
  href: string;
};

export type WindowElementProps = {
  label: string;
  title: string;
  body: string;
  ctas: ElementCTA[];
  logoSrc?: string;
  logoHref?: string;
  logoHeightPx?: number;
  ctaOnly?: boolean;
  compact?: boolean;
};

export type TextElementProps = {
  text: string;
  fontKey: string;
  size: number;
  weight: number;
  color: string;
  align: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
};

export type ImageElementProps = {
  src: string;
  fit: "contain" | "cover";
  opacity: number;
  rotateDeg: number;
  tint: "none" | "white";
};

export type BaseOverlayElement = {
  id: string;
  type: OverlayElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  parallaxStrength: number;
};

export type WindowOverlayElement = BaseOverlayElement & {
  type: "window";
  props: WindowElementProps;
};

export type TextOverlayElement = BaseOverlayElement & {
  type: "text";
  props: TextElementProps;
};

export type ImageOverlayElement = BaseOverlayElement & {
  type: "image";
  props: ImageElementProps;
};

export type OverlayElement = WindowOverlayElement | TextOverlayElement | ImageOverlayElement;

export type ChapterOverlayLayout = {
  chapterId: string;
  label: string;
  elements: OverlayElement[];
};

export type StoryOverlayLayout = {
  version: 1;
  chapters: ChapterOverlayLayout[];
};

export type PersistedOverlayElement = {
  id: string;
  type: OverlayElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  parallaxStrength: number;
  props: WindowElementProps | TextElementProps | ImageElementProps;
};

export type PersistedChapterLayout = {
  chapterId: string;
  elements: PersistedOverlayElement[];
};

export type PersistedStoryLayout = {
  version: 1;
  chapters: PersistedChapterLayout[];
};

export type LegacyGeometryLayout = {
  windows: Record<string, { x: number; y: number; w?: number; h?: number; z?: number }>;
};
