// ============================================================
//  TRELLO CLONE - BACKEND UYGULAMASI (Express)
//  Node.js + Express + Sequelize (ORM) ile yazdım.
//  Yapı: User (Kullanıcı) -> Project (Proje) -> Task (Görev)
//
//  Bu dosyada SADECE uygulamanın kendisi var (adresler, kurallar).
//  Sunucuyu başlatma işi ayrı: server.js (yerel) / api/index.js (Vercel).
//  Veritabanı bağlantısı ve tablolar ise db.js dosyasında.
// ============================================================
// Not: .env okuma işini db.js yapıyor (aşağıda require ediliyor),
// o yüzden burada tekrar çağırmıyorum.
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

// Veritabanı katmanımı (modeller + bağlantı) tek yerden alıyorum
const { User, Project, Task, veritabaniHazirla, dialect } = require("./db");

const app = express();

// ============================================================
//  TEMEL AYARLAR
// ============================================================

// trust proxy: Render/Vercel gibi platformlar isteği bir ara sunucu (proxy)
// üzerinden iletir. Bu ayar olmadan express-rate-limit gerçek IP'yi okuyamaz
// ve hata fırlatır. "1" = önümde 1 tane güvenilir proxy var demek.
app.set("trust proxy", 1);

app.use(cors());          // Frontend farklı adreste olduğu için izin veriyorum
app.use(express.json());  // Gelen JSON verisini okuyabilmek için

// ---- VERİTABANINI HAZIRLA ----
// Her istekten önce bağlantının hazır olduğundan emin oluyorum.
// veritabaniHazirla() sonucu hafızada tuttuğu için bu işlem sadece
// İLK istekte gerçekten çalışır; sonrakiler hazır bağlantıyı kullanır.
//
// Bu adım Vercel için şart: orada sunucu sürekli açık durmaz, istek
// geldiğinde uyanır. Yerelde de zararsız çalışır, tek kod iki ortama yetiyor.
app.use(async (req, res, next) => {
  const sonuc = await veritabaniHazirla();
  app.locals.dbConnected = sonuc.ok;
  app.locals.dbError = sonuc.error || null; // Teşhis için hatayı saklıyorum
  next(); // Bağlantı başarısız olsa bile devam ediyorum:
          // /health yine cevap versin, diğerleri anlaşılır 503 dönsün.
});

// JWT token'larını imzalamak için gizli anahtar.
// Öncelik .env dosyasındaki JWT_SECRET'ta; yoksa yerel geliştirme için
// varsayılan bir değer kullanıyorum (ve uyarı veriyorum).
const SECRET = process.env.JWT_SECRET || "yerel_gelistirme_anahtari_degistir";
if (!process.env.JWT_SECRET) {
  console.warn("[uyari] JWT_SECRET tanimli degil, varsayilan anahtar kullaniliyor.");
}

// ---- GÜVENLİK: RATE LIMIT (İstek Sınırlama) ----
// Amacım: Aşırı istek atıp sunucuyu yormayı (spam/saldırı) engellemek.
// Genel sınırı 600 yaptım: Arayüz her işlemden sonra listeyi yenilediği için
// normal kullanımda bile çok istek gidiyor; eski 100 limiti gerçek
// kullanıcıları da engelliyordu.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Çok fazla istek attınız, lütfen biraz bekleyin." },
  // Sağlık kontrolü isteklerini saymıyorum (Render sürekli ping atıyor)
  skip: (req) => req.path === "/" || req.path === "/health",
});
app.use(limiter);

// Giriş/kayıt için ayrı ve daha sıkı sınır (şifre deneme-yanılma saldırısına karşı).
// skipSuccessfulRequests: Başarılı girişleri saymıyorum, sadece BAŞARISIZ
// denemeleri sayıyorum. Böylece doğru şifreyle giren kullanıcı asla kilitlenmiyor.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Çok fazla başarısız giriş denemesi, lütfen 15 dakika bekleyin." },
});

// ============================================================
//  YARDIMCI FONKSİYONLAR
// ============================================================

// TOKEN KONTROLÜ (auth middleware): Korumalı işlemlerden ÖNCE çalışır.
// Görevi: İsteği atan kişi gerçekten giriş yapmış mı diye kontrol etmek.
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Token yok, giriş yapın" });

  // Token "Bearer XXXXX" formatında gelir, ben sadece XXXXX kısmını ayırıyorum
  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, SECRET); // içinde id, name, role var
    next();
  } catch {
    res.status(401).json({ message: "Geçersiz veya süresi dolmuş token" });
  }
}

