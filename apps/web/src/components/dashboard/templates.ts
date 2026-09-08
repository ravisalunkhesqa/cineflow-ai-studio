export const PROJECT_TEMPLATES = [
  { key: "film", name: "Film", aspectRatio: "2.39:1", blurb: "Full narrative feature or short film structure." },
  { key: "micro_drama", name: "Micro Drama", aspectRatio: "9:16", blurb: "30–90 sec emotional vertical drama." },
  { key: "youtube_short", name: "YouTube Short", aspectRatio: "9:16", blurb: "Fast-paced short-form storytelling." },
  { key: "advertisement", name: "Advertisement", aspectRatio: "16:9", blurb: "Brand/product commercial structure." },
  { key: "music_video", name: "Music Video", aspectRatio: "16:9", blurb: "Beat-synced visual sequences." },
  { key: "product_commercial", name: "Product Commercial", aspectRatio: "1:1", blurb: "Luxury product showcase." },
  { key: "instagram_reel", name: "Instagram Reel", aspectRatio: "9:16", blurb: "Social-first vertical content." },
  { key: "cinematic_trailer", name: "Cinematic Trailer", aspectRatio: "2.39:1", blurb: "High-impact trailer pacing." },
  { key: "custom", name: "Custom", aspectRatio: "16:9", blurb: "Start from a blank project." },
] as const;

export type ProjectTemplateKey = (typeof PROJECT_TEMPLATES)[number]["key"];
