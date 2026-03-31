# Superlike Video Dubbing Tool — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Author:** Alihan + Claude

## 1. Problem

Superlike, müşterileri için Türkçe voiceover videolar üretiyor. Bu markalar videoları yurtdışındaki bayiler ve dağıtım kanallarına farklı dillerde vermek istiyor. Şu an bu süreç manuel ve yavaş. Bir web aracı ile bu süreci otomatikleştirmek gerekiyor.

## 2. Çözüm

ElevenLabs Dubbing API kullanan bir web uygulaması. Kullanıcı video yükler, hedef dil seçer, API videoyu çevirir, kullanıcı çevrilmiş videoyu indirir.

## 3. Kullanıcı Profili

- Superlike ekibi (voiceover üreticileri)
- Müşteri ekipleri (marka tarafı, videoyu alıp bayilere dağıtacak kişiler)
- Login ile erişim, kullanıcı bazlı iş takibi

## 4. Kapsam

### Dahil (MVP)
- Kullanıcı kaydı ve login (email/password)
- Video yükleme (MP4, MOV, MP3, WAV — max 500MB)
- Hedef dil seçimi (ElevenLabs destekli tüm diller, tek dil/iş)
- Kaynak dil sabit: Türkçe
- ElevenLabs Dubbing API ile çeviri
- Durum takibi (polling)
- Çevrilmiş video indirme
- Geçmiş çeviriler listesi (dashboard)

### Kapsam Dışı (MVP sonrası)
- Çoklu dil seçimi (batch)
- Transcript düzenleme / review adımı
- Maliyet takibi / dashboard
- Kullanıcı rolü yönetimi (admin vs user)
- Video preview / player

## 5. Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 15 (App Router) |
| Dil | TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth v5, Credentials provider, JWT |
| DB | SQLite + Prisma |
| Storage | Local disk (`uploads/` ve `dubbed/`) |
| API | ElevenLabs Dubbing API |
| Polling | Client-side polling (5s interval) |

### Neden SQLite?
- Internal tool, az kullanıcı
- Deploy basit (tek dosya, external DB gerektirmez)
- Prisma ile yönetim kolay
- İhtiyaç büyürse PostgreSQL'e geçiş Prisma ile kolay

## 6. Kullanıcı Akışı

```
1. /login → Email/password ile giriş
2. / (Dashboard) → Geçmiş çeviriler listesi (tablo)
   - Her satır: dosya adı, hedef dil, durum, tarih, indirme butonu
3. "Yeni Çeviri" butonu → /new sayfasına git
4. /new → Video yükle (drag & drop veya dosya seç)
        → Hedef dil seç (dropdown)
        → "Çeviriyi Başlat" butonu
5. Başlat → /jobs/[id] sayfasına redirect
6. /jobs/[id] → Progress göstergesi
   - Durum: Yükleniyor → İşleniyor → Tamamlandı / Hata
   - Tamamlandığında "İndir" butonu aktif
```

## 7. API Akışı (Backend → ElevenLabs)

```
Adım 1: Video Yükleme & Dubbing Başlatma
  POST https://api.elevenlabs.io/v1/dubbing
  Content-Type: multipart/form-data
  Headers: xi-api-key: {ELEVENLABS_API_KEY}
  Body:
    - file: (video dosyası)
    - source_lang: "tr"
    - target_lang: (kullanıcının seçtiği dil kodu, ISO 639-1)
    - num_speakers: 0 (otomatik algıla)
    - watermark: false
  Response: { dubbing_id: string, expected_duration_sec: number }

Adım 2: Durum Polling
  GET https://api.elevenlabs.io/v1/dubbing/{dubbing_id}
  Headers: xi-api-key: {ELEVENLABS_API_KEY}
  Response: { dubbing_id, name, status, target_languages, ... }
  → status "dubbed" olana kadar 5 saniyede bir tekrarla

Adım 3: Çevrilmiş Videoyu İndirme
  GET https://api.elevenlabs.io/v1/dubbing/{dubbing_id}/audio/{language_code}
  Headers: xi-api-key: {ELEVENLABS_API_KEY}
  Response: binary stream (MP4/MP3)
  → Local diske kaydet (dubbed/{dubbing_id}.mp4)
```

## 8. Veritabanı Şeması

### User
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | String (cuid) | PK |
| email | String | Unique, login |
| password | String | bcrypt hash |
| name | String | Görünen ad |
| createdAt | DateTime | Kayıt tarihi |

