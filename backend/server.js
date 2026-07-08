// .env dosyasındaki gizli bilgileri (veritabanı adresi) okuyorum. EN ÜSTTE olmalı.
require("dotenv").config();

// ============================================================
//  TRELLO CLONE - BACKEND (Sunucu Tarafı)
//  Node.js + Express + Sequelize (ORM) ile yazdım.
//  Yapı: User (Kullanıcı) -> Project (Proje) -> Task (Görev)
//  Veritabanı olarak PostgreSQL kullanıyorum (Render'da, bulutta).
// ============================================================

// --- Kullandığım hazır kütüphaneleri (paketleri) çağırıyorum ---
const express = require("express");            // Sunucuyu ve API adreslerini kurmak için
const cors = require("cors");                  // Frontend'in (farklı port) backend'e bağlanmasına izin vermek için
const bcrypt = require("bcryptjs");            // Şifreleri güvenli şekilde şifrelemek (hash) için
const jwt = require("jsonwebtoken");           // Giriş yapınca kimlik kartı (token) üretmek için
const rateLimit = require("express-rate-limit"); // Çok fazla istek atan kişileri sınırlamak için
const { Sequelize, DataTypes } = require("sequelize"); // ORM: SQL yazmadan veritabanı yönetmek için

// Express uygulamamı başlatıyorum
const app = express();

// cors: frontend (localhost:5173) ile backend (localhost:3000) farklı adreslerde
// olduğu için, tarayıcı normalde bağlantıyı engeller. cors bu izni veriyor.
app.use(cors());

// express.json: gelen isteklerin içindeki JSON verisini okuyabilmem için gerekli
app.use(express.json());

// ---- GÜVENLİK: RATE LIMIT (İstek Sınırlama) ----
// Amacım: Bir kişinin sisteme aşırı istek atıp onu yormasını (spam/saldırı) engellemek.
// windowMs = zaman penceresi (15 dakika), max = bu sürede izin verilen istek sayısı.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100,                 // 15 dakikada en fazla 100 istek
  message: { message: "Çok fazla istek attınız, lütfen biraz bekleyin." },
});
app.use(limiter); // Bu sınırı tüm sisteme uyguladım

// Giriş ve kayıt için ayrı, DAHA SIKI bir sınır koydum.
// Sebebi: Birisi şifre kırmaya çalışırsa (deneme yanılma / brute-force),
// 15 dakikada sadece 10 deneme yapabilsin, fazlası engellensin.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Çok fazla giriş denemesi, lütfen 15 dakika bekleyin." },
});

// JWT token'larını imzalamak için kullandığım gizli anahtar.
// (Not: Gerçek/büyük projelerde bu anahtar .env dosyasında saklanır,
//  koda açık yazılmaz. Bu öğrenci projesinde sadelik için burada tuttum.)
const SECRET = "benim_gizli_anahtarim_123";

// ============================================================
//  SEQUELIZE (ORM) KURULUMU
//  ORM sayesinde "SELECT * FROM..." gibi SQL cümleleri yazmıyorum;
//  onun yerine JavaScript koduyla (User.findAll gibi) veritabanını yönetiyorum.
//  Bu hem daha okunaklı hem de SQL injection saldırılarına karşı güvenli.
//
//  Veritabanı adresini güvenlik için koda yazmıyorum; .env dosyasından
//  (DATABASE_URL) okuyorum. Böylece gizli bilgi GitHub'a sızmaz.
// ============================================================
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",     // Veritabanı türüm PostgreSQL
  logging: false,          // Konsolda SQL loglarını kapattım (ekran temiz kalsın)
  dialectOptions: {
    // Render'ın PostgreSQL'i güvenli (SSL) bağlantı ister. Bu ayar onu sağlıyor.
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

// ============================================================
//  MODELLER (Veritabanı Tabloları)
//  Her model bir tabloya karşılık gelir. Alanları (kolonları) burada tanımladım.
// ============================================================

// USER tablosu: Kullanıcı bilgilerini tutuyor
const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },              // Ad soyad (boş olamaz)
  email: { type: DataTypes.STRING, allowNull: false, unique: true }, // Email (benzersiz olmalı, aynı email 2 kez kayıt olamaz)
  password: { type: DataTypes.STRING, allowNull: false },          // Şifre (hash'lenmiş halde saklanır)
  role: { type: DataTypes.STRING, defaultValue: "user" },          // Yetki: varsayılan "user", yönetici ise "admin"
});

