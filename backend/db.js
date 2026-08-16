// ============================================================
//  VERİTABANI KATMANI (Sequelize ORM)
//  Bu dosyada veritabanı bağlantımı ve tablolarımı (modellerimi)
//  TEK bir yerde tanımlıyorum. Hem server.js hem make-admin.js
//  buradan alıyor; böylece aynı kodu iki kez yazmıyorum.
//
//  HİBRİT BAĞLANTI:
//   - .env içinde DATABASE_URL varsa  -> PostgreSQL (Render, bulut)
//   - yoksa                           -> SQLite (yerel trello.db dosyası)
//  Amacım: Bulut veritabanı kapansa/süresi dolsa bile proje çalışsın.
// ============================================================
require("dotenv").config();

const path = require("path");
const { Sequelize, DataTypes } = require("sequelize");

const DATABASE_URL = process.env.DATABASE_URL;

// Hangi veritabanını kullandığımı dışarıya bildiriyorum (log ve /health için)
const dialect = DATABASE_URL ? "postgres" : "sqlite";

const sequelize = DATABASE_URL
  ? // --- BULUT: PostgreSQL ---
    new Sequelize(DATABASE_URL, {
      dialect: "postgres",
      logging: false,
      dialectOptions: {
        // Render'ın PostgreSQL'i güvenli (SSL) bağlantı ister
        ssl: { require: true, rejectUnauthorized: false },
      },
      // Bağlantı havuzu: aynı anda kaç bağlantı açık kalsın.
      // Ücretsiz planlarda bağlantı limiti düşük olduğu için küçük tuttum.
      pool: { max: 5, min: 0, idle: 10000, acquire: 30000 },
      retry: { max: 3 }, // Anlık kopmalarda 3 kez tekrar dene
    })
  : // --- YEREL: SQLite (dosya tabanlı, kurulum gerektirmez) ---
    new Sequelize({
      dialect: "sqlite",
      storage: path.join(__dirname, "trello.db"),
      logging: false,
    });

// ============================================================
//  MODELLER (Veritabanı Tabloları)
//  Yapı: User (Kullanıcı) -> Project (Proje) -> Task (Görev)
// ============================================================

// USER tablosu: Kullanıcı bilgilerini tutuyor
const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  // Email benzersiz olmalı. Ayrıca her zaman küçük harf/boşluksuz saklıyorum ki
  // "Ali@x.com" ile kayıt olup "ali@x.com" ile giriş yapınca sorun çıkmasın.
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false }, // bcrypt ile hash'lenmiş hali
  role: { type: DataTypes.STRING, defaultValue: "user" }, // "user" veya "admin"
});

// PROJECT tablosu: Projeleri (Trello'daki board mantığı) tutuyor
const Project = sequelize.define("Project", {
  title: { type: DataTypes.STRING, allowNull: false },
});

// TASK tablosu: Görevleri tutuyor
const Task = sequelize.define("Task", {
  title: { type: DataTypes.STRING, allowNull: false },
  status: {
    type: DataTypes.STRING,
    defaultValue: "todo",
    // Sadece bu 3 değerden biri kabul edilsin (veritabanına çöp veri girmesin)
    validate: { isIn: [["todo", "doing", "done"]] },
  },
});

// ============================================================
//  İLİŞKİLER (ER Diagram'daki bağlantılar)
//  onDelete: "CASCADE" -> Üst kayıt silinince alt kayıtlar da otomatik silinir.
//  Böylece sahibi olmayan "yetim" proje/görev kalmıyor.
// ============================================================
User.hasMany(Project, { foreignKey: "owner_id", onDelete: "CASCADE" });
Project.belongsTo(User, { foreignKey: "owner_id" });

Project.hasMany(Task, { foreignKey: "project_id", onDelete: "CASCADE" });
Task.belongsTo(Project, { foreignKey: "project_id" });

User.hasMany(Task, { foreignKey: "user_id", onDelete: "CASCADE" });
Task.belongsTo(User, { foreignKey: "user_id" });

// ============================================================
//  BAĞLANTIYI KUR + TABLOLARI OLUŞTUR
//  ÖNEMLİ: Bu fonksiyon hata fırlatmaz, sonucu döndürür.
//  Sebebi: Veritabanı kapalıysa sunucunun ÇÖKMESİNİ istemiyorum;
//  ayakta kalıp anlaşılır bir hata mesajı vermesini istiyorum.
//  (Eski koddaki çökme hatasının kaynağı tam olarak buydu.)
// ============================================================
async function connectDatabase() {
  try {
    await sequelize.authenticate(); // Önce gerçekten bağlanabiliyor muyum, onu test ediyorum
    await sequelize.sync();         // Tablolar yoksa oluşturuyorum
    console.log(`[db] Baglanti basarili (${dialect})`);
    return { ok: true, dialect };
  } catch (err) {
    console.error(`[db] BAGLANTI HATASI (${dialect}): ${err.message}`);
    return { ok: false, dialect, error: err.message };
  }
}

module.exports = { sequelize, User, Project, Task, connectDatabase, dialect };
