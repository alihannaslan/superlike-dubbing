const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Bekliyor", className: "bg-gray-700 text-gray-300" },
  UPLOADING: { label: "Yükleniyor", className: "bg-yellow-900 text-yellow-300" },
  PROCESSING: { label: "İşleniyor", className: "bg-blue-900 text-blue-300" },
  COMPLETED: { label: "Tamamlandı", className: "bg-green-900 text-green-300" },
  FAILED: { label: "Başarısız", className: "bg-red-900 text-red-300" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || STATUS_MAP.PENDING;
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