### DubbingJob
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | String (cuid) | PK |
| userId | String | FK → User |
| originalFileName | String | Yüklenen dosya adı |
| originalFilePath | String | Disk yolu |
| originalFileSize | Int | Byte cinsinden |
| targetLang | String | ISO 639-1 dil kodu |
| targetLangName | String | Dil adı (görüntüleme) |
| status | Enum | PENDING, UPLOADING, PROCESSING, COMPLETED, FAILED |
| dubbingId | String? | ElevenLabs dubbing_id |
| expectedDuration | Int? | Tahmini süre (saniye) |
| dubbedFilePath | String? | Çevrilmiş dosya yolu |
| errorMessage | String? | Hata mesajı |
| createdAt | DateTime | Oluşturma |
| completedAt | DateTime? | Tamamlanma |

## 9. API Routes (Next.js)

| Method | Route | Açıklama |
|--------|-------|----------|
| POST | `/api/auth/[...nextauth]` | NextAuth handler |
| POST | `/api/dubbing` | Yeni dubbing job oluştur + ElevenLabs'a gönder |
| GET | `/api/dubbing` | Kullanıcının tüm job'larını listele |
| GET | `/api/dubbing/[id]` | Job detayı + durum |
| GET | `/api/dubbing/[id]/status` | ElevenLabs'tan güncel durum (polling endpoint) |
| GET | `/api/dubbing/[id]/download` | Çevrilmiş dosyayı indir |

## 10. Sayfa Yapısı

```
app/
├── (auth)/
│   └── login/
│       └── page.tsx          # Login formu
├── (dashboard)/
│   ├── layout.tsx            # Sidebar + header
│   ├── page.tsx              # Dashboard — job listesi
│   ├── new/
│   │   └── page.tsx          # Yeni çeviri formu
│   └── jobs/
│       └── [id]/
│           └── page.tsx      # Job detay + progress + indirme
├── api/
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts
│   └── dubbing/
│       ├── route.ts          # POST: create, GET: list
│       └── [id]/
│           ├── route.ts      # GET: job detail
│           ├── status/
│           │   └── route.ts  # GET: poll ElevenLabs status
│           └── download/
│               └── route.ts  # GET: serve dubbed file
└── layout.tsx                # Root layout
```

## 11. Kullanıcı Yönetimi

- İlk kullanıcı seed ile oluşturulur (admin)
- Basit `/register` sayfası — email, password, isim ile kayıt
- MVP'de rol sistemi yok, tüm kullanıcılar eşit yetkili
- İleride admin/user ayrımı eklenebilir

## 12. Güvenlik

- ElevenLabs API key sadece server-side (env: `ELEVENLABS_API_KEY`)
- Tüm API route'ları auth middleware ile korunur
- Kullanıcı sadece kendi job'larını görebilir (userId filtresi)
- Password bcrypt ile hash'lenir
- Dosya yükleme limiti: 500MB
- Kabul edilen dosya türleri: MP4, MOV, MP3, WAV

## 12. UI Tasarım Notları

- Temiz, minimal arayüz (Tailwind)
- Dashboard: tablo görünümü, status badge'leri (renkli)
- Yeni çeviri: drag & drop alan + dil dropdown
- Job detay: progress bar veya spinner + durum metni
- Koyu tema (Superlike markasıyla uyumlu)
- Responsive (masaüstü öncelikli)

## 13. ElevenLabs Desteklenen Diller

API'den dönen tüm diller listelenecek. Bilinen diller:
English, Spanish, French, German, Italian, Portuguese, Polish, Dutch, Turkish, Swedish, Indonesian, Filipino, Japanese, Ukrainian, Greek, Czech, Finnish, Romanian, Russian, Danish, Bulgarian, Malay, Slovak, Croatian, Arabic, Tamil, Chinese, Korean, Hindi

Dropdown'da dil adı + bayrak ikonu gösterilecek.

## 14. Hata Yönetimi

| Durum | Kullanıcıya Gösterilen |
|-------|----------------------|
| Dosya çok büyük (>500MB) | "Dosya boyutu 500MB'ı aşamaz" |
| Desteklenmeyen format | "Sadece MP4, MOV, MP3, WAV dosyaları kabul edilir" |
| ElevenLabs API hatası | "Çeviri başlatılamadı, lütfen tekrar deneyin" |
| Dubbing failed | "Çeviri başarısız oldu: {hata mesajı}" |
| Network hatası | "Bağlantı hatası, lütfen tekrar deneyin" |
