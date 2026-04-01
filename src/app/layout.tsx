import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Superlike Dubbing — AI Video Çeviri",
  description: "Videolarınızı AI ile 29 dile çevirin. Orijinal ses tonu korunur, altyazı otomatik eklenir. Superlike tarafından geliştirildi.",
  keywords: ["video çeviri", "dubbing", "AI seslendirme", "video lokalizasyon", "altyazı", "superlike"],
  openGraph: {
    title: "Superlike Dubbing — AI Video Çeviri",
    description: "Videolarınızı AI ile 29 dile çevirin. Orijinal ses tonu korunur, altyazı otomatik eklenir.",
    url: "https://dub.superlike.com.tr",
    siteName: "Superlike Dubbing",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Superlike Dubbing — AI Video Çeviri",
    description: "Videolarınızı AI ile 29 dile çevirin. Orijinal ses tonu korunur, altyazı otomatik eklenir.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
