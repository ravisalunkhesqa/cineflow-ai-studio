export interface ProjectSummary {
  id: string;
  name: string;
  tagline: string | null;
  templateKey: string | null;
  aspectRatio: string;
  updatedAt: string;
  _count: { scenes: number; shots: number; assets: number };
}

export interface ProjectDetail extends Omit<ProjectSummary, "_count"> {
  characters: Character[];
  locations: Location[];
  scenes: unknown[];
  styleBible: StyleBible | null;
}

export interface AssetRefSummary {
  id: string;
  downloadUrl: string | null;
  filename: string;
}

export interface CharacterReferenceItem {
  id: string;
  angle: ReferenceAngle;
  asset: AssetRefSummary;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  tag: string;
  aliases: string[];
  ageRange: string | null;
  appearance: string | null;
  faceDescription: string | null;
  hair: string | null;
  eyes: string | null;
  skin: string | null;
  wardrobe: string | null;
  accessories: string | null;
  personality: string | null;
  bodyType: string | null;
  visualStyle: string | null;
  continuityNotes: string | null;
  characterLock: boolean;
  references: CharacterReferenceItem[];
}

export type CharacterInput = Omit<
  Character,
  "id" | "projectId" | "references"
>;

export interface LocationReferenceItem {
  id: string;
  asset: AssetRefSummary;
}

export interface Location {
  id: string;
  projectId: string;
  name: string;
  tag: string;
  description: string | null;
  architecture: string | null;
  interiorExterior: string | null;
  timeOfDay: string | null;
  weather: string | null;
  lighting: string | null;
  palette: string | null;
  continuityNotes: string | null;
  references: LocationReferenceItem[];
}

export type LocationInput = Omit<Location, "id" | "projectId" | "references">;

export interface Shot {
  id: string;
  projectId: string;
  sceneId: string;
  shotNumber: number;
  name: string | null;
  description: string | null;
  duration: number | null;
  cameraShotSize: string | null;
  cameraAngle: string | null;
  cameraMovement: string | null;
  lens: string | null;
  depthOfField: string | null;
  lighting: string | null;
  mood: string | null;
  colorGrade: string | null;
  prompt: string | null;
  negativePrompt: string | null;
  characterIds: string[];
  locationId: string | null;
  propIds: string[];
  referenceAssetIds: string[];
  status: "DRAFT" | "READY" | "GENERATING" | "REVIEW" | "APPROVED" | "LOCKED";
  selectedImageAssetId: string | null;
  selectedVideoAssetId: string | null;
}

export type ShotInput = Partial<
  Omit<Shot, "id" | "projectId" | "selectedImageAssetId" | "selectedVideoAssetId">
> & { sceneId: string; shotNumber: number };

export interface Scene {
  id: string;
  projectId: string;
  sceneNumber: number;
  intExt: string | null;
  locationId: string | null;
  timeOfDay: string | null;
  description: string | null;
  duration: number | null;
  notes: string | null;
  shots: Shot[];
  _count?: { shots: number };
}

export type SceneInput = Partial<Omit<Scene, "id" | "projectId" | "shots" | "_count">> & {
  sceneNumber: number;
};

export interface StyleBible {
  id: string;
  projectId: string;
  visualStyle: string | null;
  colorPalette: string | null;
  lighting: string | null;
  contrast: string | null;
  filmStockLook: string | null;
  cameraFormat: string | null;
  lensStyle: string | null;
  depthOfField: string | null;
  composition: string | null;
  texture: string | null;
  era: string | null;
  productionDesign: string | null;
  wardrobeStyle: string | null;
  skinRendering: string | null;
  motionStyle: string | null;
  negativeConstraints: string[];
  locked: boolean;
}

export type StyleBibleInput = Partial<Omit<StyleBible, "id" | "projectId">>;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const data = await apiFetch<{ projects: ProjectSummary[] }>("/projects");
  return data.projects;
}

