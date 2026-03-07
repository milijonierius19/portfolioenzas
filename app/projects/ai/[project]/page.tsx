import Link from "next/link";
import { notFound } from "next/navigation";
import { readAIProjects } from "@/lib/aiProjects";

type AIProjectPageProps = {
  params: { project: string };
  searchParams?: { from?: string };
};

export default async function AIProjectPage({ params, searchParams }: AIProjectPageProps) {
  const projects = await readAIProjects();
  const project = projects.find((entry) => entry.slug === params.project);
  if (!project) {
    notFound();
  }

  const fromSection = searchParams?.from ?? "ai";
  const homeHref = `/?section=${encodeURIComponent(fromSection)}`;
  const backHref = `/projects/ai?from=${encodeURIComponent(fromSection)}`;

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
          <Link
            href={backHref}
            className="rounded-full border border-white/25 bg-black/70 px-4 py-2 text-sm tracking-wide text-white transition hover:border-white/40 hover:bg-white/10"
          >
            Back
          </Link>
        </div>

        <article className="rounded-3xl border border-white/25 bg-white/[0.06] p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
          <h1 className="text-2xl font-semibold sm:text-3xl">{project.title}</h1>
          <p className="mt-3 text-sm text-white/75 sm:text-base">{project.summary || "Add summary in project.json"}</p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/20 bg-black/35">
            {project.video ? (
              <video
                src={project.video}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="aspect-video w-full bg-black object-cover"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center text-sm text-white/70">Workflow video placeholder</div>
            )}
          </div>

          <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-white/85">
            {project.description || "Add full project description in project.json"}
          </p>
        </article>
      </section>
    </main>
  );
}
