import Image from "next/image";
import Link from "next/link";
import { DESIGN_CATEGORIES } from "@/lib/designProjects";

type DesignProjectsPageProps = {
  searchParams?: {
    from?: string;
  };
};

export default function DesignProjectsPage({ searchParams }: DesignProjectsPageProps) {
  const fromSection = searchParams?.from ?? "design";
  const homeHref = `/?section=${encodeURIComponent(fromSection)}`;

  return (
    <main className="relative h-[100svh] overflow-hidden bg-black px-4 pb-6 pt-16 sm:px-6 sm:pt-20">
      <Link
        href={homeHref}
        className="absolute left-4 top-4 z-20 rounded-full border border-white/25 bg-black/70 px-4 py-2 text-sm tracking-wide text-white transition hover:border-white/40 hover:bg-white/10 sm:left-6 sm:top-6"
      >
        Home
      </Link>

      <section className="mx-auto flex h-full w-full max-w-7xl items-center">
        <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {DESIGN_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/projects/design/${category.slug}?from=${encodeURIComponent(fromSection)}`}
              aria-label={category.slug}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl transition-transform duration-200 hover:scale-[1.02]"
            >
              <Image src={category.previewImage} alt={category.alt} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-contain" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
