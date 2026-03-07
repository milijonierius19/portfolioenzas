"use client";

import Image from "next/image";
import Link from "next/link";
import { minecardLCD } from "@/lib/fonts";
import EditableElement from "@/components/editor/EditableElement";
import type { ChapterOverlayLayout, OverlayElement } from "@/lib/layoutTypes";

type OverlayRendererProps = {
  chapters: ChapterOverlayLayout[];
  viewport: { width: number; height: number };
  visibleById: Record<string, boolean>;
  editMode: boolean;
  editableChapterId: string;
  selectedElementId: string | null;
  reducedMotion: boolean;
  disableInteraction: boolean;
  onSelectElement: (chapterId: string, elementId: string) => void;
  onChangeElement: (chapterId: string, nextElement: OverlayElement) => void;
  onCommitElement: () => void;
  onInteraction: (active: boolean) => void;
  getOffset: (strength: number) => { x: number; y: number };
};

const HEADER_FONT_LABELS = new Set(["SIDE PROJECT", "DESIGN WORK", "DESIGN STORY"]);
const TITLE_FONT_LABELS = new Set(["WHAT I DESIGN", "SLKWEAR.COM", "DESIGN SINCE 2024"]);

const getHeaderFontClass = (text: string) => (HEADER_FONT_LABELS.has(text.trim().toUpperCase()) ? minecardLCD.className : "");
const getTitleFontClass = (text: string) => (TITLE_FONT_LABELS.has(text.trim().toUpperCase()) ? minecardLCD.className : "");

function WindowElementView({ element, editMode }: { element: Extract<OverlayElement, { type: "window" }>; editMode: boolean }) {
  const props = element.props;

  if (props.ctaOnly) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {props.ctas.map((cta) => (
          <Link
            key={`${element.id}-${cta.href}-${cta.label}`}
            href={cta.href}
            className={`${minecardLCD.className} rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium tracking-wide text-white backdrop-blur-[14px] backdrop-saturate-150 transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
            onClick={(event) => {
              if (editMode) {
                event.preventDefault();
              }
            }}
          >
            {cta.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <article className={`h-full w-full rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_18px_42px_rgba(0,0,0,0.32)] backdrop-blur-[14px] backdrop-saturate-150 ${props.compact ? "p-2.5" : "p-4"}`}>
      <p className={`${getHeaderFontClass(props.label)} text-[11px] uppercase tracking-[0.22em]`} style={{ color: "#ff8e43" }}>
        {props.label}
      </p>
      {props.logoSrc ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className={`${getTitleFontClass(props.title)} text-xl font-semibold leading-tight`}>{props.title}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/85">{props.body}</p>
          </div>
          {props.logoHref ? (
            <a
              href={props.logoHref}
              target="_blank"
              rel="noreferrer"
              className="shrink-0"
              onClick={(event) => {
                if (editMode) {
                  event.preventDefault();
                }
              }}
            >
              <Image
                src={props.logoSrc}
                alt=""
                width={160}
                height={props.logoHeightPx ?? 64}
                className="h-auto w-auto object-contain"
                style={{ height: `${props.logoHeightPx ?? 64}px` }}
              />
            </a>
          ) : (
            <Image
              src={props.logoSrc}
              alt=""
              width={160}
              height={props.logoHeightPx ?? 64}
              className="h-auto w-auto object-contain"
              style={{ height: `${props.logoHeightPx ?? 64}px` }}
            />
          )}
        </div>
      ) : (
        <>
          <h2 className={`${getTitleFontClass(props.title)} mt-2 text-xl font-semibold leading-tight`}>{props.title}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/85">{props.body}</p>
        </>
      )}
      {props.ctas.length > 0 && !props.ctaOnly && (
        <div className="mt-4 flex flex-wrap gap-2">
          {props.ctas.map((cta) => (
            <Link
              key={`${element.id}-${cta.href}-${cta.label}`}
              href={cta.href}
              className={`${minecardLCD.className} rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium tracking-wide text-white transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
              onClick={(event) => {
                if (editMode) {
                  event.preventDefault();
                }
              }}
            >
              {cta.label}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

function TextElementView({ element }: { element: Extract<OverlayElement, { type: "text" }> }) {
  return (
    <div
      className="h-full w-full whitespace-pre-line"
      style={{
        color: element.props.color,
        fontSize: `${element.props.size}px`,
        fontWeight: element.props.weight,
        textAlign: element.props.align,
        letterSpacing: `${element.props.letterSpacing}em`,
        lineHeight: element.props.lineHeight,
        fontFamily: element.props.fontKey
      }}
    >
      {element.props.text}
    </div>
  );
}

function ImageElementView({ element }: { element: Extract<OverlayElement, { type: "image" }> }) {
  const tintStyle = element.props.tint === "white" ? { filter: "brightness(0) invert(1)" } : undefined;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ opacity: element.props.opacity, transform: `rotate(${element.props.rotateDeg}deg)` }}>
      <Image src={element.props.src} alt="" fill className="pointer-events-none" style={{ objectFit: element.props.fit, ...tintStyle }} />
    </div>
  );
}

export default function OverlayRenderer({
  chapters,
  viewport,
  visibleById,
  editMode,
  editableChapterId,
  selectedElementId,
  reducedMotion,
  disableInteraction,
  onSelectElement,
  onChangeElement,
  onCommitElement,
  onInteraction,
  getOffset
}: OverlayRendererProps) {
  return (
    <div className="absolute inset-0">
      {chapters.flatMap((chapter) =>
        chapter.elements.map((element) => {
          const visible = visibleById[element.id] ?? false;
          const offset = getOffset(element.parallaxStrength);
          const selected = selectedElementId === element.id;
          const canEditElement = editMode && chapter.chapterId === editableChapterId;

          const wrappedStyle = {
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${visible ? 1 : 0.96})`,
            opacity: visible ? 1 : 0,
            transitionDuration: reducedMotion ? "80ms" : visible ? "320ms" : "180ms",
            transitionTimingFunction: "cubic-bezier(0.22, 0.61, 0.36, 1)",
            transitionProperty: "transform, opacity",
            pointerEvents: visible && !disableInteraction ? "auto" : "none",
            height: "100%",
            width: "100%"
          } as const;

          const elementView = (
            <div style={wrappedStyle}>
              {element.type === "window" && <WindowElementView element={element} editMode={editMode} />}
              {element.type === "text" && <TextElementView element={element} />}
              {element.type === "image" && <ImageElementView element={element} />}
            </div>
          );

          if (!editMode) {
            return (
              <div
                key={`${chapter.chapterId}-${element.id}`}
                className="absolute"
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  width: `${element.w}%`,
                  height: `${element.h}%`,
                  zIndex: element.zIndex
                }}
              >
                {elementView}
              </div>
            );
          }

          return (
            <EditableElement
              key={`${chapter.chapterId}-${element.id}`}
              element={element}
              viewport={viewport}
              enabled={canEditElement}
              selected={selected}
              onSelect={() => onSelectElement(chapter.chapterId, element.id)}
              onChange={(next) => onChangeElement(chapter.chapterId, next)}
              onCommit={onCommitElement}
              onInteraction={onInteraction}
            >
              {elementView}
            </EditableElement>
          );
        })
      )}
    </div>
  );
}
