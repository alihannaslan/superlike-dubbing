import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Superlike Dubbing",
  description: "Video dubbing tool powered by ElevenLabs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
