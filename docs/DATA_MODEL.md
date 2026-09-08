# Data Model

Full source of truth: `packages/database/prisma/schema.prisma`.

## Core entity groups

- **Project** — root entity; owns Story, Script, StyleBible (1:1), and
  Characters, Locations, Props, Scenes, Shots, Assets, Prompts, Generations,
  Timelines, Workflows, Conversations (1:many).
- **Story / Script / StyleBible** — one row per project; StyleBible has a
  `locked` boolean that (in Phase 5) propagates its fields into new shots.
- **Character / CharacterReference** — a Character has many reference images
  tagged by angle (FRONT/PROFILE/3-4/FULL_BODY/COSTUME/EXPRESSION). The `tag`
  field (e.g. `Aarohi`) is what `@Aarohi` autocomplete resolves to — always by
  internal ID, never by matching raw text at generation time.
- **Location / Prop** — same tag-based reference pattern as Character.
- **Scene / Shot** — Scene groups Shots. Shot carries the full cinematography
  field set from brief §42 (camera size/angle/movement, lens, DOF, lighting,
  mood, color grade) plus `characterIds`/`locationId`/`propIds` arrays and
  `referenceAssetIds` for continuity chaining.
- **Asset** — every piece of media (image/video/audio/voice/music/sfx/
  reference/mask). Stores a MinIO `storageKey`, not raw bytes. Has
  `approvalStatus` (GENERATED → FAVORITE/SELECTED/APPROVED/ARCHIVED) — only
  APPROVED assets should auto-become primary shot references (§65).
- **Prompt** — structured (Subject/Action/Environment/Camera/...) + optional
  raw text view, per the Prompt Composer (§21).
- **ModelProvider / ModelDefinition** — mirrors `packages/config`'s seed data
  once persisted; `ModelDefinition.capabilities` is a string array validated
  against the shared `Capability` enum at the application layer.
- **Generation** — one row per AI text/prompt/planning call: model used,
  prompt, params, tokens, latency, fallback tracking.
- **GenerationJob** — one row per async media job (image/video/audio/frame
  extraction/export/workflow execution), with `status`, `progress`, and
  result asset IDs.
- **Timeline / TimelineTrack / TimelineClip** — nonlinear editor state.
- **Workflow / WorkflowNode / WorkflowEdge** — no-code builder graphs; the
  full validated JSON also lives in `Workflow.definition` for fast
  execution/versioning, while normalized rows support querying/listing.
- **Conversation / ConversationMessage** — Flow Agent chat history per
  project, including structured `toolCalls` for auditability.

## Design rules followed
- No "whole project as one JSON blob" — every important entity is a real
  table with foreign keys and indexes.
- JSON columns are reserved for genuinely flexible data: prompt structure,
  workflow graphs, generation parameters/metadata.
- Cascading deletes are scoped to project-owned children so deleting a
  project cleans up its graph; asset deletion is a separate, explicit,
  confirmable action in the API layer (never implicit).
