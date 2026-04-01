const API_BASE = "https://api.elevenlabs.io/v1";

export interface DubbingSegment {
  segment_id: string;
  start_time: number;
  end_time: number;
  text: string;
  dubs: Record<string, { text: string; audio_stale: boolean }>;
}

export interface DubbingResource {
  id: string;
  version: number;
  source_language: string;
  target_languages: string[];
  speaker_segments: Record<string, DubbingSegment>;
}

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
  };
  return mimeMap[ext || ""] || "application/octet-stream";
}

export async function createDubbing(
  file: Buffer,
  fileName: string,
  sourceLang: string,
  targetLang: string
): Promise<{ dubbing_id: string; expected_duration_sec: number }> {
  const formData = new FormData();
  const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  formData.append("file", new Blob([arrayBuffer], { type: getMimeType(fileName) }), fileName);
  formData.append("source_lang", sourceLang);
  formData.append("target_lang", targetLang);
  formData.append("num_speakers", "0");
  formData.append("watermark", "false");

  const res = await fetch(`${API_BASE}/dubbing`, {
    method: "POST",
    headers: { "xi-api-key": getApiKey() },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs dubbing failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function getDubbingStatus(dubbingId: string): Promise<{
  dubbing_id: string;
  name: string;
  status: string;
  target_languages: string[];
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/dubbing/${dubbingId}`, {
    headers: { "xi-api-key": getApiKey() },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs status check failed: ${res.status} ${error}`);
  }

  return res.json();
}

// Get dubbing resource with all segments
export async function getDubbingResource(dubbingId: string): Promise<DubbingResource> {
  const res = await fetch(`${API_BASE}/dubbing/resource/${dubbingId}`, {
    headers: { "xi-api-key": getApiKey() },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs get resource failed: ${res.status} ${error}`);
  }

  return res.json();
}

// Update a segment's text or timing
export async function updateSegment(
  dubbingId: string,
  segmentId: string,
  language: string,
  updates: { text?: string; start_time?: number; end_time?: number }
): Promise<{ version: number }> {
  const res = await fetch(
    `${API_BASE}/dubbing/resource/${dubbingId}/segment/${segmentId}/${language}`,
    {
      method: "PATCH",
      headers: {
        "xi-api-key": getApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs update segment failed: ${res.status} ${error}`);
  }

  return res.json();
}

// Re-dub specific segments after editing
export async function dubSegments(
  dubbingId: string,
  segmentIds: string[],
  languages?: string[]
): Promise<{ version: number }> {
  const body: { segments: string[]; languages?: string[] } = { segments: segmentIds };
  if (languages) body.languages = languages;

  const res = await fetch(`${API_BASE}/dubbing/resource/${dubbingId}/dub`, {
    method: "POST",
    headers: {
      "xi-api-key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs dub segments failed: ${res.status} ${error}`);
  }

  return res.json();
}

// Get SRT subtitle for a language
export async function getTranscriptSRT(
  dubbingId: string,
  languageCode: string
): Promise<string> {
  const res = await fetch(
    `${API_BASE}/dubbing/${dubbingId}/transcript/${languageCode}?format_type=srt`,
    {
      headers: { "xi-api-key": getApiKey() },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs transcript failed: ${res.status} ${error}`);
  }

  return res.text();
}

export async function getDubbedAudio(
  dubbingId: string,
  languageCode: string
): Promise<Buffer> {
  const res = await fetch(
    `${API_BASE}/dubbing/${dubbingId}/audio/${languageCode}`,
    {
      headers: { "xi-api-key": getApiKey() },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs download failed: ${res.status} ${error}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
