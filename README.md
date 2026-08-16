<div align="center">

>
</div>

---

## 📌 Proje Hakkında

**Trello Clone**, ekiplerin ve bireylerin görevlerini **"Yapılacak → Yapılıyor → Bitti"** mantığıyla (Kanban) takip edebildiği, çok platformlu bir iş yönetim sistemidir.

Kullanıcılar proje oluşturur, her projeye görev ekler ve görevleri durumlar arasında hareket ettirir. Sistem **web, masaüstü ve mobil** olmak üzere üç platformda çalışır ve hepsi **aynı backend ve veritabanını** paylaşır.

> Bu proje bir staj kapsamında, full-stack mimariyi baştan sona (analiz → backend → frontend → auth → güvenlik → çok platform → deploy) uygulamak amacıyla geliştirilmiştir.

---

## 🚀 Canlı Erişim

| Platform | Adres |
|----------|-------|
| 🌐 **Web (Frontend)** | [trelloclon.vercel.app](https://trelloclon.vercel.app) |
| ⚙️ **API (Backend)** | [trello-clone-pjnd.onrender.com](https://trello-clone-pjnd.onrender.com) |

> ℹ️ Backend ücretsiz sunucuda barındığı için, uzun süre kullanılmadığında "uyku" moduna geçer. İlk istekte ~30-50 saniye gecikme olabilir; sonra normal hızına döner.

---

## ✨ Özellikler

| | Özellik | Açıklama |
|---|---------|----------|
| 🗂️ | **Proje Yönetimi** | Kullanıcı birden fazla proje (board) oluşturabilir |
| 📋 | **Kanban Panosu** | Görevler *todo / doing / done* kolonlarında takip edilir |
| 🔐 | **JWT Kimlik Doğrulama** | Güvenli kayıt / giriş sistemi |
| 🔒 | **Şifre Güvenliği** | Şifreler `bcrypt` ile hash'lenerek saklanır |
| 👥 | **Rol Bazlı Erişim** | `admin` tüm verileri, `user` yalnızca kendi verilerini görür |
| 🛡️ | **Rate Limiting** | Brute-force saldırılarına karşı istek sınırlama |
| 🌐 | **Çok Platform** | Web + Masaüstü (.exe) + Mobil (iOS) tek backend üzerinde |
| ☁️ | **Bulut Dağıtım** | Vercel (web) + Render (backend & PostgreSQL) ile canlıda |

---

## 🛠️ Kullanılan Teknolojiler

<div align="center">

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | Node.js · Express |
| **ORM** | Sequelize |
| **Veritabanı** | PostgreSQL |
| **Web** | React (Vite) |
| **Mobil** | React Native (Expo) |
| **Masaüstü** | Electron |
| **Güvenlik** | JWT · bcrypt · express-rate-limit |
| **Dağıtım (Deploy)** | Vercel · Render |

</div>

---

## 🏗️ Sistem Mimarisi

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   KULLANICI  │   │   FRONTEND   │   │   BACKEND    │   │  VERİTABANI  │
│  Web/Mobil/  │──▶│   React /    │──▶│  Node.js +   │──▶│  PostgreSQL  │
│   Masaüstü   │   │ React Native │   │   Express    │   │   (Render)   │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
                     (Vercel)          Sequelize (ORM)      (Render)
```

**Veritabanı İlişkileri (ER):**

```
USER (1) ──────< (∞) PROJECT (1) ──────< (∞) TASK
  │                                            │
  └──────────────< (∞) ────────────────────────┘
```

- Bir **kullanıcının** birden çok **projesi** olabilir
- Bir **projenin** birden çok **görevi** olabilir
- Her **görev** onu oluşturan kullanıcıya da bağlıdır

---

## 📂 Proje Yapısı

```
trello-clone/
├── backend/            # Node.js + Express + Sequelize API
│   ├── db.js           # Veritabanı bağlantısı + tablolar (modeller)
│   ├── server.js       # Tüm API endpoint'leri
│   ├── make-admin.js   # Bir kullanıcıyı admin yapan yardımcı script
│   └── .env.example    # Gerekli ortam değişkenlerinin örneği
├── frontend/           # React (Vite) web arayüzü
│   └── src/
│       ├── api.js      # Backend ile konuşma katmanı (tüm istekler buradan)
│       ├── App.jsx     # Ekranlar: giriş, proje listesi, kanban panosu
│       └── App.css     # Uygulama stilleri
├── mobile/             # React Native (Expo) mobil uygulama
│   ├── api.js          # Web'dekiyle aynı istek katmanı
│   └── App.js
├── electron-main.js    # Masaüstü uygulama (Electron) ana dosyası
├── render.yaml         # Render deploy ayarları (backend + veritabanı)
└── .gitignore
```

---

## 💻 Yerelde Çalıştırma

**1) Backend**

```bash
cd backend && npm install && npm start
```

Sunucu `http://localhost:3000` adresinde açılır. `backend/.env` dosyası yoksa
veya `DATABASE_URL` boşsa, otomatik olarak yerel **SQLite** (`backend/trello.db`)
kullanılır — yani ekstra kurulum yapmadan çalışır.

PostgreSQL kullanmak için `backend/.env.example` dosyasını `.env` olarak
kopyalayıp `DATABASE_URL` ve `JWT_SECRET` değerlerini doldurmak yeterli.

**2) Web arayüzü**

```bash
cd frontend && npm install && npm run dev
```

Yerel backend'e bağlanmak için `frontend/.env.local` dosyası oluşturup içine
`VITE_API_URL=http://localhost:3000` yazılır. Bu dosya yoksa canlı sunucu kullanılır.

**3) Mobil**

