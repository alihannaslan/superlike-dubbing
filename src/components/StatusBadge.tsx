const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Bekliyor", className: "bg-gray-100 text-gray-600" },
  UPLOADING: { label: "Yükleniyor", className: "bg-yellow-100 text-yellow-700" },
  PROCESSING: { label: "İşleniyor", className: "bg-blue-100 text-blue-700" },
  REVIEW: { label: "Çeviri Onayı", className: "bg-purple-100 text-purple-700" },
  DUBBING: { label: "Dublajlanıyor", className: "bg-blue-100 text-blue-700" },
  SUBTITLE_REVIEW: { label: "Altyazı Bekliyor", className: "bg-purple-100 text-purple-700" },
  FINALIZING: { label: "Oluşturuluyor", className: "bg-indigo-100 text-indigo-700" },
  READY: { label: "Hazır", className: "bg-teal-100 text-teal-700" },
  COMPLETED: { label: "Tamamlandı", className: "bg-green-100 text-green-700" },
  FAILED: { label: "Başarısız", className: "bg-red-100 text-red-700" },
};

interface StatusBadgeProps {
  status: string;
  downloadedAt?: string | Date | null;
}

export function StatusBadge({ status, downloadedAt }: StatusBadgeProps) {
  const effective = status === "COMPLETED" && !downloadedAt ? "READY" : status;
  const config = STATUS_MAP[effective] || STATUS_MAP.PENDING;
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
