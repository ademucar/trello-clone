// Electron ana dosyası. Masaüstü uygulama penceresini oluşturur.
const { app, BrowserWindow } = require("electron");

function createWindow() {
  // Bir uygulama penceresi oluşturdum
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Trello Clone",
  });

  // React sitemi (Vite dev sunucusu) bu pencerede açtım
  win.loadURL("http://localhost:5173");
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