// PROJECT tablosu: Projeleri (Trello'daki board mantığı) tutuyor
const Project = sequelize.define("Project", {
  title: { type: DataTypes.STRING, allowNull: false }, // Proje adı
});

// TASK tablosu: Görevleri tutuyor
const Task = sequelize.define("Task", {
  title: { type: DataTypes.STRING, allowNull: false },      // Görev başlığı
  status: { type: DataTypes.STRING, defaultValue: "todo" }, // Durum: todo / doing / done (varsayılan todo)
});

// ============================================================
//  İLİŞKİLER (ER Diagram'daki bağlantılar)
//  Tabloların birbirine nasıl bağlandığını burada tanımladım.
// ============================================================

// Bir kullanıcının BİRDEN ÇOK projesi olabilir (1 User - Çok Project)
User.hasMany(Project, { foreignKey: "owner_id" });
Project.belongsTo(User, { foreignKey: "owner_id" }); // Her proje bir kullanıcıya (sahibine) bağlı

// Bir projenin BİRDEN ÇOK görevi olabilir (1 Project - Çok Task)
Project.hasMany(Task, { foreignKey: "project_id" });
Task.belongsTo(Project, { foreignKey: "project_id" }); // Her görev bir projeye bağlı

// Her görev, onu oluşturan kullanıcıya da bağlı (kim ekledi bilgisi için)
User.hasMany(Task, { foreignKey: "user_id" });
Task.belongsTo(User, { foreignKey: "user_id" });

// Tanımladığım modellere göre tabloları veritabanında otomatik oluşturuyorum (yoksa)
sequelize.sync();

// ============================================================
//  YARDIMCI FONKSİYON: TOKEN KONTROLÜ (auth middleware)
//  Bu fonksiyonu, korumalı işlemlerden ÖNCE çalıştırıyorum.
//  Görevi: İsteği atan kişi gerçekten giriş yapmış mı diye kontrol etmek.
// ============================================================
function auth(req, res, next) {
  // İsteğin başlığında (header) token var mı diye bakıyorum
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Token yok, giriş yapın" });

  // Token "Bearer XXXXX" formatında gelir, ben sadece XXXXX kısmını ayırıyorum
  const token = authHeader.split(" ")[1];
  try {
    // Token'ı gizli anahtarımla doğruluyorum. Geçerliyse içindeki kullanıcı bilgisini alıyorum.
    req.user = jwt.verify(token, SECRET); // req.user içinde artık id, name, role var
    next(); // Her şey yolundaysa, asıl işleme devam et
  } catch (err) {
    // Token sahte veya süresi dolmuşsa erişimi reddediyorum
    res.status(401).json({ message: "Geçersiz token" });
  }
}

// ============================================================
//  KAYIT OLMA (REGISTER)
//  authLimiter: Bu adrese de sıkı istek sınırı uyguladım.
// ============================================================
app.post("/auth/register", authLimiter, async (req, res) => {
  const { name, email, password } = req.body;

  // 1) Boş alan kontrolü: hepsi dolu mu?
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Tüm alanları doldurun" });
  }

  // 2) Email format kontrolü: içinde "@" ve "." var mı, geçerli bir email mi?
  const emailGecerli = /^\S+@\S+\.\S+$/.test(email);
  if (!emailGecerli) {
    return res.status(400).json({ message: "Geçerli bir email adresi girin" });
  }

  // 3) Şifre uzunluğu kontrolü: en az 4 karakter olsun
  if (password.length < 4) {
    return res.status(400).json({ message: "Şifre en az 4 karakter olmalı" });
  }

  // 4) Bu email daha önce kayıt olmuş mu diye kontrol ediyorum
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return res.status(400).json({ message: "Bu email zaten kayıtlı" });
  }

  // 5) Şifreyi düz metin OLARAK DEĞİL, bcrypt ile hash'leyerek (şifreleyerek) kaydediyorum.
  const hashedPassword = bcrypt.hashSync(password, 10);

  // 6) Yeni kullanıcıyı ORM ile oluşturuyorum
  const user = await User.create({ name, email, password: hashedPassword });
  res.status(201).json({ message: "Kayıt başarılı", userId: user.id });
});

