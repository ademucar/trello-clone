// ============================================================
//  Bu küçük script, belirttiğim email'e sahip kullanıcıyı admin yapar.
//  Kullanımı:  node make-admin.js ornek@mail.com
//
//  Not: Veritabanı bağlantısını ve User modelini db.js'ten alıyorum;
//  böylece aynı tanımları burada tekrar yazmak zorunda kalmıyorum.
// ============================================================
const { User, sequelize, connectDatabase } = require("./db");

// Email'i komut satırından alıyorum (yoksa kullanıcıya nasıl yazacağını söylüyorum)
const email = String(process.argv[2] || "").trim().toLowerCase();

(async () => {
  if (!email) {
    console.log("Kullanim: node make-admin.js ornek@mail.com");
    process.exit(1);
  }

  // Veritabanına bağlanamazsam anlamlı bir mesaj verip çıkıyorum
  const conn = await connectDatabase();
  if (!conn.ok) {
    console.log("Veritabanina baglanilamadi: " + conn.error);
    process.exit(1);
  }

  const [updatedCount] = await User.update({ role: "admin" }, { where: { email } });

  if (updatedCount > 0) {
    console.log(email + " artik admin!");
  } else {
    console.log(email + " bulunamadi. Once bu email ile kayit ol.");
  }

  await sequelize.close();
})();
