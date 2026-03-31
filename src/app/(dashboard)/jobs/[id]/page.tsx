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
  index: number;
  startTime: number;
  endTime: number;
  sourceText: string;
  targetText: string;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
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
    }
    setLoadingSegments(false);
  }, [id]);

  // Initial load
  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Auto-fetch segments when status becomes REVIEW
  useEffect(() => {
    if (job?.status === "REVIEW" && segments.length === 0) {
      fetchSegments();
    }
  }, [job?.status, segments.length, fetchSegments]);

  // Poll status while processing or finalizing
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
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleFinalize() {
    setFinalizing(true);

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
      setFinalizing(false);
    }
  }

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

      {/* Job Info Card */}
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

        {/* Processing spinner */}
        {(job.status === "PROCESSING" || job.status === "UPLOADING") && (
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

        {/* Finalizing spinner */}
        {job.status === "FINALIZING" && (
          <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-indigo-300 text-sm font-medium">Video oluşturuluyor...</p>
                <p className="text-indigo-400/60 text-xs mt-0.5">
                  Video indiriliyor{subtitleEnabled ? " ve altyazı ekleniyor" : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {job.status === "FAILED" && job.errorMessage && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <p className="text-red-300 text-sm">{job.errorMessage}</p>
          </div>
        )}

        {/* Download — only when COMPLETED */}
        {job.status === "COMPLETED" && (
          <a
            href={`/api/dubbing/${job.id}/download`}
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors text-center"
          >
            Çevrilmiş Videoyu İndir
          </a>
        )}
      </div>

      {/* Review Section — shown in REVIEW state */}
      {job.status === "REVIEW" && (
        <div className="mt-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Çeviriyi İncele</h2>
            <p className="text-gray-400 text-sm mt-1">
              Çevirileri kontrol edin. Onayladıktan sonra video oluşturulacak.
            </p>
          </div>

          {loadingSegments ? (
            <div className="text-gray-500 text-sm py-8 text-center">Segmentler yükleniyor...</div>
          ) : (
            <>
              {/* Segments */}
              <div className="space-y-3">
                {segments.map((segment) => (
                  <div
                    key={segment.index}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3"
                  >
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                    </span>

                    {/* Source text */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Türkçe</p>
                      <p className="text-sm text-gray-400">{segment.sourceText}</p>
                    </div>

                    {/* Target text */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{job.targetLangName}</p>
                      <p className="text-sm text-white">{segment.targetText}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtitle checkbox + Approve button */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subtitleEnabled}
                    onChange={(e) => setSubtitleEnabled(e.target.checked)}
                    className="w-5 h-5 rounded bg-gray-800 border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <div>
                    <p className="text-sm text-white">Videoya altyazı ekle</p>
                    <p className="text-xs text-gray-500">
                      {job.targetLangName} altyazı videoya gömülecek
                    </p>
                  </div>
                </label>

                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {finalizing ? "Video oluşturuluyor..." : "Onayla ve Videoyu Oluştur"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
