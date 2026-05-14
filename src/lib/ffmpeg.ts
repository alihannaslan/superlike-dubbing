import { execFile } from "child_process";
import { writeFile } from "fs/promises";
import path from "path";
import {
  SUBTITLE_FONTS,
  DEFAULT_SUBTITLE_STYLE,
  POSITION_ALIGNMENT,
  type SubtitleStyle,
} from "./ffmpeg-constants";

export { SUBTITLE_FONTS, DEFAULT_SUBTITLE_STYLE };
export type { SubtitleStyle };

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

function hexToAssBgr(hex: string): string {
  const clean = hex.replace("#", "");
  const r = clean.substring(0, 2);
  const g = clean.substring(2, 4);
  const b = clean.substring(4, 6);
  return `${b}${g}${r}`.toUpperCase();
}

function buildAssColor(hex: string, alphaPercent = 100): string {
  const alpha = Math.round((100 - alphaPercent) * 2.55)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `&H${alpha}${hexToAssBgr(hex)}`;
}

export async function extractFrame(
  videoPath: string,
  outputPath: string,
  timeSeconds = 1
): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "ffmpeg",
      [
        "-ss", String(timeSeconds),
        "-i", videoPath,
        "-frames:v", "1",
        "-q:v", "3",
        "-vf", "scale='min(1280,iw)':'-2'",
        "-y",
        outputPath,
      ],
      { maxBuffer: 10 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`FFmpeg frame extract failed: ${stderr || error.message}`));
        } else {
          resolve();
        }
      }
    );
  });
}

interface RenderOptions {
  srtContent?: string;
  style?: SubtitleStyle;
  speed?: number;
}

export async function renderFinal(
  videoPath: string,
  outputPath: string,
  opts: RenderOptions = {}
): Promise<void> {
  const speed = opts.speed && opts.speed > 0 ? opts.speed : 1.0;
  const style = opts.style ?? DEFAULT_SUBTITLE_STYLE;

  const escapeFilterPath = (p: string) =>
    p.replace(/\\/g, "\\\\").replace(/:/g, "\\:");

  const videoFilters: string[] = ["scale=w=1080:h=-2:force_original_aspect_ratio=decrease"];

  if (opts.srtContent) {
    const srtPath = outputPath.replace(/\.[^.]+$/, ".srt");
    await writeFile(srtPath, opts.srtContent, "utf-8");

    const primary = buildAssColor(style.color, 100);
    const back = buildAssColor(style.bgColor, style.bgOpacity);
    const outline = buildAssColor(style.bgColor, style.bgOpacity);
    const alignment = POSITION_ALIGNMENT[style.position] ?? 2;

    const forceStyle = [
      `FontName=${style.font}`,
      `FontSize=${style.size}`,
      `PrimaryColour=${primary}`,
      `OutlineColour=${outline}`,
      `BackColour=${back}`,
      "BorderStyle=3",
      "Outline=2",
      "Shadow=0",
      "MarginV=30",
      `Alignment=${alignment}`,
    ]
      .join(",")
      .replace(/,/g, "\\,");

    videoFilters.push(
      `subtitles=${escapeFilterPath(srtPath)}:fontsdir=${escapeFilterPath(FONTS_DIR)}:force_style=${forceStyle}`
    );
  }

  if (speed !== 1.0) {
    videoFilters.push(`setpts=PTS/${speed}`);
  }

  const args: string[] = ["-i", videoPath, "-vf", videoFilters.join(",")];

  if (speed !== 1.0) {
    args.push("-af", `atempo=${speed}`, "-c:a", "aac", "-b:a", "192k");
  } else {
    args.push("-c:a", "copy");
  }

  args.push(
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "26",
    "-threads", "2",
    "-y",
    outputPath
  );

  return new Promise((resolve, reject) => {
    execFile(
      "ffmpeg",
      args,
      { maxBuffer: 50 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`FFmpeg failed: ${stderr || error.message}`));
        } else {
          resolve();
        }
      }
    );
  });
}

export async function burnSubtitles(
  videoPath: string,
  srtContent: string,
  outputPath: string,
  style: SubtitleStyle = DEFAULT_SUBTITLE_STYLE,
  speed = 1.0
): Promise<void> {
  return renderFinal(videoPath, outputPath, { srtContent, style, speed });
}
