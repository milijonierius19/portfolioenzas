import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { THREE_D_CATEGORY_BY_SLUG } from "@/lib/threeDProjects";
import { minecardLCD } from "@/lib/fonts";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);

type CategoryMedia = {
  src: string;
  alt: string;
  type: "image" | "video";
};

type CategoryPageProps = {
  params: { category: string };
  searchParams?: { from?: string };
};

function toLabel(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function readCategoryMedia(folder: string): Promise<CategoryMedia[]> {
  const folderPath = path.join(process.cwd(), "public", "three_d_works", folder);
  const entries = await fs.readdir(folderPath, { withFileTypes: true }).catch(() => null);
  if (!entries) {
    return [];
  }

  return entries
    .filter((entry) => {
      if (!entry.isFile()) {
        return false;
      }
      const ext = path.extname(entry.name).toLowerCase();
      return IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);
    })
    .map((entry): CategoryMedia => {
      const ext = path.extname(entry.name).toLowerCase();
      return {
        src: `/three_d_works/${folder}/${encodeURIComponent(entry.name)}`,
        alt: toLabel(entry.name),
        type: VIDEO_EXTENSIONS.has(ext) ? "video" : "image"
      };
    })
    .sort((a, b) => a.src.localeCompare(b.src));
}

export default async function ThreeDCategoryPage({ params, searchParams }: CategoryPageProps) {
  const category = THREE_D_CATEGORY_BY_SLUG[params.category];
  if (!category) {
    notFound();
  }

  const fromSection = searchParams?.from ?? "development";
  const homeHref = `/?section=${encodeURIComponent(fromSection)}`;
  const backHref = `/projects/3d?from=${encodeURIComponent(fromSection)}`;
  const media = await readCategoryMedia(category.folder);

  return (
    <main className="min-h-[100svh] bg-black px-4 pb-8 pt-16 sm:px-6 sm:pt-20">
      <div className="mx-auto w-full max-w-7xl">
        <div className="sticky top-4 z-20 mb-6 flex items-center gap-2">
          <Link
            href={homeHref}
            className="rounded-full border border-white/25 bg-black/70 px-4 py-2 text-sm tracking-wide text-white transition hover:border-white/40 hover:bg-white/10"
          >
            Home
          </Link>
          <Link
            href={backHref}
            className="rounded-full border border-white/25 bg-black/70 px-4 py-2 text-sm tracking-wide text-white transition hover:border-white/40 hover:bg-white/10"
          >
            Back
          </Link>
        </div>

        {media.length === 0 ? (
          <div className="flex min-h-[58svh] items-center justify-center text-center">
            <p className={`${minecardLCD.className} text-2xl tracking-[0.08em] text-[#ff8e43] sm:text-3xl`}>
              This is empty.
              <br />
              I&apos;ll update later.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item) => (
              <figure key={item.src} className="group overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04]">
                <div className="relative aspect-video overflow-hidden">
                  {item.type === "video" ? (
                    <video
                      src={item.src}
                      aria-label={item.alt}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.src}
                      alt={item.alt}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  )}
                </div>
                <figcaption className="px-3 py-2 text-xs tracking-wide text-white/75">{item.alt}</figcaption>
              </figure>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