// ============================================================
//  GİRİŞ YAPMA (LOGIN)
// ============================================================
app.post("/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  // Girilen email'e sahip kullanıcıyı buluyorum
  const user = await User.findOne({ where: { email } });
  // Kullanıcı yoksa, güvenlik için "email mi şifre mi yanlış" demiyorum, ikisini de gizliyorum
  if (!user) return res.status(400).json({ message: "Email veya şifre hatalı" });

  // Girilen şifreyi, veritabanındaki hash'li şifreyle karşılaştırıyorum
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(400).json({ message: "Email veya şifre hatalı" });

  // Şifre doğruysa, kullanıcıya 7 gün geçerli bir JWT token (kimlik kartı) üretiyorum.
  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    SECRET,
    { expiresIn: "7d" } // 7 gün sonra token geçersiz olur, tekrar giriş gerekir
  );

  res.json({ token, name: user.name, role: user.role });
});

// ============================================================
//  PROJE İŞLEMLERİ
// ============================================================

// Projeleri listele. Admin TÜM projeleri, normal kullanıcı SADECE kendi projelerini görür.
app.get("/projects", auth, async (req, res) => {
  let projects;
  if (req.user.role === "admin") {
    // Admin ise: tüm projeleri, her projenin sahibinin adıyla birlikte getiriyorum
    projects = await Project.findAll({
      include: { model: User, attributes: ["name"] },
    });
    projects = projects.map((p) => ({
      id: p.id,
      title: p.title,
      owner_id: p.owner_id,
      owner: p.User ? p.User.name : null,
    }));
  } else {
    // Normal kullanıcı ise: sadece kendi oluşturduğu projeleri getiriyorum
    projects = await Project.findAll({ where: { owner_id: req.user.id } });
  }
  res.json(projects);
});

// Yeni proje oluştur (giriş yapan kullanıcıya ait olarak)
app.post("/projects", auth, async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ message: "Proje adı gerekli" });
  const project = await Project.create({ title, owner_id: req.user.id });
  res.status(201).json(project);
});

// Projeyi sil. Kural: Sadece projenin SAHİBİ veya ADMIN silebilir.
app.delete("/projects/:id", auth, async (req, res) => {
  const project = await Project.findByPk(req.params.id);
  if (!project) return res.status(404).json({ message: "Proje bulunamadı" });

  // Yetki kontrolü: Bu proje bana ait değilse VE ben admin de değilsem, izin verme
  if (project.owner_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Bu proje size ait değil" });
  }

  // Önce projeye ait tüm görevleri sil, sonra projeyi sil (yetim görev kalmasın)
  await Task.destroy({ where: { project_id: project.id } });
  await project.destroy();
  res.json({ message: "Proje silindi" });
});

// ============================================================
//  GÖREV İŞLEMLERİ
// ============================================================

// Bir projenin görevlerini listele
app.get("/projects/:projectId/tasks", auth, async (req, res) => {
  const project = await Project.findByPk(req.params.projectId);
  if (!project) return res.status(404).json({ message: "Proje bulunamadı" });

  // Yetki kontrolü: proje bana ait değilse ve admin değilsem erişimi engelle
  if (project.owner_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Bu projeye erişiminiz yok" });
  }

  const tasks = await Task.findAll({ where: { project_id: req.params.projectId } });
  res.json(tasks);
});

// Bir projeye yeni görev ekle
app.post("/projects/:projectId/tasks", auth, async (req, res) => {
  const project = await Project.findByPk(req.params.projectId);
  if (!project) return res.status(404).json({ message: "Proje bulunamadı" });

  if (project.owner_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Bu projeye erişiminiz yok" });
  }

  const { title, status } = req.body;
  const task = await Task.create({
    title,
    status: status || "todo", // Durum belirtilmezse varsayılan "todo"
    project_id: req.params.projectId,
    user_id: req.user.id,
  });
  res.status(201).json(task);
});

// Görevi güncelle (örneğin durumunu todo'dan doing'e taşımak).
// Kural: Görevin sahibi veya admin yapabilir.
app.put("/tasks/:id", auth, async (req, res) => {
  const task = await Task.findByPk(req.params.id);
  if (!task) return res.status(404).json({ message: "Görev bulunamadı" });

  if (task.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Bu görev size ait değil" });
  }

  // Yeni değer gelmişse onu kullan, gelmemişse eskisini koru
  task.title = req.body.title || task.title;
  task.status = req.body.status || task.status;
  await task.save(); // Değişikliği veritabanına kaydet
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
//  SUNUCUYU BAŞLAT
//  process.env.PORT: Deploy edildiğinde (Render'da) sunucu portunu Render belirler.
//  O yüzden önce Render'ın verdiği portu, o yoksa 3000'i kullanıyorum.
//  "0.0.0.0": Telefonun (mobil) da yerel ağdan bağlanabilmesi için.
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Sunucu çalışıyor. Port: " + PORT);
});