// Bir projeye erişim yetkim var mı? Bu kontrolü 3 ayrı yerde kullandığım için
// tek fonksiyona topladım (kod tekrarını önlemek ve kuralı tek yerde tutmak için).
// Yetki varsa projeyi, yoksa null döndürüp uygun hatayı kendisi yazar.
async function getProjectOrFail(req, res) {
  const project = await Project.findByPk(req.params.projectId || req.params.id);
  if (!project) {
    res.status(404).json({ message: "Proje bulunamadı" });
    return null;
  }
  // Kural: Proje bana ait değilse VE admin değilsem erişemem
  if (project.owner_id !== req.user.id && req.user.role !== "admin") {
    res.status(403).json({ message: "Bu projeye erişiminiz yok" });
    return null;
  }
  return project;
}

// Email'i her zaman aynı biçimde saklıyorum: boşlukları at, küçük harfe çevir.
// Böylece "  Ali@X.com " ile kayıt olup "ali@x.com" ile giriş yapmak çalışıyor.
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

// ============================================================
//  SAĞLIK KONTROLÜ
//  Render gibi platformlar sunucunun ayakta olup olmadığını buradan anlar.
//  Ayrıca tarayıcıda adrese girince "Cannot GET /" yerine düzgün cevap görünür.
// ============================================================
function saglikDurumu(req, res) {
  res.json({
    status: "ok",
    service: "trello-clone-backend",
    database: dialect,
    dbConnected: app.locals.dbConnected === true,
    // Bağlantı kurulamadıysa sebebini de yazıyorum. Deploy sonrası sorunu
    // sunucu loglarını kurcalamadan buradan teşhis edebiliyorum.
    dbError: app.locals.dbError || undefined,
  });
}

// İki adrese de aynı cevabı veriyorum:
//  "/"       -> tarayıcıda adrese girince "Cannot GET /" görünmesin
//  "/health" -> Render'ın sağlık kontrolü buraya bakıyor
app.get("/", saglikDurumu);
app.get("/health", saglikDurumu);

// ============================================================
//  KAYIT OLMA (REGISTER)
// ============================================================
app.post("/auth/register", authLimiter, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  // 1) Boş alan kontrolü
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Tüm alanları doldurun" });
  }
  // 2) Email format kontrolü
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: "Geçerli bir email adresi girin" });
  }
  // 3) Şifre uzunluğu kontrolü
  if (String(password).length < 4) {
    return res.status(400).json({ message: "Şifre en az 4 karakter olmalı" });
  }
  // 4) Bu email daha önce kayıt olmuş mu?
  if (await User.findOne({ where: { email } })) {
    return res.status(400).json({ message: "Bu email zaten kayıtlı" });
  }

  // 5) Şifreyi düz metin olarak DEĞİL, bcrypt ile hash'leyerek kaydediyorum
  const hashedPassword = bcrypt.hashSync(String(password), 10);
  const user = await User.create({ name, email, password: hashedPassword });

  res.status(201).json({ message: "Kayıt başarılı", userId: user.id });
});

// ============================================================
//  GİRİŞ YAPMA (LOGIN)
// ============================================================
app.post("/auth/login", authLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ message: "Email ve şifre gerekli" });
  }

  const user = await User.findOne({ where: { email } });
  // Güvenlik için "email mi şifre mi yanlış" demiyorum, ikisini de gizliyorum
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Email veya şifre hatalı" });
  }

  // Şifre doğruysa 7 gün geçerli bir JWT token (kimlik kartı) üretiyorum
  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, name: user.name, role: user.role });
});

// ============================================================
//  PROJE İŞLEMLERİ
// ============================================================

// Projeleri listele. Admin TÜM projeleri, normal kullanıcı SADECE kendininkileri görür.
app.get("/projects", auth, async (req, res) => {
  const isAdmin = req.user.role === "admin";

  const projects = await Project.findAll({
    // Admin değilse sorguyu sadece kendi projeleriyle sınırlıyorum
    where: isAdmin ? undefined : { owner_id: req.user.id },
    // Admin ise projenin sahibinin adını da getiriyorum
    include: isAdmin ? { model: User, attributes: ["name"] } : undefined,
    order: [["id", "ASC"]], // Sıralama sabit olsun, liste her yenilemede zıplamasın
  });

  res.json(
    projects.map((p) => ({
      id: p.id,
      title: p.title,
      owner_id: p.owner_id,
      owner: p.User ? p.User.name : null,
    }))
  );
});

// Yeni proje oluştur
app.post("/projects", auth, async (req, res) => {
  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ message: "Proje adı gerekli" });

  const project = await Project.create({ title, owner_id: req.user.id });
  res.status(201).json(project);
});

// Projeyi sil. Kural: Sadece projenin SAHİBİ veya ADMIN silebilir.
app.delete("/projects/:id", auth, async (req, res) => {
  const project = await getProjectOrFail(req, res);
  if (!project) return; // Hata cevabını yardımcı fonksiyon zaten gönderdi

  // Önce projeye ait görevleri, sonra projeyi siliyorum (yetim görev kalmasın)
  await Task.destroy({ where: { project_id: project.id } });
  await project.destroy();
  res.json({ message: "Proje silindi" });
});

