import type { StructuredPrompt } from "@/lib/api-client";

export const PROMPT_TEMPLATES: { name: string; preset: Partial<StructuredPrompt> }[] = [
  {
    name: "Cinematic Realism",
    preset: { style: "hyper-realistic, 35mm cinematic", color: "natural, filmic contrast", atmosphere: "grounded, understated" },
  },
  {
    name: "Luxury Commercial",
    preset: { style: "modern luxury editorial", color: "warm ivory and gold tones", lighting: "soft key light, glossy highlights" },
  },
  {
    name: "Neo Noir",
    preset: { style: "low-key neo-noir", color: "deep shadows, cool blue accents", lighting: "hard directional light, venetian blind shadows" },
  },
  {
    name: "Documentary",
    preset: { style: "observational documentary", camera: "handheld, slightly imperfect framing", color: "muted, naturalistic" },
  },
  {
    name: "Indian Drama",
    preset: { style: "Indian contemporary realism", color: "warm tungsten interiors", atmosphere: "intimate, emotionally grounded" },
  },
];
