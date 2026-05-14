"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { LanguageSelect } from "@/components/LanguageSelect";


export default function NewDubbingPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState("tr");
  const [targetLang, setTargetLang] = useState("");
  const [brandTerms, setBrandTerms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file || !sourceLang || !targetLang) {
      setError("Dosya, kaynak dil ve hedef dil seçimi gerekli");
      return;
    }


    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sourceLang", sourceLang);
    formData.append("targetLang", targetLang);
    if (brandTerms.trim()) formData.append("brandTerms", brandTerms.trim());

    try {
      const res = await fetch("/api/dubbing", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Çeviri başlatılamadı");
        setLoading(false);
        return;
      }

      router.push(`/dashboard/jobs/${data.id}`);
    } catch {
      setError("Bağlantı hatası, lütfen tekrar deneyin");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Yeni Çeviri</h1>
      <p className="text-gray-500 text-sm mb-6 sm:mb-8">Video yükle, kaynak ve hedef dil seç</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm text-gray-700 mb-2">Video / Ses Dosyası</label>
          <FileUpload onFileSelect={setFile} selectedFile={file} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Kaynak Dil</label>
            <LanguageSelect value={sourceLang} onChange={setSourceLang} />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-2">Hedef Dil</label>
            <LanguageSelect value={targetLang} onChange={setTargetLang} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Özel isimler <span className="text-gray-400 font-normal">(opsiyonel)</span>
          </label>
          <input
            type="text"
            value={brandTerms}
            onChange={(e) => setBrandTerms(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Videoda geçen özel isimleri virgülle ayırarak yazın. Yanlış yazımları otomatik düzeltilir.
          </p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !file || !sourceLang || !targetLang}
          className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? "Yükleniyor ve çeviri başlatılıyor..." : "Çeviriyi Başlat"}
        </button>
      </form>
    </div>
  );
}
