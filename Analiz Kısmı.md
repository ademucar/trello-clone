# AKILLI GÖREV & PROJE YÖNETİM SİSTEMİ (TRELLO CLONE)
## STEP 1 – ANALİZ & TASARIM

---

## 1. Trello / Jira Analizi

Trello ve Jira, ekiplerin görevlerini takip etmek için kullandığı proje yönetim araçlarıdır.

**Trello'da iş mantığı:**
- Her proje bir **Board** (pano) olur.
- Her board içinde **liste**ler vardır: `To Do`, `Doing`, `Done`
- Her listede **kart**lar olur, bu kartlar görevleri temsil eder.
- Kartlar listeler arasında **sürükle-bırak / taşıma** ile hareket eder (bir görev bitince "Doing"den "Done"a taşınır).

**Bizim projemizdeki karşılığı:**
- Bir kullanıcı bir veya birden fazla **Project** (proje/board) oluşturur.
- Her projenin içinde **Task**'lar (görevler) olur.
- Her Task'ın bir **status**ü olur: `todo`, `doing`, `done`
- Görevler bu üç durum arasında taşınır.

---

## 2. User Story (Kullanıcı Hikayeleri)

User story, kullanıcının sistemden ne istediğini basit bir cümleyle anlatmaktır. Format:

> **Bir [kullanıcı tipi] olarak, [ne yapmak istiyorum] çünkü [neden].**

**Örnek user story'ler:**

1. Bir kullanıcı olarak, kayıt olup giriş yapabilmeliyim ki sistemi güvenli şekilde kullanabileyim.
2. Bir kullanıcı olarak, yeni bir proje oluşturabilmeliyim ki görevlerimi farklı panolarda gruplayabileyim.
3. Bir kullanıcı olarak, bir projeye görev (task) ekleyebilmeliyim ki yapılacakları takip edebileyim.
4. Bir kullanıcı olarak, bir görevin durumunu (todo/doing/done) değiştirebilmeliyim ki ilerlemeyi gösterebileyim.
5. Bir kullanıcı olarak, sadece kendi projelerimi ve görevlerimi görebilmeliyim ki verilerim bana özel kalsın.
6. Bir admin olarak, tüm kullanıcıların projelerini ve görevlerini görüp yönetebilmeliyim ki sistemi kontrol edebileyim.

---

## 3. ER Diagram (Tablo İlişkileri)

ER diagram, veritabanındaki tabloların birbiriyle ilişkisini gösteren şemadır. Projede 3 ana tablo var: **User, Project, Task.**

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
- Bir **User**, birden çok **Project** oluşturabilir → 1 User - Çok Project
- Bir **Project**, birden çok **Task** içerebilir → 1 Project - Çok Task
- Her **Task** aynı zamanda onu oluşturan **User**'a da bağlıdır.

Yani hiyerarşi: `User → Project → Task`

Bu ilişkiler Sequelize ORM içinde `hasMany` ve `belongsTo` metotlarıyla tanımlanmıştır.

*(PK = Primary Key / birincil anahtar, FK = Foreign Key / başka tabloya bağlantı)*

---

## 4. API Endpoint Planı

API endpoint'leri, frontend'in backend'e istek göndermek için kullandığı adreslerdir.

**Kimlik doğrulama (Auth):**

| Endpoint | Method | Ne işe yarar |
|---|---|---|
| /auth/register | POST | Yeni kullanıcı kaydı |
| /auth/login | POST | Giriş yapma (JWT token üretir) |

**Proje işlemleri:**

| Endpoint | Method | Ne işe yarar |
|---|---|---|
| /projects | GET | Kullanıcının projelerini listele (admin ise tümünü) |
| /projects | POST | Yeni proje oluştur |
| /projects/:id | DELETE | Projeyi (ve içindeki görevleri) sil |

**Görev işlemleri:**

| Endpoint | Method | Ne işe yarar |
|---|---|---|
| /projects/:projectId/tasks | GET | Bir projenin görevlerini listele |
| /projects/:projectId/tasks | POST | Projeye yeni görev ekle |
| /tasks/:id | PUT | Görevi güncelle (status değiştirme) |
| /tasks/:id | DELETE | Görevi sil |

*(GET = okuma, POST = ekleme, PUT = güncelleme, DELETE = silme — CRUD mantığı)*

---

## 5. Fake API Planı

Backend hazır olmadan frontend'i test edebilmek için sahte (fake) bir API kullanılabilir.

**Plan:**
- **JSON Server** ile basit bir `db.json` dosyası oluşturulup içine örnek user, project, task verileri konur.
- Frontend geliştirilirken bu sahte veriler üzerinden GET/POST istekleri test edilir.
- Gerçek backend (Node.js + Express) hazır olunca fake API'nin yerine gerçek API bağlanır.

**Not:** Bu projede backend erken tamamlandığı için doğrudan gerçek API ile çalışıldı; fake API aşaması planlı tutuldu.

**Örnek db.json:**
```json
{
  "users": [
    { "id": 1, "name": "Ahmet", "email": "ahmet@test.com" }
  ],
  "projects": [
    { "id": 1, "title": "Web Sitesi Projesi", "owner_id": 1 }
  ],
  "tasks": [
    { "id": 1, "title": "Tasarımı bitir", "status": "doing", "project_id": 1, "user_id": 1 }
  ]
}
```

---

## Kullanılan Teknolojiler

- **Backend:** Node.js + Express
- **ORM:** Sequelize (SQL sorguları yerine model tabanlı veritabanı yönetimi)
- **Veritabanı:** SQLite (SQL tabanlı; kurulum kolaylığı için tercih edildi. Sequelize sayesinde PostgreSQL'e de kolayca geçiş yapılabilir, aynı SQL mantığı)
- **Frontend:** React (Vite)
- **Kimlik doğrulama:** JWT (JSON Web Token)
- **Güvenlik:** bcrypt ile şifre hashleme, express-rate-limit ile istek sınırlama (brute-force koruması)
- **Yetkilendirme:** Role-based access (admin / user)

---

## Özet

Bu aşamada kod yazılmadan önce sistemin nasıl çalışacağı planlandı:
- Trello mantığı incelendi (proje → liste → kart)
- Kullanıcı ihtiyaçları (user story) yazıldı
- Veritabanı tabloları ve ilişkileri (ER diagram: User, Project, Task) belirlendi
- API yolları (endpoint) listelendi
- Frontend'i test etmek için fake API planı yapıldı

Sonraki adımlar bu plana göre backend (Express + Sequelize ORM), frontend (React), kimlik doğrulama (JWT) ve güvenlik katmanlarının geliştirilmesidir.
