export const SHOT_SIZES = ["ECU", "CU", "MCU", "MS", "MLS", "WS", "EWS"];

export const CAMERA_ANGLES = [
  "Eye level",
  "Low",
  "High",
  "Top-down",
  "Dutch",
  "Over shoulder",
  "POV",
];

export const CAMERA_MOVEMENTS = [
  "Static",
  "Pan Left",
  "Pan Right",
  "Tilt Up",
  "Tilt Down",
  "Dolly In",
  "Dolly Out",
  "Tracking",
  "Crane",
  "Arc",
  "Orbit",
  "Handheld",
  "Steadicam",
  "Drone",
];

export const LENSES = ["14mm", "18mm", "24mm", "28mm", "35mm", "50mm", "85mm", "100mm", "135mm", "Custom"];

export const DEPTH_OF_FIELD_OPTIONS = ["Deep", "Medium", "Shallow", "Very Shallow"];

export const SHOT_STATUSES = ["DRAFT", "READY", "GENERATING", "REVIEW", "APPROVED", "LOCKED"] as const;