export async function createProject(input: {
  name: string;
  templateKey?: string;
  aspectRatio?: string;
}): Promise<ProjectSummary> {
  const data = await apiFetch<{ project: ProjectSummary }>("/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.project;
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const data = await apiFetch<{ project: ProjectDetail }>(`/projects/${id}`);
  return data.project;
}

// ---- Characters ----

export async function listCharacters(projectId: string): Promise<Character[]> {
  const data = await apiFetch<{ characters: Character[] }>(`/projects/${projectId}/characters`);
  return data.characters;
}

export async function createCharacter(
  projectId: string,
  input: Partial<CharacterInput> & { name: string; tag: string },
): Promise<Character> {
  const data = await apiFetch<{ character: Character }>(`/projects/${projectId}/characters`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.character;
}

export async function updateCharacter(
  projectId: string,
  id: string,
  input: Partial<CharacterInput>,
): Promise<Character> {
  const data = await apiFetch<{ character: Character }>(`/projects/${projectId}/characters/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.character;
}

export async function deleteCharacter(projectId: string, id: string): Promise<void> {
  await apiFetch<void>(`/projects/${projectId}/characters/${id}`, { method: "DELETE" });
}

// ---- Locations ----

export async function listLocations(projectId: string): Promise<Location[]> {
  const data = await apiFetch<{ locations: Location[] }>(`/projects/${projectId}/locations`);
  return data.locations;
}

export async function createLocation(
  projectId: string,
  input: Partial<LocationInput> & { name: string; tag: string },
): Promise<Location> {
  const data = await apiFetch<{ location: Location }>(`/projects/${projectId}/locations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.location;
}

export async function updateLocation(
  projectId: string,
  id: string,
  input: Partial<LocationInput>,
): Promise<Location> {
  const data = await apiFetch<{ location: Location }>(`/projects/${projectId}/locations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.location;
}

export async function deleteLocation(projectId: string, id: string): Promise<void> {
  await apiFetch<void>(`/projects/${projectId}/locations/${id}`, { method: "DELETE" });
}

// ---- Style Bible ----

export async function getStyleBible(projectId: string): Promise<StyleBible> {
  const data = await apiFetch<{ styleBible: StyleBible }>(`/projects/${projectId}/style-bible`);
  return data.styleBible;
}

export async function updateStyleBible(
  projectId: string,
  input: StyleBibleInput,
): Promise<StyleBible> {
  const data = await apiFetch<{ styleBible: StyleBible }>(`/projects/${projectId}/style-bible`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.styleBible;
}

// ---- Scenes ----

export async function listScenes(projectId: string): Promise<Scene[]> {
  const data = await apiFetch<{ scenes: Scene[] }>(`/projects/${projectId}/scenes`);
  return data.scenes;
}

export async function createScene(projectId: string, input: SceneInput): Promise<Scene> {
  const data = await apiFetch<{ scene: Scene }>(`/projects/${projectId}/scenes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.scene;
}

export async function updateScene(
  projectId: string,
  id: string,
  input: Partial<SceneInput>,
): Promise<Scene> {
  const data = await apiFetch<{ scene: Scene }>(`/projects/${projectId}/scenes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.scene;
}

export async function deleteScene(projectId: string, id: string): Promise<void> {
  await apiFetch<void>(`/projects/${projectId}/scenes/${id}`, { method: "DELETE" });
}

// ---- Shots ----

export async function listShots(projectId: string, sceneId?: string): Promise<Shot[]> {
  const qs = sceneId ? `?sceneId=${encodeURIComponent(sceneId)}` : "";
  const data = await apiFetch<{ shots: Shot[] }>(`/projects/${projectId}/shots${qs}`);
  return data.shots;
}

export async function createShot(projectId: string, input: ShotInput): Promise<Shot> {
  const data = await apiFetch<{ shot: Shot }>(`/projects/${projectId}/shots`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.shot;
}

export async function updateShot(
  projectId: string,
  id: string,
  input: Partial<ShotInput>,
): Promise<Shot> {
  const data = await apiFetch<{ shot: Shot }>(`/projects/${projectId}/shots/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.shot;
}

export async function deleteShot(projectId: string, id: string): Promise<void> {
  await apiFetch<void>(`/projects/${projectId}/shots/${id}`, { method: "DELETE" });
}

export async function duplicateShot(projectId: string, id: string): Promise<Shot> {
  const data = await apiFetch<{ shot: Shot }>(`/projects/${projectId}/shots/${id}/duplicate`, {
    method: "POST",
  });
  return data.shot;
}

export async function reorderShots(
  projectId: string,
  sceneId: string,
  shotIds: string[],
): Promise<Shot[]> {
  const data = await apiFetch<{ shots: Shot[] }>(`/projects/${projectId}/shots/reorder`, {
    method: "POST",
    body: JSON.stringify({ sceneId, shotIds }),
  });
  return data.shots;
}

// ---- Models / AI Provider settings ----

export interface ModelInfo {
  id: string;
  providerKey: string;
  modelId: string;
  displayName: string;
  capabilities: string[];
  enabled: boolean;
  isDefaultFor: string[];
  notes?: string;
  configured: boolean;
}

export interface ProviderInfo {
  key: string;
  displayName: string;
  baseUrl: string;
  enabled: boolean;
  configured: boolean;
}

export async function listModels(): Promise<{ providers: ProviderInfo[]; models: ModelInfo[] }> {
  return apiFetch<{ providers: ProviderInfo[]; models: ModelInfo[] }>("/models");
}

export interface ConnectionTestResult {
  providerKey: string;
  status: "CONNECTED" | "AUTH_ERROR" | "RATE_LIMITED" | "MODEL_UNAVAILABLE" | "NETWORK_ERROR" | "NOT_CONFIGURED";
  sample?: string;
  detail?: string;
}

export async function testConnection(providerKey?: string): Promise<ConnectionTestResult[]> {
  const data = await apiFetch<{ results: ConnectionTestResult[] }>("/models/test-connection", {
    method: "POST",
    body: JSON.stringify({ providerKey }),
  });
  return data.results;
}

// ---- Flow Agent ----

export interface AgentMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export async function getAgentMessages(
  projectId: string,
): Promise<{ conversationId: string; messages: AgentMessage[] }> {
  return apiFetch(`/projects/${projectId}/agent/messages`);
}

export async function sendAgentMessage(
  projectId: string,
  message: string,
): Promise<{ conversationId: string; userMessage: AgentMessage; assistantMessage: AgentMessage; model: string }> {
  return apiFetch(`/projects/${projectId}/agent/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// ---- Prompt Composer ----

export interface StructuredPrompt {
  subject?: string;
  action?: string;
  environment?: string;
  composition?: string;
  camera?: string;
  lens?: string;
  cameraMovement?: string;
  lighting?: string;
  color?: string;
  atmosphere?: string;
  style?: string;
  continuity?: string;
  audio?: string;
  negativePrompt?: string;
}

export async function composePrompt(
  projectId: string,
  shotId: string,
  structured: StructuredPrompt,
): Promise<{ structured: StructuredPrompt; rawPrompt: string }> {
  return apiFetch(`/projects/${projectId}/shots/${shotId}/prompt/compose`, {
    method: "POST",
    body: JSON.stringify(structured),
  });
}

export async function enhancePrompt(
  projectId: string,
  shotId: string,
  idea: string,
): Promise<{ structured: StructuredPrompt; rawPrompt: string; model: string; promptRecordId: string }> {
  return apiFetch(`/projects/${projectId}/shots/${shotId}/prompt/enhance`, {
    method: "POST",
    body: JSON.stringify({ idea }),
  });
}

// ---- Assets / Uploads ----

export type AssetType = "IMAGE" | "VIDEO" | "AUDIO" | "VOICE" | "MUSIC" | "SFX" | "REFERENCE" | "MASK";
export type AssetApprovalStatus = "GENERATED" | "FAVORITE" | "SELECTED" | "APPROVED" | "ARCHIVED";

export interface Asset {
  id: string;
  projectId: string;
  filename: string;
  type: AssetType;
  storageKey: string;
  downloadUrl: string | null;
  source: string | null;
  prompt: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  tags: string[];
  approvalStatus: AssetApprovalStatus;
  parentAssetId: string | null;
  createdAt: string;
}

export async function requestUploadUrl(
  projectId: string,
  input: { filename: string; type: AssetType; contentType: string },
): Promise<{ uploadUrl: string; storageKey: string }> {
  return apiFetch(`/projects/${projectId}/assets/upload-url`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function confirmAssetUpload(
  projectId: string,
  input: {
    storageKey: string;
    filename: string;
    type: AssetType;
    width?: number;
    height?: number;
    source?: string;
  },
): Promise<Asset> {
  const data = await apiFetch<{ asset: Asset }>(`/projects/${projectId}/assets`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.asset;
}

/** Uploads a File directly to MinIO via a presigned URL, then confirms the Asset row. */
export async function uploadFile(
  projectId: string,
  file: File,
  type: AssetType,
): Promise<Asset> {
  const { uploadUrl, storageKey } = await requestUploadUrl(projectId, {
    filename: file.name,
    type,
    contentType: file.type,
  });

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) {
    throw new Error(`Upload to storage failed (${putRes.status}).`);
  }

  let dimensions: { width?: number; height?: number } = {};
  if (type === "IMAGE" || type === "REFERENCE" || type === "MASK") {
    dimensions = await readImageDimensions(file).catch(() => ({}));
  }

  return confirmAssetUpload(projectId, {
    storageKey,
    filename: file.name,
    type,
    ...dimensions,
    source: "upload",
  });
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    img.src = url;
  });
}

export async function listAssets(
  projectId: string,
  filters?: { type?: AssetType; favorite?: boolean },
): Promise<Asset[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.favorite) params.set("favorite", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  const data = await apiFetch<{ assets: Asset[] }>(`/projects/${projectId}/assets${qs}`);
  return data.assets;
}

export async function updateAsset(
  projectId: string,
  id: string,
  input: Partial<Pick<Asset, "filename" | "tags" | "approvalStatus">>,
): Promise<Asset> {
  const data = await apiFetch<{ asset: Asset }>(`/projects/${projectId}/assets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.asset;
}

export async function deleteAsset(projectId: string, id: string): Promise<void> {
  await apiFetch<void>(`/projects/${projectId}/assets/${id}`, { method: "DELETE" });
}

// ---- Character / Location references ----

export type ReferenceAngle = "FRONT" | "PROFILE" | "THREE_QUARTER" | "FULL_BODY" | "COSTUME" | "EXPRESSION";

export async function addCharacterReference(
  projectId: string,
  characterId: string,
  assetId: string,
  angle: ReferenceAngle,
): Promise<void> {
  await apiFetch(`/projects/${projectId}/characters/${characterId}/references`, {
    method: "POST",
    body: JSON.stringify({ assetId, angle }),
  });
}

export async function deleteCharacterReference(
  projectId: string,
  characterId: string,
  refId: string,
): Promise<void> {
  await apiFetch(`/projects/${projectId}/characters/${characterId}/references/${refId}`, {
    method: "DELETE",
  });
}

export async function addLocationReference(
  projectId: string,
  locationId: string,
  assetId: string,
): Promise<void> {
  await apiFetch(`/projects/${projectId}/locations/${locationId}/references`, {
    method: "POST",
    body: JSON.stringify({ assetId }),
  });
}

export async function deleteLocationReference(
  projectId: string,
  locationId: string,
  refId: string,
): Promise<void> {
  await apiFetch(`/projects/${projectId}/locations/${locationId}/references/${refId}`, {
    method: "DELETE",
  });
}
