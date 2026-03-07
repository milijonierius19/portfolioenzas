import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryProjectShowcase, { type CategoryProject } from "@/components/CategoryProjectShowcase";
import { DESIGN_CATEGORY_BY_SLUG } from "@/lib/designProjects";
import { minecardLCD } from "@/lib/fonts";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);

type CategoryPageProps = {
  params: { category: string };
  searchParams?: { from?: string };
};

function toLabel(value: string) {
  return value
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildPublicPath(segments: string[]) {
  return `/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

async function readImagesFromFolder(filePath: string, publicPathSegments: string[]) {
  const fileEntries = await fs.readdir(filePath, { withFileTypes: true }).catch(() => []);

  return fileEntries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
    .map((entry) => ({
      src: buildPublicPath([...publicPathSegments, entry.name]),
      alt: toLabel(entry.name)
    }));
}

async function readCategoryProjects(folder: string): Promise<CategoryProject[]> {
  const folderPath = path.join(process.cwd(), "public", "design_works", folder);
  const entries = await fs.readdir(folderPath, { withFileTypes: true }).catch(() => null);
  if (!entries) {
    return [];
  }

  const projectFolders = entries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

  const nestedProjects = await Promise.all(
    projectFolders.map(async (projectFolder) => {
      const images = await readImagesFromFolder(path.join(folderPath, projectFolder.name), [
        "design_works",
        folder,
        projectFolder.name
      ]);
      if (!images.length) {
        return null;
      }

      return {
        slug: projectFolder.name,
        title: toLabel(projectFolder.name),
        images
      };
    })
  );

  const rootImages = entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
    .map((entry) => ({
      src: buildPublicPath(["design_works", folder, entry.name]),
      alt: toLabel(entry.name)
    }));

  const projects = nestedProjects.filter((project): project is CategoryProject => Boolean(project));
  if (rootImages.length) {
    projects.unshift({
      slug: `${folder}-collection`,
      title: "Collection",
      images: rootImages
    });
  }

  return projects;
}

export default async function DesignCategoryPage({ params, searchParams }: CategoryPageProps) {
  const category = DESIGN_CATEGORY_BY_SLUG[params.category];
  if (!category) {
    notFound();
  }

  const fromSection = searchParams?.from ?? "design";
  const homeHref = `/?section=${encodeURIComponent(fromSection)}`;
  const backHref = `/projects/design?from=${encodeURIComponent(fromSection)}`;
  const projects = await readCategoryProjects(category.folder);

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

        {projects.length === 0 ? (
          <div className="flex min-h-[58svh] items-center justify-center text-center">
            <p className={`${minecardLCD.className} text-2xl tracking-[0.08em] text-[#ff8e43] sm:text-3xl`}>
              This is empty.
              <br />
              I&apos;ll update later.
            </p>
          </div>
        ) : (
          category.folder === "web_design" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const hero = project.images[0];
                if (!hero) {
                  return null;
                }

                const websiteLabel = project.slug;
                const websiteHref = /^https?:\/\//i.test(websiteLabel) ? websiteLabel : `https://${websiteLabel}`;

                return (
                  <figure key={project.slug}>
                    <a href={websiteHref} target="_blank" rel="noreferrer" aria-label={`Open ${websiteLabel}`} className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={hero.src} alt={hero.alt} className="block h-auto w-full" loading="lazy" />
                    </a>
                    <figcaption className={`${minecardLCD.className} mt-2 text-xs tracking-[0.08em] text-white/85`}>
                      {websiteLabel}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          ) : (
            <CategoryProjectShowcase projects={projects} />
          )
        )}
      </div>
    </main>
  );
}
