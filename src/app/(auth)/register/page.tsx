"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        name: formData.get("name"),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Kayıt başarısız");
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <img src="https://superlike.com.tr/assets/superlike-logo.webp" alt="Superlike" className="h-8 mb-4" />
        <p className="text-gray-500 text-sm mb-6">Yeni hesap oluştur</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm text-gray-700 mb-1">Ad Soyad</label>
            <input id="name" name="name" type="text" required className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ad Soyad" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm text-gray-700 mb-1">Email</label>
            <input id="email" name="email" type="email" required className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="email@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-gray-700 mb-1">Şifre</label>
            <input id="password" name="password" type="password" required minLength={6} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors">
            {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p className="text-gray-500 text-sm mt-4 text-center">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="text-blue-600 hover:text-blue-700">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
