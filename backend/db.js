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
// .env dosyasını SADECE burada okuyorum. Diğer dosyalar (app.js, server.js,
// make-admin.js) zaten bu dosyayı çağırdığı için ortam değişkenleri onlara da ulaşıyor.
// quiet: dotenv'in her yüklenişte bastığı reklam/ipucu satırlarını kapatıyor;
// bu satırlar sunucu loglarını doldurup gerçek hata mesajını görünmez yapıyordu.
require("dotenv").config({ quiet: true });

const path = require("path");
const { Sequelize, DataTypes } = require("sequelize");

// Adresi temizliyorum: kopyala-yapıştırda başına/sonuna sık sık boşluk,
// tırnak işareti veya satır sonu bulaşıyor. Bunlar adresi geçersiz kılıyor.
const DATABASE_URL = String(process.env.DATABASE_URL || "")
  .trim()
  .replace(/^['"]|['"]$/g, ""); // baştaki/sondaki tırnakları at

// Hangi veritabanını kullandığımı dışarıya bildiriyorum (log ve /health için)
const dialect = DATABASE_URL ? "postgres" : "sqlite";

// Kurulum sırasında bir sorun çıkarsa sebebini burada saklıyorum.
// Uygulamayı çökertmek yerine /health üzerinden bildiriyorum.
let kurulumHatasi = null;

function postgresOlustur() {
  // Adresin biçimini önceden kontrol ediyorum. Böylece bozuk adreste
  // anlaşılmaz bir hata yerine ne yapılması gerektiğini söyleyebiliyorum.
  // (Neon panelinden kopyalarken başına "psql " eklenmesi çok sık oluyor.)
  if (!/^postgres(ql)?:\/\//i.test(DATABASE_URL)) {
    throw new Error(
      'Adres "postgresql://" ile başlamalı. Kopyalarken başına "psql " gibi ' +
        "bir komut veya tırnak karışmış olabilir."
    );
  }

  return new Sequelize(DATABASE_URL, {
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      // Bulut veritabanları (Neon, Render vb.) güvenli (SSL) bağlantı ister
      ssl: { require: true, rejectUnauthorized: false },
    },
    // Bağlantı havuzu: aynı anda kaç bağlantı açık kalsın.
    // Vercel'de (serverless) aynı anda birçok kopya uyanabildiği için
    // kopya başına 2 ile sınırlıyorum; yoksa hepsi birden bağlanıp
    // veritabanının bağlantı limitini doldurabilir.
    // Normal sürekli sunucuda ise 5 bağlantı rahatça yetiyor.
    pool: {
      max: process.env.VERCEL ? 2 : 5,
      min: 0,
      idle: 10000,
      acquire: 30000,
    },
    retry: { max: 3 }, // Anlık kopmalarda 3 kez tekrar dene
  });
}

function sqliteOlustur(dosya) {
  return new Sequelize({
    dialect: "sqlite",
    storage: dosya,
    logging: false,
  });
}

// ============================================================
//  BAĞLANTIYI KUR (çökmeden)
//  ÖNEMLİ: Bu adım try/catch içinde olmalı. Bozuk bir DATABASE_URL,
//  Sequelize'i daha uygulama açılırken patlatıyor ve bu hata modül
//  seviyesinde olduğu için tüm uygulamayı yüklenemez hale getiriyordu.
//  Vercel'de bunun görüntüsü, hiçbir açıklama içermeyen
//  FUNCTION_INVOCATION_FAILED hatasıydı.
//
//  Artık hatayı yakalayıp saklıyorum: uygulama ayağa kalkıyor,
//  /health sorunun ne olduğunu söylüyor, veri işlemleri ise 503 dönüyor.
// ============================================================
let sequelize;
try {
  sequelize = DATABASE_URL
    ? postgresOlustur()                              // BULUT: PostgreSQL
    : sqliteOlustur(path.join(__dirname, "trello.db")); // YEREL: SQLite dosyası
} catch (err) {
  kurulumHatasi = `DATABASE_URL geçersiz: ${err.message}`;
  console.error("[db] " + kurulumHatasi);
  // Tabloları tanımlayabilmek ve uygulamayı ayakta tutabilmek için
  // geçici, hafızada duran bir veritabanı kuruyorum. Buraya veri yazılmaz;
  // istekler zaten 503 dönecek, amaç sadece açıklayıcı hata verebilmek.
  sequelize = sqliteOlustur(":memory:");
}

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
  // Adres en baştan bozuksa bağlanmayı denemenin anlamı yok.
  // Sebebi doğrudan bildiriyorum ki /health sorunu açıkça göstersin.
  if (kurulumHatasi) {
    return { ok: false, dialect, error: kurulumHatasi };
  }

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

// ============================================================
//  BAĞLANTIYI TEK SEFERE İNDİRME (serverless için önemli)
//  Vercel'de sunucu sürekli açık durmaz; istek geldikçe uyanır.
//  Uyanan her kopya bu dosyayı bir kez yükler ve hafızada tutar.
//  Bu yüzden bağlantıyı SÖZ (promise) olarak saklıyorum: aynı kopyaya
//  gelen sonraki istekler tekrar bağlanmaya çalışmaz, hazır bağlantıyı
//  kullanır. Yoksa her istekte yeniden bağlanıp hem yavaşlar hem de
//  veritabanının bağlantı limitini doldururduk.
// ============================================================
let hazirlikSozu = null;

function veritabaniHazirla() {
  if (!hazirlikSozu) {
    hazirlikSozu = connectDatabase().catch((err) => {
      // Bağlantı denemesi tamamen patlarsa sözü sıfırlıyorum ki
      // bir sonraki istek yeniden deneyebilsin (kalıcı olarak kilitlenmesin)
      hazirlikSozu = null;
      return { ok: false, dialect, error: err.message };
    });
  }
  return hazirlikSozu;
}

module.exports = {
  sequelize,
  User,
  Project,
  Task,
  connectDatabase,
  veritabaniHazirla,
  dialect,
};
