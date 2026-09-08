import { ProjectShell } from "@/components/project/project-shell";

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return <ProjectShell projectId={params.id}>{children}</ProjectShell>;
}
