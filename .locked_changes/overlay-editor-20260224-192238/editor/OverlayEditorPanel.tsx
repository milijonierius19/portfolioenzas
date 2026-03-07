"use client";

import type { ChapterOverlayLayout, OverlayElement, OverlayElementType } from "@/lib/layoutTypes";

type OverlayEditorPanelProps = {
  chapters: ChapterOverlayLayout[];
  activeChapterId: string;
  onActiveChapterChange: (chapterId: string) => void;
  selectedElement: OverlayElement | null;
  lockPlayback: boolean;
  onLockPlaybackChange: (locked: boolean) => void;
  onAddElement: (type: OverlayElementType) => void;
  onDeleteSelected: () => void;
  onUpdateSelected: (patch: Partial<OverlayElement>) => void;
  onUpdateSelectedProps: (patch: Record<string, unknown>) => void;
  onSave: () => void;
  onReset: () => void;
  onCopyJson: () => void;
};

export default function OverlayEditorPanel({
  chapters,
  activeChapterId,
  onActiveChapterChange,
  selectedElement,
  lockPlayback,
  onLockPlaybackChange,
  onAddElement,
  onDeleteSelected,
  onUpdateSelected,
  onUpdateSelectedProps,
  onSave,
  onReset,
  onCopyJson
}: OverlayEditorPanelProps) {
  return (
    <aside className="absolute left-3 top-3 z-[200] w-[min(94vw,28rem)] space-y-2 rounded-xl border border-white/30 bg-black/70 p-3 text-xs text-white backdrop-blur">
      <p className="font-semibold tracking-[0.14em] text-white/90">OVERLAY EDITOR</p>

      <label className="block">
        <span className="mb-1 block text-white/70">Chapter</span>
        <select
          value={activeChapterId}
          onChange={(event) => onActiveChapterChange(event.target.value)}
          className="w-full rounded border border-white/35 bg-black/40 px-2 py-1"
        >
          {chapters.map((chapter) => (
            <option key={chapter.chapterId} value={chapter.chapterId}>
              {chapter.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded border border-white/40 px-2 py-1" onClick={() => onAddElement("window")}>
          Add Window
        </button>
        <button type="button" className="rounded border border-white/40 px-2 py-1" onClick={() => onAddElement("text")}>
          Add Text
        </button>
        <button type="button" className="rounded border border-white/40 px-2 py-1" onClick={() => onAddElement("image")}>
          Add Image
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded border border-white/40 px-2 py-1" onClick={onSave}>
          Save layout
        </button>
        <button type="button" className="rounded border border-white/40 px-2 py-1" onClick={onCopyJson}>
          Copy JSON
        </button>
        <button type="button" className="rounded border border-white/40 px-2 py-1" onClick={onReset}>
          Reset
        </button>
      </div>

      <label className="flex items-center gap-2 pt-1">
        <input type="checkbox" checked={lockPlayback} onChange={(event) => onLockPlaybackChange(event.target.checked)} />
        Lock playback
      </label>

      {selectedElement && (
        <div className="space-y-2 border-t border-white/20 pt-2">
          <p className="text-white/80">
            Selected: {selectedElement.id} ({selectedElement.type})
          </p>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1 block text-white/70">x</span>
              <input
                type="number"
                value={selectedElement.x}
                onChange={(event) => onUpdateSelected({ x: Number(event.target.value) })}
                className="w-full rounded border border-white/35 bg-black/40 px-2 py-1"
              />
            </label>
            <label>
              <span className="mb-1 block text-white/70">y</span>
              <input
                type="number"
                value={selectedElement.y}
                onChange={(event) => onUpdateSelected({ y: Number(event.target.value) })}
                className="w-full rounded border border-white/35 bg-black/40 px-2 py-1"
              />
            </label>
            <label>
              <span className="mb-1 block text-white/70">w</span>
              <input
                type="number"
                value={selectedElement.w}
                onChange={(event) => onUpdateSelected({ w: Number(event.target.value) })}
                className="w-full rounded border border-white/35 bg-black/40 px-2 py-1"
              />
            </label>
            <label>
              <span className="mb-1 block text-white/70">h</span>
              <input
                type="number"
                value={selectedElement.h}
                onChange={(event) => onUpdateSelected({ h: Number(event.target.value) })}
                className="w-full rounded border border-white/35 bg-black/40 px-2 py-1"
              />
            </label>
            <label>
              <span className="mb-1 block text-white/70">zIndex</span>
              <input
                type="number"
                value={selectedElement.zIndex}
                onChange={(event) => onUpdateSelected({ zIndex: Number(event.target.value) })}
                className="w-full rounded border border-white/35 bg-black/40 px-2 py-1"
              />
            </label>
            <label>
              <span className="mb-1 block text-white/70">Parallax</span>
              <input
                type="number"
                step="0.1"
                value={selectedElement.parallaxStrength}
                onChange={(event) => onUpdateSelected({ parallaxStrength: Number(event.target.value) })}
                className="w-full rounded border border-white/35 bg-black/40 px-2 py-1"
              />
            </label>
          </div>

          {selectedElement.type === "window" && (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-white/70">Label</span>
                <input
                  value={selectedElement.props.label}
                  onChange={(event) => onUpdateSelectedProps({ label: event.target.value })}
                  className="w-full rounded border border-white/35 bg-black/40 px-2 py-1"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-white/70">Title</span>
                <input
                  value={selectedElement.props.title}
                  onChange={(event) => onUpdateSelectedProps({ title: event.target.value })}
                  className="w-full rounded border border-white/35 bg-black/40 px-2 py-1"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-white/70">Body</span>
                <textarea
                  value={selectedElement.props.body}
                  onChange={(event) => onUpdateSelectedProps({ body: event.target.value })}
                  className="h-20 w-full rounded border border-white/35 bg-black/40 px-2 py-1"
                />
              </label>
            </div>
          )}

          {selectedElement.type === "text" && (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-white/70">Text</span>
                <textarea
                  value={selectedElement.props.text}
                  onChange={(event) => onUpdateSelectedProps({ text: event.target.value })}
                  className="h-20 w-full rounded border border-white/35 bg-black/40 px-2 py-1"
                />
              </label>
            </div>
          )}

          {selectedElement.type === "image" && (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-white/70">Image src</span>
                <input
                  value={selectedElement.props.src}
                  onChange={(event) => onUpdateSelectedProps({ src: event.target.value })}
                  placeholder="/elements/example.png"
                  className="w-full rounded border border-white/35 bg-black/40 px-2 py-1"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-white/70">Opacity</span>
                <input
                  type="number"
                  step="0.05"
                  value={selectedElement.props.opacity}
                  onChange={(event) => onUpdateSelectedProps({ opacity: Number(event.target.value) })}
                  className="w-full rounded border border-white/35 bg-black/40 px-2 py-1"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-white/70">Rotate (deg)</span>
                <input
                  type="number"
                  value={selectedElement.props.rotateDeg}
                  onChange={(event) => onUpdateSelectedProps({ rotateDeg: Number(event.target.value) })}
                  className="w-full rounded border border-white/35 bg-black/40 px-2 py-1"
                />
              </label>
            </div>
          )}

          <button type="button" className="rounded border border-red-300/60 px-2 py-1 text-red-200" onClick={onDeleteSelected}>
            Delete selected
          </button>
        </div>
      )}
    </aside>
  );
}
