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

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJob = useCallback(async () => {
    const res = await fetch(`/api/dubbing/${id}`);
    if (res.ok) {
      const data = await res.json();
      setJob(data);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();

    const interval = setInterval(async () => {
      if (!job || job.status === "COMPLETED" || job.status === "FAILED") return;

      const res = await fetch(`/api/dubbing/${id}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status !== job?.status) {
          fetchJob();
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, job?.status, fetchJob]);

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

  if (loading) {
    return <div className="text-gray-500">Yükleniyor...</div>;
  }

  if (!job) {
    return <div className="text-red-400">Job bulunamadı</div>;
  }

  return (
    <div className="max-w-xl">
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
          <a
            href={`/api/dubbing/${job.id}/download`}
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors text-center"
          >
            Çevrilmiş Videoyu İndir
          </a>
        )}
      </div>
    </div>
  );
}
