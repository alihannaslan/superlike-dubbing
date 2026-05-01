"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { SubtitlePreview, type SubtitleStyleControls } from "@/components/SubtitlePreview";
import { SUBTITLE_FONTS, DEFAULT_SUBTITLE_STYLE } from "@/lib/ffmpeg-constants";
import { getLanguageFlag } from "@/lib/languages";

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
  downloadedAt: string | null;
  hasPreviewFrame?: boolean;
  subtitleFont?: string | null;
  subtitleSize?: number | null;
  subtitleColor?: string | null;
  subtitleBgColor?: string | null;
  subtitleBgOpacity?: number | null;
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
  const [dubbing, setDubbing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const [style, setStyle] = useState<SubtitleStyleControls>(DEFAULT_SUBTITLE_STYLE);

  const fetchJob = useCallback(async () => {
    const res = await fetch(`/api/dubbing/${id}`);
    if (res.ok) {
      const data: JobDetail = await res.json();
      setJob(data);
      setLoading(false);
      if (data.subtitleFont && data.subtitleSize && data.subtitleColor && data.subtitleBgColor && data.subtitleBgOpacity !== null && data.subtitleBgOpacity !== undefined) {
        setStyle({
          font: data.subtitleFont,
          size: data.subtitleSize,
          color: data.subtitleColor,
          bgColor: data.subtitleBgColor,
          bgOpacity: data.subtitleBgOpacity,
        });
      }
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
    if (!job) return;
    if (
      (job.status === "REVIEW" || job.status === "SUBTITLE_REVIEW") &&
      segments.length === 0
    ) {
      fetchSegments();
    }
  }, [job, segments.length, fetchSegments]);

  useEffect(() => {
    if (!job) return;
    if (["COMPLETED", "FAILED", "REVIEW", "SUBTITLE_REVIEW"].includes(job.status)) return;

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
  }, [id, job, fetchJob]);

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

  async function handleStartDubbing() {
    if (hasUnsavedChanges) return;
    setDubbing(true);

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
        setDubbing(false);
        return;
      }
    }

    const res = await fetch(`/api/dubbing/${id}/dub`, { method: "POST" });

    if (res.ok) {
      fetchJob();
    } else {
      const data = await res.json();
      alert(data.error || "Bir hata oluştu");
    }
    setDubbing(false);
  }

  async function handleEditSubtitle() {
    setEditingSubtitle(true);
    const res = await fetch(`/api/dubbing/${id}/edit-subtitle`, { method: "POST" });
    if (res.ok) {
      setSegments([]);
      setEditedSegments({});
      fetchJob();
    } else {
      const data = await res.json();
      alert(data.error || "Düzenleme başlatılamadı");
    }
    setEditingSubtitle(false);
  }

  async function handleFinalize(withSubtitle: boolean) {
    setFinalizing(true);
    const body = withSubtitle
      ? { subtitleEnabled: true, style }
      : { subtitleEnabled: false };

    const res = await fetch(`/api/dubbing/${id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  const sampleText = segments[0]?.targetText || "Örnek altyazı metni";
  const frameUrl = job.hasPreviewFrame ? `/api/dubbing/${id}/preview-frame` : null;

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 text-sm mb-4 inline-block">
        &larr; Dashboard
      </Link>

      {/* Job Info Card */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 sm:p-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold break-all">{job.originalFileName}</h1>
            <p className="text-gray-400 text-sm mt-1">{formatSize(job.originalFileSize)}</p>
          </div>
          <div className="shrink-0">
            <StatusBadge status={job.status} downloadedAt={job.downloadedAt} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Kaynak Dil</p>
            <p className="text-gray-800 flex items-center gap-2">
              <span className="text-base leading-none">{getLanguageFlag(job.sourceLang)}</span>
              {job.sourceLangName || "Türkçe"}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Hedef Dil</p>
            <p className="text-gray-800 flex items-center gap-2">
              <span className="text-base leading-none">{getLanguageFlag(job.targetLang)}</span>
              {job.targetLangName}
            </p>
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

        {job.status === "DUBBING" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-blue-700 text-sm font-medium">Dublaj oluşturuluyor...</p>
                <p className="text-blue-500 text-xs mt-0.5">
                  Birazdan altyazı ayarlarını yapabileceksiniz
                </p>
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
                <p className="text-indigo-500 text-xs mt-0.5">Final video hazırlanıyor</p>
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
          <div className="space-y-2">
            <a
              href={`/api/dubbing/${job.id}/download`}
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors text-center"
            >
              Çevrilmiş Videoyu İndir
            </a>
            <button
              onClick={handleEditSubtitle}
              disabled={editingSubtitle}
              className="block w-full bg-white border border-gray-300 hover:border-gray-400 disabled:opacity-50 text-gray-700 font-medium py-2.5 rounded-lg transition-colors text-center"
            >
              {editingSubtitle ? "Hazırlanıyor..." : "Altyazıyı Düzenle"}
            </button>
          </div>
        )}
      </div>

      {/* REVIEW: Segment editor — Stage 0 → trigger Stage 1 (dubbing) */}
      {job.status === "REVIEW" && (
        <div className="mt-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Çeviriyi İncele</h2>
            <p className="text-gray-500 text-sm mt-1">
              {editable
                ? "Çevirileri kontrol edin ve düzenleyin. Onayladığınızda dublaj oluşturulacak ve sonra altyazı ayarlarına geçeceksiniz."
                : "Çevirileri kontrol edin. Onayladığınızda dublaj oluşturulacak."}
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
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs text-gray-400 font-mono">
                          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                        </span>
                        {segment.audioStale && (
                          <span className="text-xs text-yellow-600">Düzenlendi — yeniden seslendirilecek</span>
                        )}
                      </div>

                      {editable && segment.sourceText && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Türkçe (orijinal)</p>
                          <p className="text-sm text-gray-500">{segment.sourceText}</p>
                        </div>
                      )}

                      <div>
                        {editable && (
                          <p className="text-xs text-gray-400 mb-1">{job.targetLangName} (çeviri)</p>
                        )}
                        {editable && segment.segmentId ? (
                          <div className="flex flex-col sm:flex-row gap-2">
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
                                className="sm:self-end bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
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

              <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 sm:p-6">
                <button
                  onClick={handleStartDubbing}
                  disabled={dubbing || hasUnsavedChanges}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
                >
                  {dubbing
                    ? "Dublaj başlatılıyor..."
                    : hasUnsavedChanges
                    ? "Önce düzenlemeleri kaydedin"
                    : hasStaleSegments
                    ? "Yeniden seslendir ve Dublajı Oluştur"
                    : "Onayla ve Dublajı Oluştur"}
                </button>
                <p className="text-xs text-gray-400 mt-3 text-center">
                  Dublaj tamamlandıktan sonra altyazı ayarlarını yapacaksınız
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBTITLE_REVIEW: subtitle styling — Stage 2 */}
      {job.status === "SUBTITLE_REVIEW" && (
        <div className="mt-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Altyazı Ayarları</h2>
            <p className="text-gray-500 text-sm mt-1">
              Altyazı stilini özelleştirin veya altyazısız indirin. Önizleme yaklaşıktır — final video render edildiğinde küçük farklar olabilir.
            </p>
          </div>

          <SubtitlePreview frameUrl={frameUrl} sampleText={sampleText} style={style} />

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 sm:p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Font</label>
              <select
                value={style.font}
                onChange={(e) => setStyle((s) => ({ ...s, font: e.target.value }))}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SUBTITLE_FONTS.map((f) => (
                  <option key={f.ffmpegName} value={f.ffmpegName}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Boyutu: <span className="text-gray-500">{style.size}pt</span>
              </label>
              <input
                type="range"
                min={12}
                max={32}
                value={style.size}
                onChange={(e) => setStyle((s) => ({ ...s, size: Number(e.target.value) }))}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yazı Rengi</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={style.color}
                    onChange={(e) => setStyle((s) => ({ ...s, color: e.target.value.toUpperCase() }))}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 font-mono">{style.color}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Arka Plan</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={style.bgColor}
                    onChange={(e) => setStyle((s) => ({ ...s, bgColor: e.target.value.toUpperCase() }))}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 font-mono">{style.bgColor}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arka Plan Opaklığı: <span className="text-gray-500">{style.bgOpacity}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={style.bgOpacity}
                onChange={(e) => setStyle((s) => ({ ...s, bgOpacity: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleFinalize(true)}
              disabled={finalizing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {finalizing ? "Oluşturuluyor..." : "Altyazılı Olarak Tamamla"}
            </button>
            <button
              onClick={() => handleFinalize(false)}
              disabled={finalizing}
              className="bg-white border border-gray-300 hover:border-gray-400 disabled:opacity-50 text-gray-700 font-medium py-3 rounded-lg transition-colors"
            >
              Altyazısız İndir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
