const API_BASE = "https://api.elevenlabs.io/v1";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

export async function createDubbing(
  file: Buffer,
  fileName: string,
  targetLang: string
): Promise<{ dubbing_id: string; expected_duration_sec: number }> {
  const formData = new FormData();
  const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  formData.append("file", new Blob([arrayBuffer]), fileName);
  formData.append("source_lang", "tr");
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
