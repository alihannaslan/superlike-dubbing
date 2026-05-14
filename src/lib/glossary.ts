interface SRTEntry {
  start: number;
  end: number;
  text: string;
}

export function parseBrandTerms(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function parseSRT(srt: string): SRTEntry[] {
  const entries: SRTEntry[] = [];
  const blocks = srt.trim().split(/\r?\n\r?\n+/);

  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length < 3) continue;

    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!timeMatch) continue;

    const start =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;

    const end =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;

    const text = lines.slice(2).join(" ").trim();
    entries.push({ start, end, text });
  }

  return entries;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Replaces words within `text` that match (or near-match) any brand term.
// Catches: exact, case-variants, fuzzy (typos), and suffixed forms
// like "Dermatenin" (Turkish possessive of mistranscribed "Dermaten").
export function applyGlossary(text: string, brands: string[]): string {
  if (!brands.length || !text) return text;

  return text.replace(/[A-Za-zÇĞİıÖŞÜçğöşü]+/g, (token) => {
    const lower = token.toLowerCase();
    for (const brand of brands) {
      const bLower = brand.toLowerCase();

      if (lower === bLower) return brand;

      const fullDist = levenshtein(lower, bLower);
      const fullThreshold = brand.length >= 8 ? 2 : 1;
      if (fullDist > 0 && fullDist <= fullThreshold) return brand;

      // Match brand as a prefix of a longer token (e.g. "Dermatenin" → "Dermoten")
      // Take the leading slice equal to brand length and compare.
      if (token.length > brand.length && token.length <= brand.length + 4) {
        const prefix = lower.slice(0, brand.length);
        const prefixDist = levenshtein(prefix, bLower);
        if (prefixDist <= fullThreshold) return brand;
      }
    }
    return token;
  });
}

function csvCell(s: string): string {
  if (/[,"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Build CSV with columns: speaker, start_time, end_time, transcription, translation
// Times in seconds (decimal).
export function buildDubbingCsv(
  source: SRTEntry[],
  target: SRTEntry[],
  brands: string[]
): { csv: string; replacements: number } {
  const rows: string[] = ["speaker,start_time,end_time,transcription,translation"];
  let replacements = 0;

  const len = Math.min(source.length, target.length);
  for (let i = 0; i < len; i++) {
    const s = source[i];
    const t = target[i];
    const fixedSrc = applyGlossary(s.text, brands);
    const fixedTgt = applyGlossary(t.text, brands);
    if (fixedSrc !== s.text) replacements++;
    if (fixedTgt !== t.text) replacements++;

    rows.push(
      [
        "speaker_1",
        s.start.toFixed(3),
        s.end.toFixed(3),
        csvCell(fixedSrc),
        csvCell(fixedTgt),
      ].join(",")
    );
  }

  return { csv: rows.join("\n"), replacements };
}
