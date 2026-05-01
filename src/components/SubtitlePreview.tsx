"use client";

import { SUBTITLE_FONTS } from "@/lib/ffmpeg-constants";

const FONT_FAMILY_MAP: Record<string, string> = {
  "Noto Sans": "'Noto Sans', sans-serif",
  "Noto Sans CJK JP": "'Noto Sans JP', sans-serif",
  "Noto Sans Arabic": "'Noto Sans Arabic', sans-serif",
  "Roboto": "'Roboto', sans-serif",
  "Montserrat": "'Montserrat', sans-serif",
  "Open Sans": "'Open Sans', sans-serif",
};

export interface SubtitleStyleControls {
  font: string;
  size: number;
  color: string;
  bgColor: string;
  bgOpacity: number;
}

interface SubtitlePreviewProps {
  frameUrl: string | null;
  sampleText: string;
  style: SubtitleStyleControls;
}

function hexToRgba(hex: string, alphaPercent: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alphaPercent / 100})`;
}

export function SubtitlePreview({ frameUrl, sampleText, style }: SubtitlePreviewProps) {
  const fontFamily = FONT_FAMILY_MAP[style.font] || "sans-serif";
  const bg = hexToRgba(style.bgColor, style.bgOpacity);

  return (
    <div className="relative w-full max-w-xs mx-auto bg-gray-900 rounded-lg overflow-hidden border border-gray-200">
      {frameUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frameUrl}
          alt="Video önizleme"
          className="block w-full h-auto"
          loading="lazy"
        />
      ) : (
        <div className="w-full aspect-[9/16] flex items-center justify-center text-gray-500 text-sm">
          Önizleme hazırlanıyor...
        </div>
      )}

      <div className="absolute left-0 right-0 bottom-[8%] flex justify-center px-4 pointer-events-none">
        <span
          style={{
            fontFamily,
            fontSize: `${style.size * 1.4}px`,
            color: style.color,
            backgroundColor: bg,
            padding: "0.2em 0.6em",
            lineHeight: 1.3,
            textAlign: "center",
            maxWidth: "90%",
            wordBreak: "break-word",
          }}
        >
          {sampleText || "Örnek altyazı metni"}
        </span>
      </div>
    </div>
  );
}

export { SUBTITLE_FONTS };
