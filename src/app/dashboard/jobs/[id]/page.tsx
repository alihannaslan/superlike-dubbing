"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

interface JobDetail {
  id: string;
  originalFileName: string;
  originalFileSize: number;
  sourceLang: string;
  sourceLangName: string;
  targetLang: string;
  targetLangName: string;
  status: string;
  expectedDuration: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface Segment {
  segmentId?: string;
  index?: number;
  startTime: number;
  endTime: number;
  sourceText?: string;
  targetText: string;
  audioStale?: boolean;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [editable, setEditable] = useState(false);
  const [editedSegments, setEditedSegments] = useState<Record<string, string>>({});
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [subtitleEnabled, setSubtitleEnabled] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const fetchJob = useCallback(async () => {
    const res = await fetch(`/api/dubbing/${id}`);
    if (res.ok) {
      const data = await res.json();
      setJob(data);
      setLoading(false);
    }
  }, [id]);

  const fetchSegments = useCallback(async () => {
    setLoadingSegments(true);
    const res = await fetch(`/api/dubbing/${id}/segments`);
    if (res.ok) {
      const data = await res.json();
      setSegments(data.segments);
      setEditable(data.editable);
    }
    setLoadingSegments(false);
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    if (job?.status === "REVIEW" && segments.length === 0) {
      fetchSegments();
    }
  }, [job?.status, segments.length, fetchSegments]);

  useEffect(() => {
    if (!job) return;
    if (["COMPLETED", "FAILED", "REVIEW"].includes(job.status)) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/dubbing/${id}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status !== job.status) {
          fetchJob();
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, job?.status, fetchJob]);

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function getSegmentKey(seg: Segment): string {
    return seg.segmentId || `idx-${seg.index}`;
  }

  function handleTextChange(key: string, text: string) {
    setEditedSegments((prev) => ({ ...prev, [key]: text }));
  }

  async function handleSaveSegment(segmentId: string) {
    const text = editedSegments[segmentId];
    if (text === undefined) return;

    setSaving(segmentId);
    const res = await fetch(`/api/dubbing/${id}/segments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segmentId, text }),
    });

    if (res.ok) {
      setSegments((prev) =>
        prev.map((s) =>
          s.segmentId === segmentId ? { ...s, targetText: text, audioStale: true } : s
        )
      );
      setEditedSegments((prev) => {
        const next = { ...prev };
        delete next[segmentId];
        return next;
      });
    }
    setSaving(null);
  }

  async function handleFinalize() {
    if (hasUnsavedChanges) return;
    setFinalizing(true);

    // If editable and has stale segments, re-dub them first
    const staleIds = segments
      .filter((s) => s.audioStale && s.segmentId)
      .map((s) => s.segmentId!);

    if (editable && staleIds.length > 0) {
      const redubRes = await fetch(`/api/dubbing/${id}/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmentIds: staleIds }),
      });
      if (!redubRes.ok) {
        const data = await redubRes.json();
        alert(data.error || "Yeniden seslendirme başarısız");
        setFinalizing(false);
        return;
      }
    }

    const res = await fetch(`/api/dubbing/${id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtitleEnabled }),
    });

    if (res.ok) {
      fetchJob();
    } else {
      const data = await res.json();
      alert(data.error || "Bir hata oluştu");
    }
    setFinalizing(false);
  }

  const hasUnsavedChanges = Object.keys(editedSegments).length > 0;
  const hasStaleSegments = segments.some((s) => s.audioStale);

  if (loading) return <div className="text-gray-400">Yükleniyor...</div>;
  if (!job) return <div className="text-red-500">Job bulunamadı</div>;

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 text-sm mb-4 inline-block">
        &larr; Dashboard
      </Link>

      {/* Job Info Card */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{job.originalFileName}</h1>
            <p className="text-gray-400 text-sm mt-1">{formatSize(job.originalFileSize)}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Kaynak Dil</p>
            <p className="text-gray-800">{job.sourceLangName || "Türkçe"}</p>
          </div>
          <div>
            <p className="text-gray-400">Hedef Dil</p>
            <p className="text-gray-800">{job.targetLangName}</p>
          </div>
          <div>
            <p className="text-gray-400">Oluşturulma</p>
            <p className="text-gray-800">{formatDate(job.createdAt)}</p>
          </div>
          {job.completedAt && (
            <div>
              <p className="text-gray-400">Tamamlanma</p>
              <p className="text-gray-800">{formatDate(job.completedAt)}</p>
            </div>
          )}
        </div>

        {(job.status === "PROCESSING" || job.status === "UPLOADING") && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-blue-700 text-sm font-medium">Çeviri işleniyor...</p>
                {job.expectedDuration && (
                  <p className="text-blue-500 text-xs mt-0.5">
                    Tahmini süre: ~{Math.ceil(job.expectedDuration / 60)} dakika
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {job.status === "FINALIZING" && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-indigo-700 text-sm font-medium">Video oluşturuluyor...</p>
                <p className="text-indigo-500 text-xs mt-0.5">
                  {hasStaleSegments ? "Düzenlenen segmentler seslendiriliyor ve " : ""}Video hazırlanıyor
                </p>
              </div>
            </div>
          </div>
        )}

        {job.status === "FAILED" && job.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{job.errorMessage}</p>
          </div>
        )}

        {job.status === "COMPLETED" && (
          <a
            href={`/api/dubbing/${job.id}/download`}
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors text-center"
          >
            Çevrilmiş Videoyu İndir
          </a>
        )}
      </div>

      {/* Review Section */}
      {job.status === "REVIEW" && (
        <div className="mt-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Çeviriyi İncele</h2>
            <p className="text-gray-500 text-sm mt-1">
              {editable
                ? "Çevirileri kontrol edin, düzenleyin. Onayladıktan sonra video oluşturulacak."
                : "Çevirileri kontrol edin. Onayladıktan sonra video oluşturulacak."}
            </p>
          </div>

          {loadingSegments ? (
            <div className="text-gray-400 text-sm py-8 text-center">Segmentler yükleniyor...</div>
          ) : (
            <>
              <div className="space-y-3">
                {segments.map((segment) => {
                  const key = getSegmentKey(segment);
                  const isEdited = editedSegments[key] !== undefined;
                  const currentText = isEdited ? editedSegments[key] : segment.targetText;
                  const isSaving = saving === key;

                  return (
                    <div
                      key={key}
                      className={`bg-white border rounded-xl p-4 space-y-3 ${
                        segment.audioStale ? "border-yellow-300" : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-mono">
                          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                        </span>
                        {segment.audioStale && (
                          <span className="text-xs text-yellow-600">Düzenlendi — yeniden seslendirilecek</span>
                        )}
                      </div>

                      {/* Source text (only in editable mode) */}
                      {editable && segment.sourceText && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Türkçe (orijinal)</p>
                          <p className="text-sm text-gray-500">{segment.sourceText}</p>
                        </div>
                      )}

                      {/* Target text */}
                      <div>
                        {editable && (
                          <p className="text-xs text-gray-400 mb-1">{job.targetLangName} (çeviri)</p>
                        )}
                        {editable && segment.segmentId ? (
                          <div className="flex gap-2">
                            <textarea
                              value={currentText}
                              onChange={(e) => handleTextChange(key, e.target.value)}
                              rows={2}
                              className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                            {isEdited && (
                              <button
                                onClick={() => handleSaveSegment(segment.segmentId!)}
                                disabled={isSaving}
                                className="self-end bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                              >
                                {isSaving ? "..." : "Kaydet"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-800">{segment.targetText}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtitle + Approve */}
              <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subtitleEnabled}
                    onChange={(e) => setSubtitleEnabled(e.target.checked)}
                    className="w-5 h-5 rounded bg-white border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <div>
                    <p className="text-sm text-gray-900">Videoya altyazı ekle</p>
                    <p className="text-xs text-gray-400">{job.targetLangName} altyazı videoya gömülecek</p>
                  </div>
                </label>

                <button
                  onClick={handleFinalize}
                  disabled={finalizing || hasUnsavedChanges}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {finalizing
                    ? "Video oluşturuluyor..."
                    : hasUnsavedChanges
                    ? "Önce düzenlemeleri kaydedin"
                    : "Onayla ve Videoyu Oluştur"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
