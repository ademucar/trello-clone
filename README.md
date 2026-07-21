<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:5067c5,50:7b3fe4,100:0d1025&height=200&section=header&text=Trello%20Clone&fontSize=60&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Akıllı%20Görev%20%26%20Proje%20Yönetim%20Sistemi&descAlignY=58&descSize=18" width="100%"/>


<br/>

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?style=for-the-badge&logo=sequelize&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

<br/>



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
| 🌐 **Web (Frontend)** | [trello-clone-swart-ten.vercel.app](https://trello-clone-swart-ten.vercel.app) |
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
├── backend/          # Node.js + Express + Sequelize API (PostgreSQL)
│   └── server.js     # Tüm API endpoint'leri ve veritabanı modelleri
├── frontend/         # React (Vite) web arayüzü
│   └── src/App.jsx   # Kanban panosu ve giriş ekranı
├── mobile/           # React Native (Expo) mobil uygulama
│   └── App.js
├── electron-main.js  # Masaüstü uygulama (Electron) ana dosyası
└── .gitignore
```

---

## 🚀 Kurulum ve Çalıştırma (Lokal)

### Gereksinimler
- [Node.js](https://nodejs.org/) (LTS sürümü)
- [Expo Go](https://expo.dev/go) (mobil test için)
- Bir PostgreSQL bağlantı adresi (`.env` içinde `DATABASE_URL`)

### 1️⃣ Backend

```bash
cd backend
npm install
node server.js
```
> Sunucu `http://localhost:3000` adresinde çalışır.
> Not: `backend/.env` dosyasında `DATABASE_URL` tanımlı olmalıdır.

### 2️⃣ Web (Frontend)

```bash
cd frontend
npm install
npm run dev
```
> Uygulama `http://localhost:5173` adresinde açılır.

### 3️⃣ Mobil

```bash
cd mobile
npm install
npx expo start
```
> Çıkan QR kodu telefondaki **Expo Go** ile okutun.

### 4️⃣ Masaüstü (Electron)

```bash
npm install
npm run electron
```

---

## 🔌 API Endpoint'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
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
- Gizli bilgiler (veritabanı adresi) `.env` dosyasında tutulur, koda yazılmaz

---

<div align="center">

### 👨‍💻 Geliştirici

**Adem Uçar**
Matematik ve Bilgisayar Bilimleri

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/adem-u%C3%A7ar-39501731a/)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=flat&logo=instagram&logoColor=white)](https://www.instagram.com/ademucarr_/)

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1025,50:7b3fe4,100:5067c5&height=100&section=footer" width="100%"/>

</div>
