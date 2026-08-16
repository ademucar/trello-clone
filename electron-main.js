// ============================================================
//  TRELLO CLONE - MASAÜSTÜ UYGULAMASI (Electron)
//  Uygulama penceresini açıp deploy ettiğim web sitesini yüklüyor.
//  Yani web sürümüyle aynı arayüz, ama .exe olarak çalışıyor.
// ============================================================
const { app, BrowserWindow, shell } = require("electron");

// Yüklenecek adres: web sürümünün canlı adresi.
// İleride değişirse tek yerden düzenleyebileyim diye sabit yaptım.
const SITE_ADRESI = "https://trelloclon.vercel.app";

let win = null;

// Site açılamazsa gösterdiğim yedek ekran.
// Eskiden bağlantı yoksa kullanıcı bomboş beyaz bir pencere görüyordu
// ve neyin yanlış olduğunu anlayamıyordu. Artık açıklama + "Tekrar Dene" var.
const HATA_SAYFASI = `
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <title>Trello Clone - Bağlantı Yok</title>
    <style>
      body {
        margin: 0; height: 100vh; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 14px;
        background: radial-gradient(circle at 20% 20%, #1a1f3a 0%, #0d1025 50%, #060814 100%);
        color: #e0e0e0; font-family: "Segoe UI", Roboto, sans-serif; text-align: center;
      }
      h1 { font-size: 22px; color: #fff; }
      p { color: #8a8fa3; font-size: 14px; max-width: 420px; line-height: 1.6; }
      button {
        margin-top: 10px; padding: 12px 26px; border: none; border-radius: 10px;
        background: linear-gradient(135deg, #5067c5, #7b3fe4);
        color: #fff; font-weight: bold; font-size: 14px; cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div style="font-size:46px">🗂️</div>
    <h1>Uygulamaya ulaşılamadı</h1>
    <p>
      İnternet bağlantın kapalı olabilir ya da sunucu şu an cevap vermiyor.
      Bağlantını kontrol edip tekrar dene.
    </p>
    <button onclick="location.href='${SITE_ADRESI}'">Tekrar Dene</button>
  </body>
</html>`;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 380,        // Pencere okunamayacak kadar küçültülmesin
    minHeight: 500,
    title: "Trello Clone",
    backgroundColor: "#060814", // Yüklenirken beyaz parlama olmasın
    show: false,                // Hazır olmadan gösterme (daha temiz açılış)
    webPreferences: {
      // Güvenlik: Uzaktan yüklenen sayfaya Node.js yetkisi VERMİYORUM.
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Pencere içeriği hazır olunca göster
  win.once("ready-to-show", () => win.show());

  // Sayfa yüklenemezse (internet yok, site kapalı) yedek ekranı gösteriyorum.
  // errorCode -3 "iptal edildi" demek, gerçek bir hata değil; onu atlıyorum.
  win.webContents.on("did-fail-load", (event, errorCode) => {
    if (errorCode === -3) return;
    win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(HATA_SAYFASI));
  });

  // Dış bağlantılar (örn. "Developed by Adem Uçar") uygulamanın içinde değil,
  // kullanıcının kendi tarayıcısında açılsın.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(SITE_ADRESI);
}

// Electron hazır olduğunda pencereyi aç
app.whenReady().then(() => {
  createWindow();

  // Mac'te dock'tan tekrar açılınca pencere yoksa yeniden oluştur
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Tüm pencereler kapanınca uygulamadan çık (Windows/Linux)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
