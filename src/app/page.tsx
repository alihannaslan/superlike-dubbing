"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "da", name: "Dansk", flag: "🇩🇰" },
];

const STEPS = [
  {
    num: "01",
    title: "Video Yükle",
    desc: "Türkçe voiceover videonuzu platforma yükleyin. MP4, MOV, MP3 ve WAV formatları desteklenir.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Dil Seç",
    desc: "28 desteklenen dilden hedef dili seçin. AI, konuşmacının ses tonunu ve vurgusunu korur.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "İncele & Onayla",
    desc: "Çeviri segmentlerini gözden geçirin, altyazı ekleyin ve videoyu oluşturun.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "İndir & Paylaş",
    desc: "Çevrilmiş videoyu indirin. Bayilere, distribütörlere ve uluslararası kanallara gönderin.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
];

const FEATURES = [
  { title: "Ses Klonlama", desc: "Konuşmacının orijinal ses tonu korunur" },
  { title: "28 Dil Desteği", desc: "Avrupa, Asya ve Orta Doğu dilleri" },
  { title: "Altyazı Gömme", desc: "Videoya otomatik altyazı ekleme" },
  { title: "Hızlı İşlem", desc: "Dakikalar içinde çeviri hazır" },
  { title: "Kolay Kullanım", desc: "Teknik bilgi gerektirmez" },
  { title: "Güvenli", desc: "Videolarınız şifreli ve korumalı" },
];

export default function LandingPage() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % LANGUAGES.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src="https://superlike.com.tr/assets/superlike-logo.webp" alt="Superlike" className="h-7" />
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Giriş Yap
            </Link>
            <Link href="/register" className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-100/40 via-purple-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-8 shadow-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-600 font-medium">AI Destekli Video Çeviri</span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Videolarınızı
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                dünyaya açın
              </span>
            </h1>

            <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
              Türkçe voiceover videolarınızı AI ile 28 dile çevirin.
              Orijinal ses tonu korunur, altyazı otomatik eklenir.
            </p>

            <div className="flex items-center justify-center gap-4 mb-16">
              <Link
                href="/register"
                className="bg-gray-900 text-white px-7 py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all hover:shadow-lg hover:shadow-gray-900/20 hover:-translate-y-0.5"
              >
                Hemen Başla
              </Link>
              <a
                href="#nasil-calisir"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1.5"
              >
                Nasıl çalışır?
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>

            {/* Language ticker */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {LANGUAGES.map((lang, i) => (
                <div
                  key={lang.code}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500 ${
                    i === activeIdx
                      ? "bg-gray-900 text-white scale-110 shadow-lg"
                      : "bg-white text-gray-500 border border-gray-200"
                  }`}
                >
                  <span className="text-sm">{lang.flag}</span>
                  {lang.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* APP PREVIEW */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-gray-200/50 bg-white">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-white border border-gray-200 rounded-md px-4 py-1 text-xs text-gray-400 w-64 text-center">
                dub.superlike.com.tr
              </div>
            </div>
          </div>
          <div className="p-8 bg-gray-50">
            <div className="flex gap-6">
              <div className="w-48 shrink-0 hidden sm:block">
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="h-5 w-20 bg-gray-200 rounded" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                  <div className="mt-4 space-y-2">
                    <div className="h-8 bg-blue-50 border border-blue-100 rounded-lg" />
                    <div className="h-8 bg-gray-50 rounded-lg" />
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="h-6 w-40 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-28 bg-gray-100 rounded" />
                  </div>
                  <div className="h-9 w-28 bg-blue-600 rounded-lg" />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="grid grid-cols-5 gap-4 px-4 py-2.5 border-b border-gray-100">
                    {[12, 14, 10, 12, 0].map((w, i) => (
                      <div key={i} className={`h-3 bg-gray-100 rounded ${w ? `w-${w}` : ""}`} style={{ width: w ? `${w * 4}px` : undefined }} />
                    ))}
                  </div>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-gray-50 items-center">
                      <div className="h-3 w-24 bg-gray-100 rounded" />
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{["🇬🇧", "🇩🇪", "🇫🇷"][i]}</span>
                        <div className="h-3 w-14 bg-gray-100 rounded" />
                      </div>
                      <div className={`h-5 w-16 rounded-full ${["bg-green-100", "bg-blue-100", "bg-purple-100"][i]}`} />
                      <div className="h-3 w-20 bg-gray-100 rounded" />
                      <div className="h-3 w-8 bg-blue-100 rounded ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="nasil-calisir" className="py-24 bg-white border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3">Nasıl Çalışır?</h2>
            <p className="text-gray-500 max-w-md mx-auto">4 basit adımda videolarınızı farklı dillere çevirin</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.num} className="group relative p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300 bg-white">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-gray-300 tabular-nums">{step.num}</span>
                  <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                </div>
                <h3 className="font-semibold mb-2 text-gray-900">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3">Neden Superlike Dubbing?</h2>
            <p className="text-gray-500 max-w-md mx-auto">AI teknolojisi ile profesyonel video çeviri</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow">
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gray-900" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="relative px-10 py-16 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Videolarınızı bugün çevirmeye başlayın</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Ücretsiz hesap oluşturun ve ilk videonuzu dakikalar içinde farklı dillere çevirin.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-white text-gray-900 px-7 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                Ücretsiz Başla
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="https://superlike.com.tr/assets/superlike-logo.webp" alt="Superlike" className="h-5 opacity-50" />
            <span className="text-xs text-gray-400">Video Dubbing</span>
          </div>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} Superlike. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
