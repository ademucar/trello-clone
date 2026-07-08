// Bu küçük script, belirttiğim email'e sahip kullanıcıyı admin yapar.
// Sadece bir kez çalıştırmak için yazdım. Artık PostgreSQL kullanıyorum.
require("dotenv").config(); // veritabanı adresini .env'den okuyorum

const { Sequelize, DataTypes } = require("sequelize");

// server.js'teki ile aynı veritabanına bağlanıyorum (PostgreSQL, Render)
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
});

// User modelini burada da tanımlıyorum (server.js'teki ile aynı)
const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: "user" },
});

// Buraya admin yapmak istediğim email'i yazıyorum:
const email = "adem@test.com";

// Asıl işlem: o email'e sahip kullanıcının rolünü "admin" yapıyorum
(async () => {
  const [updatedCount] = await User.update(
    { role: "admin" },
    { where: { email } }
  );

  if (updatedCount > 0) {
    console.log(email + " artik admin!");
  } else {
    console.log(email + " bulunamadi. Once bu email ile kayit ol.");
  }

  await sequelize.close(); // bağlantıyı kapat
})();