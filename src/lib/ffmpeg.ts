import { execFile } from "child_process";
import { writeFile } from "fs/promises";
import path from "path";

export async function burnSubtitles(
  videoPath: string,
  srtContent: string,
  outputPath: string
): Promise<void> {
  // Write SRT to temp file next to output
  const srtPath = outputPath.replace(/\.[^.]+$/, ".srt");
  await writeFile(srtPath, srtContent, "utf-8");

  return new Promise((resolve, reject) => {
    execFile(
      "ffmpeg",
      [
        "-i", videoPath,
        "-vf", `scale='min(1080,iw)':'-2',subtitles=${srtPath}:force_style='FontSize=18,FontName=Noto Sans CJK JP,PrimaryColour=&Hffffff,OutlineColour=&H000000,BorderStyle=3,Outline=1,Shadow=1,MarginV=30,Alignment=2'`,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "26",
        "-c:a", "copy",
        "-threads", "2",
        "-y",
        outputPath,
      ],
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
