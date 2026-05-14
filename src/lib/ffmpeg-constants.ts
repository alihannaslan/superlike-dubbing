export const SUBTITLE_FONTS = [
  { name: "Noto Sans", ffmpegName: "Noto Sans" },
  { name: "Noto Sans CJK", ffmpegName: "Noto Sans CJK JP" },
  { name: "Noto Sans Arabic", ffmpegName: "Noto Sans Arabic" },
  { name: "Roboto", ffmpegName: "Roboto" },
  { name: "Montserrat", ffmpegName: "Montserrat" },
  { name: "Open Sans", ffmpegName: "Open Sans" },
] as const;

export type SubtitlePosition = "top" | "middle" | "bottom";

export const DEFAULT_SUBTITLE_STYLE = {
  font: "Noto Sans CJK JP",
  size: 16,
  color: "#FFFFFF",
  bgColor: "#000000",
  bgOpacity: 100,
  position: "bottom" as SubtitlePosition,
};

export interface SubtitleStyle {
  font: string;
  size: number;
  color: string;
  bgColor: string;
  bgOpacity: number;
  position: SubtitlePosition;
}

// ASS Alignment values follow numpad layout: 7 8 9 / 4 5 6 / 1 2 3
export const POSITION_ALIGNMENT: Record<SubtitlePosition, number> = {
  top: 8,
  middle: 5,
  bottom: 2,
};
