import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ComingSoon({ title, phase, note }: { title: string; phase: string; note?: string }) {
  return (
    <div className="mx-auto max-w-lg px-8 py-24 text-center">
      <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Not implemented yet — planned for {phase}.
      </p>
      {note && <p className="mt-2 text-xs text-text-muted">{note}</p>}
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent-glow hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Back to Dashboard
      </Link>
    </div>
  );
}
