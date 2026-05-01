"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

interface Job {
  id: string;
  originalFileName: string;
  targetLang: string;
  targetLangName: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
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
                className="block bg-white border border-gray-200 shadow-sm rounded-xl p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.originalFileName}</p>
                  <StatusBadge status={job.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{job.targetLangName}</span>
                  <span>{formatDate(job.createdAt)}</span>
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
                    <td className="px-4 py-3 text-sm">{job.originalFileName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{job.targetLangName}</td>
                    <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
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
