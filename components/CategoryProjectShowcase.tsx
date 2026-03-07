"use client";

import { useEffect, useMemo, useState } from "react";

type ProjectImage = {
  src: string;
  alt: string;
};

export type CategoryProject = {
  slug: string;
  title: string;
  images: ProjectImage[];
};

type CategoryProjectShowcaseProps = {
  projects: CategoryProject[];
};

function CollageCell({ image, className }: { image: ProjectImage; className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-white/5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.alt} className="h-full w-full object-cover" loading="lazy" />
    </div>
  );
}

function pickImage(images: ProjectImage[], index: number) {
  return images[index] ?? images[0];
}

export default function CategoryProjectShowcase({ projects }: CategoryProjectShowcaseProps) {
  const [activeProjectIndex, setActiveProjectIndex] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const activeProject = useMemo(() => {
    if (activeProjectIndex === null) {
      return null;
    }

    return projects[activeProjectIndex] ?? null;
  }, [activeProjectIndex, projects]);

  useEffect(() => {
    if (!activeProject) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveProjectIndex(null);
        return;
      }

      if (event.key === "ArrowRight") {
        setActiveImageIndex((prev) => (prev + 1) % activeProject.images.length);
      }

      if (event.key === "ArrowLeft") {
        setActiveImageIndex((prev) => (prev - 1 + activeProject.images.length) % activeProject.images.length);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeProject]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, projectIndex) => {
          const collageImages = [pickImage(project.images, 0), pickImage(project.images, 1), pickImage(project.images, 2), pickImage(project.images, 3)];

          return (
            <button
              key={project.slug}
              type="button"
              onClick={() => {
                setActiveProjectIndex(projectIndex);
                setActiveImageIndex(0);
              }}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03] p-2 text-left transition hover:scale-[1.01] hover:border-white/35"
            >
              <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-2">
                <CollageCell image={collageImages[0]} className="col-span-2 row-span-2" />
                <CollageCell image={collageImages[1]} className="col-span-1 row-span-1" />
                <CollageCell image={collageImages[2]} className="col-span-1 row-span-1" />
                <CollageCell image={collageImages[3]} className="col-span-3 row-span-1" />
              </div>

              <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-xl bg-black/70 px-3 py-2 backdrop-blur-sm">
                <p className="truncate text-sm font-medium text-white">{project.title}</p>
                <p className="text-xs text-white/70">{project.images.length} images</p>
              </div>
            </button>
          );
        })}
      </div>

      {activeProject && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4 sm:p-6" role="dialog" aria-modal="true">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-medium text-white">{activeProject.title}</p>
              <p className="text-sm text-white/70">
                {activeImageIndex + 1} / {activeProject.images.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveProjectIndex(null)}
              className="rounded-full border border-white/25 px-4 py-2 text-sm text-white transition hover:border-white/40 hover:bg-white/10"
            >
              Close
            </button>
          </div>

          <div className="relative mb-4 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeProject.images[activeImageIndex].src}
              alt={activeProject.images[activeImageIndex].alt}
              className="max-h-full max-w-full object-contain"
            />

            {activeProject.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev - 1 + activeProject.images.length) % activeProject.images.length)
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/60 px-3 py-2 text-sm text-white transition hover:border-white/45"
                  aria-label="Previous image"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev + 1) % activeProject.images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/60 px-3 py-2 text-sm text-white transition hover:border-white/45"
                  aria-label="Next image"
                >
                  Next
                </button>
              </>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {activeProject.images.map((image, imageIndex) => (
              <button
                key={image.src}
                type="button"
                onClick={() => setActiveImageIndex(imageIndex)}
                className={`relative h-16 w-16 flex-none overflow-hidden rounded-lg border ${
                  imageIndex === activeImageIndex ? "border-white/70" : "border-white/20"
                }`}
                aria-label={`View image ${imageIndex + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt={image.alt} className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