```bash
cd mobile && npm install && npm start
```

**4) Masaüstü**

```bash
npm install && npm run electron
```

---

## 🗄️ Veritabanı Davranışı

Backend iki veritabanıyla da çalışacak şekilde yazıldı:

| Durum | Kullanılan veritabanı |
|-------|----------------------|
| `DATABASE_URL` **dolu** | PostgreSQL (Render, bulut) |
| `DATABASE_URL` **boş** | SQLite (`backend/trello.db`, yerel dosya) |

Ayrıca veritabanına **hiç ulaşılamasa bile sunucu çökmez**: ayakta kalır,
`/health` adresinden durumunu bildirir ve isteklere anlaşılır bir `503`
mesajı döner.

---

## 🔌 API Endpoint'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/health` | Sunucu ve veritabanı durumu (deploy sağlık kontrolü) |
| `POST` | `/auth/register` | Yeni kullanıcı kaydı |
| `POST` | `/auth/login` | Giriş yap (JWT token döner) |
| `GET` | `/projects` | Projeleri listele |
| `POST` | `/projects` | Yeni proje oluştur |
| `DELETE` | `/projects/:id` | Projeyi sil |
| `GET` | `/projects/:id/tasks` | Projenin görevlerini listele |
| `POST` | `/projects/:id/tasks` | Projeye görev ekle |
| `PUT` | `/tasks/:id` | Görevi güncelle (durum değiştir) |
| `DELETE` | `/tasks/:id` | Görevi sil |

---

## 🔐 Güvenlik Notları

- Şifreler **asla düz metin** olarak saklanmaz — `bcrypt` ile hash'lenir
- Tüm görev/proje işlemleri **JWT token** ile korunur
- Veritabanı sorguları **Sequelize ORM** üzerinden yapılır → **SQL Injection** koruması
- Giriş denemeleri **rate limit** ile sınırlanır → brute-force koruması
  (yalnızca **başarısız** denemeler sayılır, doğru şifreyle giren kullanıcı kilitlenmez)
- Gizli bilgiler (`DATABASE_URL`, `JWT_SECRET`) `.env` dosyasında tutulur, koda yazılmaz
- Token imzalama anahtarı ortam değişkeninden okunur; Render'da otomatik üretilir
- Masaüstü uygulamasında uzak sayfaya **Node.js erişimi verilmez**
  (`nodeIntegration: false`, `contextIsolation: true`)

---

<div align="center">

### 👨‍💻 Geliştirici

**Adem Uçar**
Matematik ve Bilgisayar Bilimleri

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/adem-u%C3%A7ar-39501731a/)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=flat&logo=instagram&logoColor=white)](https://www.instagram.com/ademucarr_/)

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1025,50:7b3fe4,100:5067c5&height=100&section=footer" width="100%"/>

</div>
