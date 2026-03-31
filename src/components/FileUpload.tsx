"use client";

import { useCallback, useState } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".mp3", ".wav"];
const MAX_SIZE = 500 * 1024 * 1024;

export function FileUpload({ onFileSelect, selectedFile }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");

  const validateFile = useCallback((file: File): boolean => {
    setError("");
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError("Sadece MP4, MOV, MP3, WAV dosyaları kabul edilir");
      return false;
    }
    if (file.size > MAX_SIZE) {
      setError("Dosya boyutu 500MB'ı aşamaz");
      return false;
    }
    return true;
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) onFileSelect(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) onFileSelect(file);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : selectedFile
            ? "border-green-500 bg-green-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".mp4,.mov,.mp3,.wav"
          onChange={handleChange}
          className="hidden"
        />

        {selectedFile ? (
          <div>
            <p className="text-green-600 font-medium">{selectedFile.name}</p>
            <p className="text-gray-400 text-sm mt-1">{formatSize(selectedFile.size)}</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600">Dosyayı sürükle veya tıkla</p>
            <p className="text-gray-400 text-sm mt-1">MP4, MOV, MP3, WAV — Max 500MB</p>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
