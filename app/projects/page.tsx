import { redirect } from "next/navigation";

type ProjectsIndexPageProps = {
  searchParams?: {
    from?: string;
  };
};

export default function ProjectsIndexPage({ searchParams }: ProjectsIndexPageProps) {
  const from = searchParams?.from;
  const suffix = from ? `?from=${encodeURIComponent(from)}` : "";
  redirect(`/projects/design${suffix}`);
}