// ============================================================
//  GÖREV İŞLEMLERİ
// ============================================================

// Bir projenin görevlerini listele
app.get("/projects/:projectId/tasks", auth, async (req, res) => {
  const project = await getProjectOrFail(req, res);
  if (!project) return;

  const tasks = await Task.findAll({
    where: { project_id: project.id },
    order: [["id", "ASC"]],
  });
  res.json(tasks);
});

// Bir projeye yeni görev ekle
app.post("/projects/:projectId/tasks", auth, async (req, res) => {
  const project = await getProjectOrFail(req, res);
  if (!project) return;

  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ message: "Görev adı gerekli" });

  const task = await Task.create({
    title,
    status: req.body.status || "todo", // Durum belirtilmezse varsayılan "todo"
    project_id: project.id,
    user_id: req.user.id,
  });
  res.status(201).json(task);
});

// Görevi güncelle (örn. durumunu todo'dan doing'e taşımak)
app.put("/tasks/:id", auth, async (req, res) => {
  const task = await Task.findByPk(req.params.id);
  if (!task) return res.status(404).json({ message: "Görev bulunamadı" });

  if (task.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Bu görev size ait değil" });
  }

  // Yeni değer gelmişse onu kullan, gelmemişse eskisini koru
  if (req.body.title !== undefined) {
    const title = String(req.body.title).trim();
    if (title) task.title = title;
  }
  if (req.body.status !== undefined) task.status = req.body.status;

  await task.save();
  res.json(task);
});

// Görevi sil. Kural: Görevin sahibi veya admin silebilir.
app.delete("/tasks/:id", auth, async (req, res) => {
  const task = await Task.findByPk(req.params.id);
  if (!task) return res.status(404).json({ message: "Görev bulunamadı" });

  if (task.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Bu görev size ait değil" });
  }

  await task.destroy();
  res.json({ message: "Görev silindi" });
});

// ============================================================
//  HATA YAKALAMA
//  Bunlar EN SONDA olmalı; kendilerinden önceki hiçbir adrese
//  uymayan istekler buraya düşer.
// ============================================================

// Olmayan bir adrese istek atılırsa
app.use((req, res) => {
  res.status(404).json({ message: "Böyle bir adres yok" });
});

// Herhangi bir yerde beklenmedik bir hata olursa (örn. veritabanı kopması).
// Bu olmadan hata cevabı HTML olarak dönüyor ve arayüz onu okuyamıyordu.
app.use((err, req, res, _next) => {
  console.error("[hata]", err.message);

  // Aynı email ile 2. kez kayıt gibi veritabanı kural ihlalleri
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({ message: "Bu kayıt zaten mevcut" });
  }
  // Geçersiz veri gönderilmişse (örn. status alanına "todo/doing/done" dışında bir değer).
  // Bu bir sunucu hatası değil, kullanıcı hatasıdır; o yüzden 400 dönüyorum.
  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({ message: "Gönderilen veri geçersiz" });
  }
  // Veritabanına ulaşılamıyorsa kullanıcıya anlaşılır mesaj veriyorum
  if (err.name && err.name.startsWith("SequelizeConnection")) {
    return res.status(503).json({ message: "Veritabanına şu an ulaşılamıyor, tekrar deneyin" });
  }

  res.status(500).json({ message: "Sunucuda beklenmedik bir hata oluştu" });
});

// ============================================================
//  SÜREÇ SEVİYESİ HATA YAKALAMA
//  Bunlar app.js'te olmak ZORUNDA. Daha önce sadece server.js'te vardı,
//  yani Vercel'de hiç devreye girmiyorlardı (orada server.js çalışmıyor).
//
//  Neden önemli: Express'in hata yakalayıcısı sadece istek İÇİNDEKİ
//  hataları yakalar. İstek dışında oluşan bir hata (örn. veritabanı
//  bağlantısının boşta kopması) yakalanmazsa Node sürecini komple
//  öldürür; Vercel'de bunun karşılığı FUNCTION_INVOCATION_FAILED olur.
//  Burada yakalayıp loglayarak fonksiyonun ayakta kalmasını sağlıyorum.
// ============================================================
process.on("unhandledRejection", (err) =>
  console.error("[unhandledRejection]", err?.message || err)
);
process.on("uncaughtException", (err) =>
  console.error("[uncaughtException]", err?.message || err)
);

// Bu dosya sunucuyu BAŞLATMIYOR, sadece hazır uygulamayı dışa veriyor.
// Sebebi: iki farklı ortamda çalışması gerekiyor.
//   - server.js      -> yereldeki normal sunucu (app.listen ile)
//   - api/index.js   -> Vercel (serverless; orada listen yapılmaz)
// Böylece iki ortam da aynı kodu paylaşıyor, tek satır bile kopyalamıyorum.
module.exports = app;
