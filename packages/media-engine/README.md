# @cineflow/media-engine (planned — Phase 9)

Will wrap FFmpeg/ffprobe for frame extraction, thumbnailing, timeline render,
and export presets (brief §26, §37, §51, §80). FFmpeg args are always built by
trusted backend code here — never concatenated from raw AI/user strings (§54).
