import Image from "next/image";
import Link from "next/link";
import { readAIProjects } from "@/lib/aiProjects";
import { minecardLCD } from "@/lib/fonts";

type AIProjectsPageProps = {
  searchParams?: { from?: string };
};

export default async function AIProjectsPage({ searchParams }: AIProjectsPageProps) {
  const fromSection = searchParams?.from ?? "ai";
  const homeHref = `/?section=${encodeURIComponent(fromSection)}`;
  const projects = await readAIProjects();

  return (
    <main className="min-h-[100svh] bg-black px-4 pb-8 pt-16 sm:px-6 sm:pt-20">
      <section className="mx-auto w-full max-w-6xl">
        <div className="sticky top-4 z-20 mb-6 flex items-center gap-2">
          <Link
            href={homeHref}
            className="rounded-full border border-white/25 bg-black/70 px-4 py-2 text-sm tracking-wide text-white transition hover:border-white/40 hover:bg-white/10"
          >
            Home
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.slug}
                href={`/projects/ai/${project.slug}?from=${encodeURIComponent(fromSection)}`}
                className="rounded-2xl border border-white/20 bg-white/10 p-4 text-left text-white shadow-[0_14px_35px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition hover:border-white/35 hover:bg-white/15"
              >
                <p className="text-sm font-semibold tracking-wide">{project.title}</p>
                <div className="mt-3 overflow-hidden rounded-xl border border-white/20 bg-black/30">
                  {project.video ? (
                    <video
                      src={project.video}
                      className="aspect-video w-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : project.cover ? (
                    <div className="relative aspect-video">
                      <Image src={project.cover} alt={`${project.title} cover`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center text-center text-xs text-white/70">Preview unavailable</div>
                  )}
                </div>
                <p className="mt-3 text-sm text-white/75">{project.summary || "Add summary in project.json"}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
