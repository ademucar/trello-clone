// ============================================================
//  TRELLO CLONE - WEB ARAYÜZÜ (Frontend)
//  React ile yazdım. Akış: Giriş -> Proje Listesi -> Seçili Projenin Kanban Panosu
//  Backend ile konuşma işini api.js dosyasına ayırdım, burada sadece ekran var.
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { istek, oturumOku, oturumYaz } from "./api";
import "./App.css";

// Kanban kolonlarım: anahtar, başlık, ikon ve renk
const COLUMNS = [
  { key: "todo", title: "Yapılacak", icon: "📋", color: "#eb5a46" },
  { key: "doing", title: "Yapılıyor", icon: "⚙️", color: "#f2d600" },
  { key: "done", title: "Bitti", icon: "✅", color: "#61bd4f" },
];

function App() {
  // --- Oturum bilgisi ---
  // Başlangıç değerini localStorage'dan okuyorum: sayfa yenilenince
  // kullanıcı giriş ekranına düşmüyor, kaldığı yerden devam ediyor.
  const [oturum, setOturum] = useState(() => oturumOku());
  const token = oturum?.token || null;

  // --- Projeler ve görevler ---
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");

  // --- Giriş/Kayıt formu ---
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- Ekran durumu ---
  const [error, setError] = useState("");       // Kullanıcıya gösterilen mesaj
  const [yukleniyor, setYukleniyor] = useState(false); // Bir istek sürüyor mu?
  const [yavas, setYavas] = useState(false);    // İstek uzun sürüyor mu? (sunucu uyanıyor)

  // Çıkış: tüm bilgileri hem ekrandan hem tarayıcı hafızasından siliyorum
  const handleLogout = useCallback(() => {
    oturumYaz(null);
    setOturum(null);
    setProjects([]);
    setSelectedProject(null);
    setTasks([]);
    setEmail("");
    setPassword("");
    setName("");
    setError("");
  }, []);

  // ============================================================
  //  TÜM İSTEKLERİN GEÇTİĞİ ORTAK NOKTA
  //  Yükleniyor durumu, hata gösterimi ve 401'de otomatik çıkış
  //  gibi işleri burada bir kez hallediyorum.
  // ============================================================
  const cagir = useCallback(
    async (yol, secenek = {}) => {
      setError("");
      setYukleniyor(true);

      // Render'ın ücretsiz sunucusu uykudaysa ilk istek ~50 saniye sürebiliyor.
      // 4 saniyeyi geçerse kullanıcıya "bekle, uyanıyor" diye bilgi veriyorum;
      // yoksa ekran donmuş sanılıyor.
      const sayac = setTimeout(() => setYavas(true), 4000);

      try {
        return await istek(yol, { ...secenek, token });
      } catch (hata) {
        // Token süresi dolmuş veya geçersizse kullanıcıyı giriş ekranına alıyorum
        if (hata.durum === 401 && token) {
          handleLogout();
          setError("Oturumun sona erdi, lütfen tekrar giriş yap.");
        } else {
          setError(hata.message);
        }
        return null; // Çağıran taraf null görünce işlemi sessizce bırakır
      } finally {
        clearTimeout(sayac);
        setYavas(false);
        setYukleniyor(false);
      }
    },
    [token, handleLogout]
  );

  // ---------- VERİ ÇEKME ----------

  const fetchProjects = useCallback(async () => {
    const veri = await cagir("/projects");
    // Array.isArray kontrolü: sunucu beklenmedik bir şey dönerse .map() patlamasın
    if (Array.isArray(veri)) setProjects(veri);
  }, [cagir]);

  const fetchTasks = useCallback(async () => {
    if (!selectedProject) return;
    const veri = await cagir(`/projects/${selectedProject.id}/tasks`);
    if (Array.isArray(veri)) setTasks(veri);
  }, [cagir, selectedProject]);

  // Giriş yapılınca projeleri, proje seçilince görevleri otomatik çekiyorum
  useEffect(() => {
    if (token) fetchProjects();
  }, [token, fetchProjects]);

  useEffect(() => {
    if (selectedProject) fetchTasks();
    else setTasks([]); // Projeden çıkınca eski görevler ekranda kalmasın
  }, [selectedProject, fetchTasks]);

  // ---------- GİRİŞ / KAYIT ----------

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) {
      setError("Lütfen tüm alanları doldur.");
      return;
    }
    const veri = await cagir("/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
    if (veri) {
      setIsRegister(false);   // Kayıt olunca giriş ekranına dön
      setPassword("");
      setError("Kayıt başarılı! Şimdi giriş yapabilirsin.");
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Email ve şifre gerekli.");
      return;
    }
    const veri = await cagir("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (veri?.token) {
      const yeni = { token: veri.token, name: veri.name, role: veri.role };
      oturumYaz(yeni); // Tarayıcıya kaydet ki yenilemede kaybolmasın
      setOturum(yeni);
      setPassword("");
    }
  }

  // ---------- PROJE İŞLEMLERİ ----------

  async function addProject() {
    const baslik = newProjectTitle.trim();
    if (!baslik) return; // Boş isimle proje oluşturmayı engelliyorum

    const veri = await cagir("/projects", { method: "POST", body: { title: baslik } });
    if (veri) {
      setNewProjectTitle("");
      fetchProjects();
    }
  }

  async function deleteProject(id) {
    // Yanlışlıkla tıklamada proje ve tüm görevleri gitmesin diye onay soruyorum
    if (!window.confirm("Bu proje ve içindeki tüm görevler silinecek. Emin misin?")) return;

    const veri = await cagir(`/projects/${id}`, { method: "DELETE" });
    if (veri) fetchProjects();
  }

  // ---------- GÖREV İŞLEMLERİ ----------

  async function addTask() {
    const baslik = newTitle.trim();
    if (!baslik) return;

    const veri = await cagir(`/projects/${selectedProject.id}/tasks`, {
      method: "POST",
      body: { title: baslik, status: "todo" },
    });
    if (veri) {
      setNewTitle("");
      fetchTasks();
    }
  }

  async function moveTask(id, newStatus) {
    // Görevi önce ekranda anında taşıyorum (kullanıcı beklemesin),
    // sonra sunucudan gelen gerçek listeyle tazeliyorum.
    setTasks((eski) => eski.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));

    const veri = await cagir(`/tasks/${id}`, { method: "PUT", body: { status: newStatus } });
    // İstek başarısızsa ekranı gerçek duruma geri döndürüyorum
    fetchTasks();
    return veri;
  }

  async function deleteTask(id) {
    const veri = await cagir(`/tasks/${id}`, { method: "DELETE" });
    if (veri) fetchTasks();
  }

  // ============================================================
  //  EKRAN 1: GİRİŞ YAPILMAMIŞSA -> Giriş / Kayıt ekranı
  // ============================================================
  if (!token) {
    return (
      <div className="giris-ekran">
        <div className="giris-kart">
          <div className="giris-baslik">
            <div className="logo">🗂️</div>
            <h2>Trello Clone</h2>
            <p>{isRegister ? "Yeni hesap oluştur" : "Devam etmek için giriş yap"}</p>
          </div>

          {/* Enter tuşuyla da gönderilebilsin diye gerçek bir form kullanıyorum */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isRegister) handleRegister();
              else handleLogin();
            }}
          >
            {/* Kayıt modundaysa ad-soyad kutusunu da gösteriyorum */}
            {isRegister && (
              <input
                className="alan"
                placeholder="Ad Soyad"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <input
              className="alan"
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="alan"
              type="password"
              placeholder="Şifre"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {yavas && <div className="uyari-serit">Sunucu uyanıyor, biraz sürebilir...</div>}

            {error && (
              <div className={`mesaj ${error.includes("başarılı") ? "basarili" : ""}`}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-mor btn-blok" disabled={yukleniyor}>
              {yukleniyor ? "Lütfen bekle..." : isRegister ? "Kayıt Ol" : "Giriş Yap"}
            </button>
          </form>

          <div className="gecis-linki">
            {isRegister ? "Zaten hesabın var mı? " : "Hesabın yok mu? "}
            <span onClick={() => { setIsRegister(!isRegister); setError(""); }}>
              {isRegister ? "Giriş yap" : "Kayıt ol"}
            </span>
          </div>
        </div>

        <div className="gelistirici">
          <p>
            Developed by{" "}
            <a href="https://ademucar.com.tr/" target="_blank" rel="noopener noreferrer">
              Adem Uçar
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Üst bar: iki ekranda da ortak olduğu için tek yerde tanımladım.
  // (Eskiden bu, App'in İÇİNDE bileşen olarak tanımlıydı; her render'da
  // yeni bir bileşen sayıldığı için React onu tamamen yeniden kuruyordu.
  // Artık sadece bir JSX parçası döndüren fonksiyon, bu sorun yok.)
  const ustBar = (
    <div className="ust-bar">
      <h1>
        <span>🗂️</span> Trello Clone
      </h1>
      <div className="ust-bar-sag">
        <span>
          Merhaba, <strong style={{ color: "var(--renk-acik-mavi)" }}>{oturum.name}</strong>
          {oturum.role === "admin" && <span className="rozet-admin">ADMIN</span>}
        </span>
        <button className="btn btn-sade" onClick={handleLogout}>
          Çıkış
        </button>
      </div>
    </div>
  );

  // ============================================================
  //  EKRAN 2: GİRİŞ YAPILDI AMA PROJE SEÇİLMEDİ -> Proje Listesi
  // ============================================================
  if (!selectedProject) {
    return (
      <div className="sayfa">
        {ustBar}

        <div className="ekle-satiri">
          <input
            className="alan"
            value={newProjectTitle}
            onChange={(e) => setNewProjectTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProject()}
            placeholder="Yeni proje adı yaz ve Enter'a bas..."
          />
          <button className="btn btn-mor" onClick={addProject} disabled={yukleniyor}>
            + Proje
          </button>
        </div>

        {yavas && <div className="uyari-serit">Sunucu uyanıyor, biraz sürebilir...</div>}
        {error && <div className="mesaj">{error}</div>}

        <h2 className="bolum-baslik">Projelerim</h2>

        {projects.length === 0 && !yukleniyor && (
          <div className="bos-mesaj">Henüz proje yok. Yukarıdan bir proje oluştur.</div>
        )}

        <div className="proje-listesi">
          {projects.map((project) => (
            <div
              key={project.id}
              className="proje-kart"
              onClick={() => setSelectedProject(project)}
            >
              <div className="ikon">📁</div>
              <div className="ad">{project.title}</div>
              {/* Admin isem projenin sahibini de gösteriyorum */}
              {project.owner && <div className="sahip">👤 {project.owner}</div>}
              {/* stopPropagation: Sil'e basınca kartın "aç" tıklaması tetiklenmesin */}
              <button
                className="btn-sil"
                onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
              >
                Sil
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================
  //  EKRAN 3: PROJE SEÇİLDİ -> O projenin Kanban Panosu
  // ============================================================
  return (
    <div className="sayfa">
      {ustBar}

      <div className="proje-ust">
        <button className="btn btn-sade" onClick={() => setSelectedProject(null)}>
          ← Projeler
        </button>
        <h2>📁 {selectedProject.title}</h2>
      </div>

      <div className="ekle-satiri">
        <input
          className="alan"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Yeni görev yaz ve Enter'a bas..."
        />
        <button className="btn btn-yesil" onClick={addTask} disabled={yukleniyor}>
          + Ekle
        </button>
      </div>

      {yavas && <div className="uyari-serit">Sunucu uyanıyor, biraz sürebilir...</div>}
      {error && <div className="mesaj">{error}</div>}

      {/* Kanban kolonları: 3 durum için 3 kolon */}
      <div className="pano">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            // Kolonun rengini CSS değişkeni olarak geçiyorum; stil işini CSS yapıyor
            <div key={col.key} className="kolon" style={{ "--kolon-renk": col.color }}>
              <div className="kolon-baslik">
                <strong>
                  <span>{col.icon}</span> {col.title}
                </strong>
                <span className="kolon-sayac">{colTasks.length}</span>
              </div>

              {colTasks.length === 0 && <div className="bos-mesaj">Henüz görev yok</div>}

              {colTasks.map((task) => (
                <div key={task.id} className="gorev-kart">
                  <div className="metin">{task.title}</div>
                  <div className="gorev-butonlar">
                    {/* Görevi diğer kolonlara taşıyan butonlar */}
                    {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                      <button
                        key={c.key}
                        className="btn-mini"
                        onClick={() => moveTask(task.id, c.key)}
                      >
                        {c.title}
                      </button>
                    ))}
                    <button className="btn-sil" onClick={() => deleteTask(task.id)}>
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
