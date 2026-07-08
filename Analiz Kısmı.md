# AKILLI GÖREV & PROJE YÖNETİM SİSTEMİ (TRELLO CLONE)
## Analiz & Tasarım Dokümanı

Bu doküman, projenin kodlanmadan önce nasıl planlandığını ve genel mimarisini anlatır.
Sistem; web, masaüstü ve mobil olmak üzere üç platformda çalışan, buluta dağıtılmış (deploy edilmiş),
çok platformlu (multi-platform) bir görev yönetim uygulamasıdır.

**Canlı Adres:** https://trello-clone-swart-ten.vercel.app

---

## 1. Trello / Jira Analizi

Trello ve Jira, ekiplerin görevlerini takip etmek için kullandığı proje yönetim araçlarıdır.

**Trello'daki iş mantığı:**
- Her proje bir **Board** (pano) olur.
- Her board içinde **liste**ler vardır: `To Do`, `Doing`, `Done`
- Her listede **kart**lar (görevler) bulunur.
- Kartlar listeler arasında taşınarak görevin durumu güncellenir.

**Bu projedeki karşılığı:**
- Kullanıcı bir veya birden fazla **Project** (proje) oluşturur.
- Her projenin içinde **Task**'lar (görevler) bulunur.
- Her görevin bir **status**ü olur: `todo`, `doing`, `done`
- Görevler bu üç durum arasında taşınır (Kanban mantığı).

---

## 2. User Story (Kullanıcı Hikayeleri)

User story, kullanıcının sistemden ne istediğini basit cümlelerle ifade etme yöntemidir.

Format: **Bir [kullanıcı tipi] olarak, [ne yapmak istiyorum] çünkü [neden].**

1. Bir kullanıcı olarak, kayıt olup giriş yapabilmeliyim ki sistemi güvenli kullanabileyim.
2. Bir kullanıcı olarak, proje oluşturabilmeliyim ki görevlerimi farklı panolarda gruplayabileyim.
3. Bir kullanıcı olarak, projeye görev ekleyebilmeliyim ki yapılacakları takip edebileyim.
4. Bir kullanıcı olarak, görevin durumunu (todo/doing/done) değiştirebilmeliyim ki ilerlemeyi gösterebileyim.
5. Bir kullanıcı olarak, sadece kendi projelerimi görebilmeliyim ki verilerim bana özel kalsın.
6. Bir admin olarak, tüm kullanıcıların projelerini görüp yönetebilmeliyim ki sistemi denetleyebileyim.
7. Bir kullanıcı olarak, sisteme hem bilgisayardan hem telefondan erişebilmeliyim ki her yerden çalışabileyim.

---

## 3. ER Diagram (Veritabanı Tabloları ve İlişkileri)

Sistemde 3 ana tablo vardır: **User, Project, Task.**

```
USER                    PROJECT                    TASK
----------------        --------------------       ----------------------
id (PK)                 id (PK)                    id (PK)
name                    title                      title
email                   owner_id (FK -> User)      status (todo/doing/done)
password                                           project_id (FK -> Project)
role (admin/user)                                  user_id (FK -> User)
```

**İlişkiler:**
- Bir **User**, birden çok **Project** oluşturabilir  →  1 User - Çok Project
- Bir **Project**, birden çok **Task** içerebilir     →  1 Project - Çok Task
- Her **Task**, onu oluşturan **User**'a da bağlıdır.

Hiyerarşi: `User → Project → Task`

Bu ilişkiler Sequelize ORM içinde `hasMany` ve `belongsTo` metotlarıyla tanımlanmıştır.

*(PK = Primary Key / birincil anahtar, FK = Foreign Key / başka tabloya bağlantı)*

---

## 4. API Endpoint Planı

**Kimlik Doğrulama (Auth):**

| Endpoint | Method | Açıklama |
|---|---|---|
| /auth/register | POST | Yeni kullanıcı kaydı |
| /auth/login | POST | Giriş yap (JWT token üretir) |

**Proje İşlemleri:**

| Endpoint | Method | Açıklama |
|---|---|---|
| /projects | GET | Projeleri listele (admin ise tümünü) |
| /projects | POST | Yeni proje oluştur |
| /projects/:id | DELETE | Projeyi (ve görevlerini) sil |

**Görev İşlemleri:**

| Endpoint | Method | Açıklama |
|---|---|---|
| /projects/:projectId/tasks | GET | Projenin görevlerini listele |
| /projects/:projectId/tasks | POST | Projeye görev ekle |
| /tasks/:id | PUT | Görevi güncelle (durum değiştir) |
| /tasks/:id | DELETE | Görevi sil |

*(GET = okuma, POST = ekleme, PUT = güncelleme, DELETE = silme — CRUD mantığı)*

---

## 5. Fake API Planı

Backend hazır olmadan frontend'i test edebilmek için sahte (fake) bir API kullanılabilir.

