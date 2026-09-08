"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { getAgentMessages, sendAgentMessage, type AgentMessage } from "@/lib/api-client";

export function FlowAgentPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAgentMessages(projectId)
      .then((data) => setMessages(data.messages))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setInput("");

    // Optimistic append of the user message.
    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, role: "user", content: text, createdAt: new Date().toISOString() },
    ]);

    try {
      const result = await sendAgentMessage(projectId, text);
      setModelUsed(result.model);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticId),
        result.userMessage,
        result.assistantMessage,
      ]);
    } catch (err) {
      setError((err as Error).message);
      // Leave the optimistic user message in place — it was saved server-side even if
      // the assistant call failed (see apps/api agent.routes.ts).
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-glow" strokeWidth={1.75} />
          <span className="text-sm font-medium text-text-primary">Flow Agent</span>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading && <p className="text-xs text-text-muted">Loading conversation…</p>}

        {!loading && messages.length === 0 && (
          <p className="text-xs text-text-muted">
            Ask Flow Agent about this project — e.g. &quot;suggest a shot list for
            Scene 2&quot; or &quot;what characters have I defined so far?&quot;. It can
            read the project but won&apos;t change anything without you approving it
            first (write actions are coming in a later phase).
          </p>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-accent/15 text-text-primary"
                : "bg-panel-raised text-text-secondary"
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
          {error}
        </div>
      )}

      {modelUsed && (
        <p className="px-4 pb-1 text-[10px] text-text-muted">Last reply via {modelUsed}</p>
      )}

      <div className="flex items-center gap-2 border-t border-border-subtle p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask Flow Agent…"
          disabled={sending}
          className="flex-1 rounded-md border border-border bg-canvas px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="rounded-md bg-accent p-2 text-white hover:bg-accent-soft disabled:opacity-40"
        >
          <Send className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
