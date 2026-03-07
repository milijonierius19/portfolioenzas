"use client";

import { useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";
import type { OverlayElement } from "@/lib/layoutTypes";

type EditableElementProps = {
  element: OverlayElement;
  viewport: { width: number; height: number };
  selected: boolean;
  enabled: boolean;
  onSelect: () => void;
  onChange: (next: OverlayElement) => void;
  onCommit: () => void;
  onInteraction: (active: boolean) => void;
  children: React.ReactNode;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function EditableElement({
  element,
  viewport,
  selected,
  enabled,
  onSelect,
  onChange,
  onCommit,
  onInteraction,
  children
}: EditableElementProps) {
  const [shiftDown, setShiftDown] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setShiftDown(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setShiftDown(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const pxGeometry = useMemo(
    () => ({
      x: (element.x / 100) * viewport.width,
      y: (element.y / 100) * viewport.height,
      width: (element.w / 100) * viewport.width,
      height: (element.h / 100) * viewport.height
    }),
    [element.h, element.w, element.x, element.y, viewport.height, viewport.width]
  );

  return (
    <Rnd
      bounds="parent"
      position={{ x: pxGeometry.x, y: pxGeometry.y }}
      size={{ width: pxGeometry.width, height: pxGeometry.height }}
      disableDragging={!enabled}
      enableResizing={
        enabled
          ? {
              top: true,
              right: true,
              bottom: true,
              left: true,
              topRight: true,
              bottomRight: true,
              bottomLeft: true,
              topLeft: true
            }
          : false
      }
      lockAspectRatio={enabled && element.type === "image" && shiftDown}
      onDragStart={() => {
        onSelect();
        onInteraction(true);
      }}
      onDrag={(_event, data) => {
        const nextX = clamp((data.x / viewport.width) * 100, 0, 100);
        const nextY = clamp((data.y / viewport.height) * 100, 0, 100);
        onChange({ ...element, x: nextX, y: nextY });
      }}
      onDragStop={() => {
        onInteraction(false);
        onCommit();
      }}
      onResizeStart={() => {
        onSelect();
        onInteraction(true);
      }}
      onResize={(_event, _dir, ref, _delta, position) => {
        const nextW = clamp((ref.offsetWidth / viewport.width) * 100, 1, 100);
        const nextH = clamp((ref.offsetHeight / viewport.height) * 100, 1, 100);
        const nextX = clamp((position.x / viewport.width) * 100, 0, 100);
        const nextY = clamp((position.y / viewport.height) * 100, 0, 100);

        onChange({
          ...element,
          x: nextX,
          y: nextY,
          w: nextW,
          h: nextH
        });
      }}
      onResizeStop={() => {
        onInteraction(false);
        onCommit();
      }}
      style={{
        zIndex: element.zIndex,
        outline: selected && enabled ? "2px solid rgba(255,255,255,0.75)" : "none"
      }}
      onClick={onSelect}
    >
      <div className="h-full w-full">{children}</div>
    </Rnd>
  );
}
