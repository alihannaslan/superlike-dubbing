"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { getLanguageFlag } from "@/lib/languages";

interface Job {
  id: string;
  originalFileName: string;
  targetLang: string;
  targetLangName: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  downloadedAt: string | null;
  hasPreviewFrame: boolean;
}

function Thumbnail({ job, className }: { job: Job; className: string }) {
  if (job.hasPreviewFrame) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/dubbing/${job.id}/preview-frame`}
        alt=""
        className={`${className} object-cover bg-gray-900`}
        loading="lazy"
      />
    );
  }
  return (
    <div className={`${className} bg-gray-100 flex items-center justify-center`}>
      <svg className="w-1/2 h-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dubbing")
      .then((res) => res.json())
      .then((data) => {
        setJobs(data);
        setLoading(false);
      });
  }, []);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Video çevirileriniz</p>
        </div>
        <Link
          href="/dashboard/new"
          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          Yeni Çeviri
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-500">Yükleniyor...</div>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-12 text-center">
          <p className="text-gray-500">Henüz çeviri yok</p>
          <Link
            href="/dashboard/new"
            className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block"
          >
            İlk çeviriyi başlat
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/jobs/${job.id}`}
                className="flex gap-3 bg-white border border-gray-200 shadow-sm rounded-xl p-3 hover:border-gray-300 transition-colors"
              >
                <Thumbnail job={job} className="w-14 h-20 shrink-0 rounded-md overflow-hidden" />
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{job.originalFileName}</p>
                    <StatusBadge status={job.status} downloadedAt={job.downloadedAt} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm leading-none">{getLanguageFlag(job.targetLang)}</span>
                      {job.targetLangName}
                    </span>
                    <span>{formatDate(job.createdAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Dosya</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Hedef Dil</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Durum</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Tarih</th>
                  <th className="text-right text-xs text-gray-400 font-medium px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Thumbnail job={job} className="w-10 h-14 shrink-0 rounded overflow-hidden" />
                        <span className="truncate">{job.originalFileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base leading-none">{getLanguageFlag(job.targetLang)}</span>
                        {job.targetLangName}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={job.status} downloadedAt={job.downloadedAt} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(job.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/jobs/${job.id}`} className="text-blue-600 hover:text-blue-700 text-sm">Detay</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
