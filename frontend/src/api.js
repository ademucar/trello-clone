// ============================================================
//  BACKEND İLE KONUŞMA KATMANI
//  Eskiden her fonksiyonda ayrı ayrı fetch/headers/catch yazıyordum
//  (10 yerde aynı kod). Hepsini buraya tek bir yardımcıya topladım.
//
//  Bu katmanın çözdüğü asıl sorun şuydu: eski kod doğrudan res.json()
//  çağırıyordu. Sunucu hata döndüğünde (502/429 gibi) cevap JSON değil
//  HTML oluyor, res.json() patlıyor ve kullanıcı hiçbir açıklama
//  göremiyordu ("giriş yap diyorum girmiyor" sorununun arayüz tarafı).
// ============================================================

// Adres önce .env dosyasındaki VITE_API_URL'den okunur, yoksa canlı sunucu kullanılır.
// Böylece yerelde çalışırken backend adresini kod değiştirmeden ayarlayabiliyorum.
export const API =
  import.meta.env.VITE_API_URL || "https://trello-clone-pjnd.onrender.com";

// Giriş bilgisini tarayıcı hafızasında saklıyorum ki sayfa yenilenince
// oturum kapanmasın (eski sürümde her F5'te tekrar giriş gerekiyordu).
const DEPO_ANAHTARI = "trello-clone-oturum";

export function oturumOku() {
  try {
    const kayit = localStorage.getItem(DEPO_ANAHTARI);
    return kayit ? JSON.parse(kayit) : null;
  } catch {
    return null; // Bozuk kayıt varsa çökmek yerine "oturum yok" kabul ediyorum
  }
}

export function oturumYaz(oturum) {
  if (oturum) localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(oturum));
  else localStorage.removeItem(DEPO_ANAHTARI);
}

// Hata sınıfım: içinde HTTP durum kodunu da taşıyor.
// Böylece 401 (token geçersiz) durumunu ayırt edip otomatik çıkış yapabiliyorum.
export class ApiHatasi extends Error {
  constructor(mesaj, durum) {
    super(mesaj);
    this.durum = durum;
  }
}

/**
 * Backend'e istek atan tek fonksiyonum.
 * @param {string} yol    - "/projects" gibi adres
 * @param {object} secenek - { method, body, token }
 */
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
    // Buraya düşüyorsak sunucuya hiç ulaşamadık (kapalı, internet yok vb.)
    throw new ApiHatasi("Sunucuya bağlanılamadı. İnternetini ve sunucuyu kontrol et.", 0);
  }

  // Cevabı JSON okumayı deniyorum; JSON değilse (HTML hata sayfası gibi) boş geçiyorum.
  // Kritik nokta: burada patlamıyorum, bu yüzden hata mesajı artık kullanıcıya ulaşıyor.
  let veri = null;
  try {
    veri = await cevap.json();
  } catch {
    veri = null;
  }

  if (!cevap.ok) {
    // Sunucunun kendi açıkladığı mesaj varsa onu, yoksa duruma göre anlaşılır bir mesaj gösteriyorum
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
