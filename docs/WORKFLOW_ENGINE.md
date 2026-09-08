# Workflow Engine (planned — Phase 10)

Versioned JSON schema (brief §40): `{ version, name, nodes, edges, inputs, outputs }`,
validated with Zod in `packages/workflow-engine` before save or execution. Validation
checks: known node types, valid connections, required parameters present, declared
capabilities actually available, no cycles, no unsupported operations.

Flow Agent can propose a workflow from natural language (§39), but the proposal is
always validated against this schema before it is persisted or run — the agent never
executes arbitrary shell commands or unvalidated node graphs.
