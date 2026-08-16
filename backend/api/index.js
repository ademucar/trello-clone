// ============================================================
//  VERCEL GİRİŞ NOKTASI (Serverless Function)
//  Vercel, "api" klasöründeki dosyaları otomatik olarak sunucu
//  fonksiyonuna çevirir. Burada app.listen ÇAĞIRMIYORUM:
//  portu dinleme işini Vercel kendisi hallediyor, ben sadece
//  isteği karşılayacak Express uygulamasını veriyorum.
//
//  vercel.json sayesinde bütün adresler (/auth/login, /projects ...)
//  bu dosyaya yönlendiriliyor.
// ============================================================
module.exports = require("../app");
