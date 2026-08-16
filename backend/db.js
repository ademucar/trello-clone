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
    // Bağlantı havuzu: aynı anda en fazla kaç bağlantı açık kalsın.
    // Ücretsiz veritabanı planlarında bağlantı limiti düşük olduğu için
    // küçük tuttum; bu proje için 5 fazlasıyla yetiyor.
    pool: { max: 5, min: 0, idle: 10000, acquire: 30000 },
    retry: { max: 3 }, // Anlık kopmalarda 3 kez tekrar dene
  });
}

function sqliteOlustur(dosya) {
  // Not: SQLite sürücüsü (sqlite3) yerel derlenmiş bir modüldür.
  // Kendi bilgisayarımda sorunsuz çalışır, ancak Vercel gibi sunucusuz
  // ortamlarda bulunmayabilir. Bu yüzden burası her zaman try/catch ile çağrılır.
  return new Sequelize({
    dialect: "sqlite",
    storage: dosya,
    logging: false,
  });
}

// Hiçbir veritabanı kurulamadığında kullandığım "boş" örnek.
// Amacı bağlanmak DEĞİL; sadece model tanımlarının yapılabilmesi ve
// uygulamanın ayağa kalkabilmesi. İstekler zaten 503 dönecek.
// Kasıtlı olarak postgres seçtim: 'pg' sürücüsü saf JavaScript olduğu için
// her ortamda yüklenir. (SQLite'ı yedek yaparsam, sqlite3'ün bulunmadığı
// ortamda yedeğin kendisi de patlıyor ve uygulama hiç açılmıyordu.)
function bosOrnekOlustur() {
  return new Sequelize("postgres://yok:yok@127.0.0.1:5432/yok", {
    dialect: "postgres",
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
    ? postgresOlustur()                                 // BULUT: PostgreSQL
    : sqliteOlustur(path.join(__dirname, "trello.db")); // YEREL: SQLite dosyası
} catch (err) {
  kurulumHatasi = err.message;
  console.error("[db] KURULUM HATASI: " + kurulumHatasi);
  // Uygulama yine de ayağa kalksın diye boş bir örnek kuruyorum.
  // Böylece /health çalışır ve sorunun ne olduğunu söyleyebilir.
  sequelize = bosOrnekOlustur();
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
