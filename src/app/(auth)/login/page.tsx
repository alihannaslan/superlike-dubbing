"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      setError("Email veya şifre hatalı");
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <img src="https://superlike.com.tr/assets/superlike-logo.webp" alt="Superlike" className="h-8 mb-6" />
        <p className="text-gray-500 text-sm mb-6">Video çeviri aracına giriş yap</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-700 mb-1">Email</label>
            <input id="email" name="email" type="email" required className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="email@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-gray-700 mb-1">Şifre</label>
            <input id="password" name="password" type="password" required className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors">
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <p className="text-gray-500 text-sm mt-4 text-center">
          Hesabın yok mu?{" "}
          <Link href="/register" className="text-blue-600 hover:text-blue-700">Kayıt ol</Link>
        </p>
      </div>
    </div>
  );
}
