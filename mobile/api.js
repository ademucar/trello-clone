// ============================================================
//  BACKEND İLE KONUŞMA KATMANI (Mobil)
//  Web sürümündeki frontend/src/api.js ile AYNI mantık.
//  Her ekranda ayrı ayrı fetch/headers/catch yazmak yerine
//  tüm istekleri buradan geçiriyorum.
//
//  Önemli: Eski kod doğrudan res.json() çağırıyordu. Sunucu hata
//  verdiğinde cevap JSON olmadığı için bu satır patlıyor ve kullanıcı
//  neyin yanlış gittiğini göremiyordu. Artık hatayı yakalayıp
//  anlaşılır bir mesaja çeviriyorum.
// ============================================================

// Backend adresim (web ve masaüstü sürümüyle aynı sunucu).
// Yerelde test ederken telefonun bilgisayara ulaşabilmesi için
// "localhost" değil, bilgisayarın yerel IP'si yazılmalı (örn. http://192.168.1.5:3000)
export const API = "https://trello-clone-backend-hof7.onrender.com";

export class ApiHatasi extends Error {
  constructor(mesaj, durum) {
    super(mesaj);
    this.durum = durum;
  }
}

export async function istek(yol, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let cevap;
  try {
    cevap = await fetch(`${API}${yol}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Sunucuya hiç ulaşamadık (kapalı, internet yok, yanlış adres)
    throw new ApiHatasi("Sunucuya bağlanılamadı. İnternetini kontrol et.", 0);
  }

  let veri = null;
  try {
    veri = await cevap.json();
  } catch {
    veri = null; // Cevap JSON değilse burada patlamıyorum
  }

  if (!cevap.ok) {
    const mesaj =
      veri?.message ||
      (cevap.status === 429
        ? "Çok fazla deneme yaptın, biraz bekle."
        : cevap.status >= 500
          ? "Sunucu şu an cevap veremiyor, birazdan tekrar dene."
          : "Bir hata oluştu.");
    throw new ApiHatasi(mesaj, cevap.status);
  }

  return veri;
}
