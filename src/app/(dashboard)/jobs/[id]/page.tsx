"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

interface JobDetail {
  id: string;
  originalFileName: string;
  originalFileSize: number;
  targetLang: string;
  targetLangName: string;
  status: string;
  expectedDuration: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface Segment {
  segmentId: string;
  startTime: number;
  endTime: number;
  sourceText: string;
  targetText: string;
  audioStale: boolean;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [editedSegments, setEditedSegments] = useState<Record<string, string>>({});
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [showSegments, setShowSegments] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [redubbing, setRedubbing] = useState(false);

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
    }
    setLoadingSegments(false);
  }, [id]);

  // Poll status while processing
  useEffect(() => {
    fetchJob();

    const interval = setInterval(async () => {
      if (!job || job.status === "COMPLETED" || job.status === "FAILED") return;

      const res = await fetch(`/api/dubbing/${id}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status !== job?.status) {
          fetchJob();
          // Refresh segments when dubbing completes
          if (data.status === "COMPLETED" && showSegments) {
            fetchSegments();
          }
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, job?.status, fetchJob, fetchSegments, showSegments]);

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
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleToggleSegments() {
    if (!showSegments && segments.length === 0) {
      await fetchSegments();
    }
    setShowSegments(!showSegments);
  }

  function handleTextChange(segmentId: string, text: string) {
    setEditedSegments((prev) => ({ ...prev, [segmentId]: text }));
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
      // Update local state
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

  async function handleRedub() {
    const staleIds = segments
      .filter((s) => s.audioStale)
      .map((s) => s.segmentId);

    if (staleIds.length === 0) return;

    setRedubbing(true);
    const res = await fetch(`/api/dubbing/${id}/segments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segmentIds: staleIds }),
    });

    if (res.ok) {
      fetchJob();
    }
    setRedubbing(false);
  }

  const hasStaleSegments = segments.some((s) => s.audioStale);
  const hasUnsavedChanges = Object.keys(editedSegments).length > 0;

  if (loading) {
    return <div className="text-gray-500">Yükleniyor...</div>;
  }

  if (!job) {
    return <div className="text-red-400">Job bulunamadı</div>;
  }

  return (
    <div className="max-w-3xl">
      <Link href="/" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
        &larr; Dashboard
      </Link>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{job.originalFileName}</h1>
            <p className="text-gray-500 text-sm mt-1">{formatSize(job.originalFileSize)}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Kaynak Dil</p>
            <p className="text-gray-200">Türkçe</p>
          </div>
          <div>
            <p className="text-gray-500">Hedef Dil</p>
            <p className="text-gray-200">{job.targetLangName}</p>
          </div>
          <div>
            <p className="text-gray-500">Oluşturulma</p>
            <p className="text-gray-200">{formatDate(job.createdAt)}</p>
          </div>
          {job.completedAt && (
            <div>
              <p className="text-gray-500">Tamamlanma</p>
              <p className="text-gray-200">{formatDate(job.completedAt)}</p>
            </div>
          )}
        </div>

        {job.status === "PROCESSING" && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-blue-300 text-sm font-medium">Çeviri işleniyor...</p>
                {job.expectedDuration && (
                  <p className="text-blue-400/60 text-xs mt-0.5">
                    Tahmini süre: ~{Math.ceil(job.expectedDuration / 60)} dakika
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {job.status === "FAILED" && job.errorMessage && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <p className="text-red-300 text-sm">{job.errorMessage}</p>
          </div>
        )}

        {job.status === "COMPLETED" && (
          <div className="space-y-3">
            <a
              href={`/api/dubbing/${job.id}/download`}
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors text-center"
            >
              Çevrilmiş Videoyu İndir
            </a>
            <button
              onClick={handleToggleSegments}
              className="block w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-lg transition-colors text-center"
            >
              {showSegments ? "Segmentleri Gizle" : "Çeviriyi Düzenle"}
            </button>
          </div>
        )}
      </div>

      {/* Segment Editor */}
      {showSegments && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Çeviri Segmentleri</h2>
            {(hasStaleSegments || hasUnsavedChanges) && (
              <button
                onClick={handleRedub}
                disabled={redubbing || hasUnsavedChanges}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {redubbing
                  ? "Seslendiriliyor..."
                  : hasUnsavedChanges
                  ? "Önce değişiklikleri kaydedin"
                  : `Yeniden Seslendir (${segments.filter((s) => s.audioStale).length} segment)`}
              </button>
            )}
          </div>

          {loadingSegments ? (
            <div className="text-gray-500 text-sm">Segmentler yükleniyor...</div>
          ) : (
            <div className="space-y-3">
              {segments.map((segment) => {
                const isEdited = editedSegments[segment.segmentId] !== undefined;
                const currentText = isEdited
                  ? editedSegments[segment.segmentId]
                  : segment.targetText;
                const isSaving = saving === segment.segmentId;

                return (
                  <div
                    key={segment.segmentId}
                    className={`bg-gray-900 border rounded-xl p-4 space-y-3 ${
                      segment.audioStale
                        ? "border-yellow-700"
                        : "border-gray-800"
                    }`}
                  >
                    {/* Time + stale indicator */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-mono">
                        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </span>
                      {segment.audioStale && (
                        <span className="text-xs text-yellow-400">Yeniden seslendirme gerekli</span>
                      )}
                    </div>

                    {/* Source text (read-only) */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Türkçe (orijinal)</p>
                      <p className="text-sm text-gray-400">{segment.sourceText}</p>
                    </div>

                    {/* Target text (editable) */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        {job.targetLangName} (çeviri)
                      </p>
                      <div className="flex gap-2">
                        <textarea
                          value={currentText}
                          onChange={(e) =>
                            handleTextChange(segment.segmentId, e.target.value)
                          }
                          rows={2}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                        {isEdited && (
                          <button
                            onClick={() => handleSaveSegment(segment.segmentId)}
                            disabled={isSaving}
                            className="self-end bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                          >
                            {isSaving ? "..." : "Kaydet"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
