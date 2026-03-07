import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);
const MAX_ITEMS = 9;

type CarouselImage = {
  src: string;
  alt: string;
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

function shuffle<T>(array: T[]) {
  const next = [...array];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

async function readImagesFromDir(dirPath: string, publicSegments: string[]) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
  const output: CarouselImage[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      continue;
    }

    output.push({
      src: buildPublicPath([...publicSegments, entry.name]),
      alt: toLabel(entry.name)
    });
  }

  return output;
}

async function collectDesignWorksImages() {
  const rootPath = path.join(process.cwd(), "public", "design_works");
  const categories = await fs.readdir(rootPath, { withFileTypes: true }).catch(() => []);
  const images: CarouselImage[] = [];

  for (const category of categories) {
    if (!category.isDirectory()) {
      continue;
    }

    const categoryPath = path.join(rootPath, category.name);
    images.push(...(await readImagesFromDir(categoryPath, ["design_works", category.name])));

    const projects = await fs.readdir(categoryPath, { withFileTypes: true }).catch(() => []);
    for (const project of projects) {
      if (!project.isDirectory()) {
        continue;
      }

      const projectPath = path.join(categoryPath, project.name);
      images.push(...(await readImagesFromDir(projectPath, ["design_works", category.name, project.name])));
    }
  }

  return images;
}

export async function GET() {
  const allImages = await collectDesignWorksImages();
  if (!allImages.length) {
    return NextResponse.json({ images: [] as CarouselImage[] });
  }

  const randomBatch = shuffle(allImages).slice(0, MAX_ITEMS);
  return NextResponse.json({ images: randomBatch });
}
