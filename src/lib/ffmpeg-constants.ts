export const SUBTITLE_FONTS = [
  { name: "Noto Sans", ffmpegName: "Noto Sans" },
  { name: "Noto Sans CJK", ffmpegName: "Noto Sans CJK JP" },
  { name: "Noto Sans Arabic", ffmpegName: "Noto Sans Arabic" },
  { name: "Roboto", ffmpegName: "Roboto" },
  { name: "Montserrat", ffmpegName: "Montserrat" },
  { name: "Open Sans", ffmpegName: "Open Sans" },
] as const;

export const DEFAULT_SUBTITLE_STYLE = {
  font: "Noto Sans CJK JP",
  size: 16,
  color: "#FFFFFF",
  bgColor: "#000000",
  bgOpacity: 100,
};

export interface SubtitleStyle {
  font: string;
  size: number;
  color: string;
  bgColor: string;
  bgOpacity: number;
}
