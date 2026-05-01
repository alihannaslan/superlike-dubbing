export interface Language {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "id", name: "Indonesian", flag: "🇮🇩" },
  { code: "fil", name: "Filipino", flag: "🇵🇭" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "uk", name: "Ukrainian", flag: "🇺🇦" },
  { code: "el", name: "Greek", flag: "🇬🇷" },
  { code: "cs", name: "Czech", flag: "🇨🇿" },
  { code: "fi", name: "Finnish", flag: "🇫🇮" },
  { code: "ro", name: "Romanian", flag: "🇷🇴" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "da", name: "Danish", flag: "🇩🇰" },
  { code: "bg", name: "Bulgarian", flag: "🇧🇬" },
  { code: "ms", name: "Malay", flag: "🇲🇾" },
  { code: "sk", name: "Slovak", flag: "🇸🇰" },
  { code: "hr", name: "Croatian", flag: "🇭🇷" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "ta", name: "Tamil", flag: "🇮🇳" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
];

const FLAG_BY_CODE: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.flag])
);

export function getLanguageFlag(code: string): string {
  return FLAG_BY_CODE[code] || "🏳️";
}
