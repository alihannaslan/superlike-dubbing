import { SUPPORTED_LANGUAGES } from "@/lib/languages";

interface LanguageSelectProps {
  value: string;
  onChange: (code: string) => void;
}

export function LanguageSelect({ value, onChange }: LanguageSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">Dil seçin</option>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  );
}
