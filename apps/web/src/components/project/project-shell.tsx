"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ProjectTabs } from "./project-tabs";
import { FlowAgentPanel } from "./flow-agent-panel";
import { JobTray } from "./job-tray";

export function ProjectShell({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const [agentOpen, setAgentOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border">
        <ProjectTabs projectId={projectId} />
        {!agentOpen && (
          <button
            onClick={() => setAgentOpen(true)}
            className="mr-4 flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-accent-soft hover:text-text-primary"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent-glow" strokeWidth={1.75} />
            Flow Agent
          </button>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
        {agentOpen && <FlowAgentPanel projectId={projectId} onClose={() => setAgentOpen(false)} />}
      </div>
      <JobTray projectId={projectId} />
    </div>
  );
}
