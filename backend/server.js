// ============================================================
//  YEREL SUNUCU BAŞLATICI
//  Bilgisayarımda geliştirme yaparken bu dosyayı çalıştırıyorum:
//      npm start
//
//  Uygulamanın kendisi app.js'te; burada sadece onu bir porta bağlıyorum.
//  (Vercel'de ise app.js'i api/index.js çağırıyor, orada listen yapılmaz.)
// ============================================================
// .env okuma işini db.js yapıyor (app.js onu require ediyor),
// o yüzden burada tekrar çağırmıyorum.
const app = require("./app");
const { veritabaniHazirla, dialect } = require("./db");

const PORT = process.env.PORT || 3000;

// ÖNEMLİ: Önce veritabanına bağlanmayı deniyorum, ama bağlantı
// BAŞARISIZ OLSA BİLE sunucuyu yine de açıyorum.
// Sebebi: Eski kodda veritabanı hatası tüm sunucuyu çökertiyordu
// (Render'daki 502 hatasının ve "giriş yapılamıyor" sorununun kaynağı buydu).
async function start() {
  const sonuc = await veritabaniHazirla();

  // "0.0.0.0": Telefonun (mobil) da yerel ağdan bağlanabilmesi için
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[sunucu] Calisiyor -> http://localhost:${PORT}  (veritabani: ${dialect})`);
    if (!sonuc.ok) {
      console.log("[sunucu] UYARI: Veritabani baglantisi yok, istekler 503 donecek.");
    }
  });
}

// Not: unhandledRejection / uncaughtException yakalayıcıları app.js'te tanımlı
// (orada olmaları gerekiyor ki Vercel'de de devrede olsunlar).

start();
