"use client";

import { useMemo, useRef, useState } from "react";

export interface MentionTag {
  tag: string;
  label: string;
}

export function MentionTextarea({
  value,
  onChange,
  onBlurCommit,
  tags,
  rows = 3,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlurCommit?: (v: string) => void;
  tags: MentionTag[];
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);

  const suggestions = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return tags.filter((t) => t.tag.toLowerCase().startsWith(q)).slice(0, 6);
  }, [query, tags]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    const caret = e.target.selectionStart;
    onChange(text);

    const upToCaret = text.slice(0, caret);
    const match = upToCaret.match(/@([A-Za-z0-9_]*)$/);
    if (match) {
      setQuery(match[1]);
      setMentionStart(caret - match[1].length - 1);
    } else {
      setQuery(null);
      setMentionStart(null);
    }
  }

  function applyMention(tag: string) {
    if (mentionStart === null || !ref.current) return;
    const caret = ref.current.selectionStart;
    const before = value.slice(0, mentionStart);
    const after = value.slice(caret);
    const next = `${before}@${tag} ${after}`;
    onChange(next);
    setQuery(null);
    setMentionStart(null);
    requestAnimationFrame(() => ref.current?.focus());
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onBlur={(e) => onBlurCommit?.(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={
          className ??
          "w-full resize-none rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
        }
      />
      {suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-md border border-border bg-panel-raised shadow-glow">
          {suggestions.map((s) => (
            <button
              key={s.tag}
              onMouseDown={(e) => {
                e.preventDefault();
                applyMention(s.tag);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary hover:bg-panel hover:text-text-primary"
            >
              <span className="text-accent-glow">@{s.tag}</span>
              <span className="text-text-muted">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
