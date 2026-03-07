import fs from "node:fs/promises";
import path from "node:path";

type ProjectMeta = {
  title?: string;
  summary?: string;
  description?: string;
  cover?: string;
  video?: string;
};

export type AIProject = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  cover?: string;
  video?: string;
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);

function safePublicFileUrl(folder: string, fileName?: string) {
  if (!fileName) {
    return undefined;
  }
  return `/ai_works/${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}`;
}

function toTitle(slug: string) {
  return slug
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function readProjectMeta(baseDir: string, slug: string): Promise<ProjectMeta | null> {
  const projectMetaPath = path.join(baseDir, slug, "project.json");
  const descMetaPath = path.join(baseDir, slug, "desc.json");

  const rawMeta =
    (await fs.readFile(projectMetaPath, "utf8").catch(() => null)) ??
    (await fs.readFile(descMetaPath, "utf8").catch(() => null));

  if (!rawMeta) {
    return null;
  }

  try {
    return JSON.parse(rawMeta) as ProjectMeta;
  } catch {
    return null;
  }
}

async function detectMediaFiles(baseDir: string, slug: string) {
  const entries = await fs.readdir(path.join(baseDir, slug), { withFileTypes: true }).catch(() => []);
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);

  const cover =
    files.find((name) => {
      const lower = name.toLowerCase();
      return lower.startsWith("cover.") && IMAGE_EXTENSIONS.has(path.extname(lower));
    }) ??
    files.find((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()));

  const video = files.find((name) => VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()));

  return { cover, video };
}

function resolveExistingFile(preferred: string | undefined, files: { cover?: string; video?: string }, kind: "cover" | "video") {
  if (!preferred) {
    return files[kind];
  }

  if (kind === "cover") {
    return preferred === files.cover ? preferred : files.cover;
  }

  return preferred === files.video ? preferred : files.video;
}

export async function readAIProjects(): Promise<AIProject[]> {
  const baseDir = path.join(process.cwd(), "public", "ai_works");
  const entries = await fs.readdir(baseDir, { withFileTypes: true }).catch(() => []);

  const projects: Array<AIProject | null> = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const slug = entry.name;
        const parsed = await readProjectMeta(baseDir, slug);
        const detected = await detectMediaFiles(baseDir, slug);

        // Keep item visible even without json metadata when at least one media file exists.
        if (!parsed && !detected.cover && !detected.video) {
          return null;
        }

        const project: AIProject = {
          slug,
          title: parsed?.title?.trim() || toTitle(slug),
          summary: parsed?.summary ?? "",
          description: parsed?.description ?? "",
          cover: safePublicFileUrl(slug, resolveExistingFile(parsed?.cover, detected, "cover")),
          video: safePublicFileUrl(slug, resolveExistingFile(parsed?.video, detected, "video"))
        };

        return project;
      })
  );

  return projects.filter((project): project is AIProject => project !== null).sort((a, b) => a.title.localeCompare(b.title));
}