- **JSON Server** ile basit bir `db.json` dosyası oluşturulup örnek veriler konulabilir.
- Frontend geliştirilirken bu sahte veriler üzerinden istekler test edilir.
- Gerçek backend (Node.js + Express) hazır olunca fake API yerine gerçek API bağlanır.

*Not: Bu projede backend erken tamamlandığı için doğrudan gerçek API ile çalışılmış, fake API aşaması plan olarak tutulmuştur.*

---

## 6. Sistem Mimarisi (Katmanlar)

```
KULLANICI            FRONTEND              BACKEND            VERİTABANI
(Web/Masaüstü/  -->  React /          -->  Node.js +     -->  PostgreSQL
 Mobil)              React Native          Express             (Sequelize ORM)
```

- **Kullanıcı** arayüzle etkileşime girer.
- **Frontend** kullanıcı isteklerini alır, backend'e iletir.
- **Backend** iş mantığını çalıştırır, veritabanıyla konuşur.
- **Veritabanı** verileri kalıcı olarak saklar.

---

## 7. Çok Platformlu Yapı (Multi-Platform)

Sistem üç farklı platformda çalışır ve **hepsi aynı backend'i / veritabanını paylaşır**:

| Platform | Teknoloji | Açıklama |
|---|---|---|
| **Web** | React (Vite) | Tarayıcıda çalışan ana arayüz; Kanban panosu (Vercel'de yayında) |
| **Masaüstü** | Electron | Web uygulamasını masaüstü penceresinde açan, `.exe` olarak paketlenen uygulama |
| **Mobil** | React Native (Expo) | iPhone üzerinde çalışan, aynı backend'e bağlanan mobil uygulama |

Bir platformda eklenen veri (örneğin web'de oluşturulan bir görev), aynı backend paylaşıldığı için
diğer platformlarda (mobil / masaüstü) da görünür.

---

## 8. Güvenlik & Yetkilendirme Tasarımı

- **Şifre Hashleme (bcrypt):** Şifreler düz metin saklanmaz; geri çözülemez şekilde hash'lenir.
- **JWT (JSON Web Token):** Giriş yapan kullanıcıya token verilir; her istekte kimliğini kanıtlar.
- **Rol Bazlı Erişim (admin / user):** admin tüm verileri, normal kullanıcı yalnızca kendi verilerini görür.
- **Rate Limit:** Belirli sürede fazla istek atan engellenir (brute-force / spam koruması).
- **SQL Injection Koruması:** Tüm veritabanı işlemleri Sequelize ORM'in parametreli sorgularıyla yapılır.
- **Gizli Bilgi Yönetimi:** Veritabanı bağlantı adresi `.env` dosyasında tutulur, koda yazılmaz ve GitHub'a gönderilmez.

---

## 9. Bulut Dağıtım (Deploy) Mimarisi

Proje geliştirme aşamasından sonra canlıya (internete) alınmıştır:

| Bileşen | Platform | Açıklama |
|---|---|---|
| **Frontend (Web)** | Vercel | React uygulaması otomatik olarak build edilip yayınlanır |
| **Backend (API)** | Render | Node.js sunucusu bulutta çalışır |
| **Veritabanı** | Render PostgreSQL | Kalıcı, bulut tabanlı veritabanı |

Her üç bileşen de bulutta olduğu için, sistem geliştiricinin bilgisayarı kapalıyken bile
internet üzerinden erişilebilir durumdadır.

---

## 10. Kullanılan Teknolojiler (Özet)

| Katman | Teknoloji |
|---|---|
| Backend | Node.js, Express |
| ORM | Sequelize |
| Veritabanı | PostgreSQL |
| Web | React (Vite) |
| Mobil | React Native (Expo) |
| Masaüstü | Electron (.exe paketleme) |
| Kimlik Doğrulama | JWT |
| Güvenlik | bcrypt, express-rate-limit |
| Dağıtım | Vercel, Render |

---

## 11. Geliştirme Adımları (Özet Yol Haritası)

1. **Analiz & Tasarım:** User story, ER diagram, endpoint planı çıkarıldı.
2. **Backend & Veritabanı:** Express API kuruldu, Sequelize ORM ile veritabanına bağlandı, CRUD yazıldı.
3. **Web & Auth:** React ile Kanban arayüzü yapıldı, JWT giriş/kayıt eklendi.
4. **Güvenlik & Yetkilendirme:** Rol bazlı erişim ve rate limit eklendi.
5. **Çok Platform:** Electron ile masaüstü (.exe), React Native ile mobil uygulama geliştirildi.
6. **Veritabanı Yükseltmesi:** SQLite'tan bulut tabanlı PostgreSQL'e geçildi (ORM sayesinde kolayca).
7. **Dağıtım (Deploy):** Frontend Vercel'e, backend ve veritabanı Render'a alınarak canlıya çıkıldı.
8. **Dokümantasyon & Yayın:** GitHub'a yüklendi, README ve analiz dokümanı hazırlandı.
