"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { LanguageSelect } from "@/components/LanguageSelect";

export default function NewDubbingPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file || !targetLang) {
      setError("Dosya ve hedef dil seçimi gerekli");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetLang", targetLang);

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
      <h1 className="text-2xl font-bold mb-1">Yeni Çeviri</h1>
      <p className="text-gray-500 text-sm mb-8">Video yükle ve hedef dil seç</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm text-gray-700 mb-2">Video / Ses Dosyası</label>
          <FileUpload onFileSelect={setFile} selectedFile={file} />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Hedef Dil</label>
          <LanguageSelect value={targetLang} onChange={setTargetLang} />
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">
            Kaynak dil: <span className="text-gray-700">Türkçe</span> (sabit)
          </p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !file || !targetLang}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Yükleniyor ve çeviri başlatılıyor..." : "Çeviriyi Başlat"}
        </button>
      </form>
    </div>
  );
}
