// ============================================================
//  TRELLO CLONE - WEB ARAYÜZÜ (Frontend)
//  React ile yazdım. Akış: Giriş -> Proje Listesi -> Seçili Projenin Kanban Panosu
//  Backend'e "fetch" ile istek atıp verileri alıyorum/gönderiyorum.
// ============================================================
import { useState, useEffect } from "react";

// Backend adresimi tek yerde tuttum ki değişirse tek satırda güncelleyebileyim
const API = "http://localhost:3000";

// Kanban kolonlarımı burada tanımladım: anahtar, başlık, ikon ve renk
const COLUMNS = [
  { key: "todo", title: "Yapılacak", icon: "📋", color: "#eb5a46" },
  { key: "doing", title: "Yapılıyor", icon: "⚙️", color: "#f2d600" },
  { key: "done", title: "Bitti", icon: "✅", color: "#61bd4f" },
];

function App() {
  // --- Kullanıcı bilgilerini tutan state'ler ---
  // (state = React'te ekranda değişebilen veri; değişince ekran otomatik yenilenir)
  const [token, setToken] = useState(null);     // Giriş yapınca gelen kimlik kartı (token)
  const [userName, setUserName] = useState(""); // Kullanıcının adı
  const [userRole, setUserRole] = useState(""); // Rolü (admin / user)

  // --- Projelerle ilgili state'ler ---
  const [projects, setProjects] = useState([]);              // Kullanıcının projeleri
  const [selectedProject, setSelectedProject] = useState(null); // Şu an açık olan proje
  const [newProjectTitle, setNewProjectTitle] = useState("");   // Yeni proje adı kutusu

  // --- Görevlerle ilgili state'ler ---
  const [tasks, setTasks] = useState([]);       // Seçili projenin görevleri
  const [newTitle, setNewTitle] = useState(""); // Yeni görev adı kutusu

  // --- Giriş/Kayıt formu state'leri ---
  const [isRegister, setIsRegister] = useState(false); // Kayıt modunda mıyız?
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");       // Ekranda gösterilecek hata/bilgi mesajı
  const [focused, setFocused] = useState("");   // Hangi kutuya tıklandı (parlama efekti için)

  // Kullanıcı giriş yapınca (token gelince) projelerini otomatik çekiyorum
  useEffect(() => {
    if (token) fetchProjects();
  }, [token]);

  // Bir proje seçilince o projenin görevlerini otomatik çekiyorum
  useEffect(() => {
    if (selectedProject) fetchTasks();
  }, [selectedProject]);

  // Kullanıcının projelerini backend'den çeken fonksiyonum.
  // .catch: Eğer backend kapalıysa veya bağlantı koparsa, kullanıcıya uyarı gösteriyorum.
  function fetchProjects() {
    fetch(`${API}/projects`, {
      headers: { Authorization: `Bearer ${token}` }, // Token'ı gönderiyorum ki backend beni tanısın
    })
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .catch(() => setError("Sunucuya bağlanılamadı. Backend çalışıyor mu?"));
  }

  // Seçili projenin görevlerini çeken fonksiyonum
  function fetchTasks() {
    fetch(`${API}/projects/${selectedProject.id}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .catch(() => setError("Görevler yüklenemedi."));
  }

  // Kayıt olma işlemim
  function handleRegister() {
    setError("");
    fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }), // Formu JSON olarak gönderiyorum
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.message === "Kayıt başarılı") {
          setIsRegister(false); // Kayıt olunca giriş ekranına dön
          setError("Kayıt başarılı! Şimdi giriş yapabilirsin.");
        } else {
          setError(data.message); // Backend'den gelen hatayı göster (örn. "email zaten kayıtlı")
        }
      })
      .catch(() => setError("Sunucuya bağlanılamadı."));
  }

  // Giriş yapma işlemim
  function handleLogin() {
    setError("");
    fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          // Giriş başarılıysa token, isim ve rolü hafızaya alıyorum
          setToken(data.token);
          setUserName(data.name);
          setUserRole(data.role);
        } else {
          setError(data.message); // "Email veya şifre hatalı" gibi
        }
      })
      .catch(() => setError("Sunucuya bağlanılamadı."));
  }

  // Çıkış yapınca tüm bilgileri temizliyorum (güvenlik + temiz başlangıç)
  function handleLogout() {
    setToken(null);
    setUserName("");
    setUserRole("");
    setProjects([]);
    setSelectedProject(null);
    setTasks([]);
    setEmail("");
    setPassword("");
    setName("");
    setError("");
  }

  // Yeni proje oluşturma
  function addProject() {
    if (!newProjectTitle.trim()) return; // Boş isimle proje oluşturmayı engelliyorum
    fetch(`${API}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: newProjectTitle }),
    })
      .then((res) => res.json())
      .then(() => {
        setNewProjectTitle("");  // Kutuyu temizle
        fetchProjects();         // Listeyi yenile
      })
      .catch(() => setError("Proje oluşturulamadı."));
  }

  // Proje silme
  function deleteProject(id) {
    fetch(`${API}/projects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => fetchProjects())
      .catch(() => setError("Proje silinemedi."));
  }

  // Seçili projeye görev ekleme
  function addTask() {
    if (!newTitle.trim()) return;
    fetch(`${API}/projects/${selectedProject.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: newTitle, status: "todo" }),
    })
      .then((res) => res.json())
      .then(() => {
        setNewTitle("");
        fetchTasks();
      })
      .catch(() => setError("Görev eklenemedi."));
  }

  // Görevi başka kolona taşıma (durumunu değiştirme: todo/doing/done)
  function moveTask(id, newStatus) {
    fetch(`${API}/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(() => fetchTasks())
      .catch(() => setError("Görev taşınamadı."));
  }

  // Görev silme
  function deleteTask(id) {
    fetch(`${API}/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => fetchTasks())
      .catch(() => setError("Görev silinemedi."));
  }

  // ============================================================
  //  EKRAN 1: GİRİŞ YAPILMAMIŞSA -> Giriş / Kayıt ekranı
  // ============================================================
  if (!token) {
    return (
      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        {/* Cam efektli (glassmorphism) giriş kartı */}
        <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.12)", padding: 42, borderRadius: 20, width: 370, boxShadow: "0 24px 60px rgba(0,0,0,0.55)", animation: "slideIn 0.5s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <div style={{ fontSize: 46, marginBottom: 8, filter: "drop-shadow(0 4px 12px rgba(123,63,228,0.5))" }}>🗂️</div>
            <h2 style={{ color: "#fff", fontSize: 25, letterSpacing: 0.3 }}>Trello Clone</h2>
            <p style={{ color: "#8a8fa3", fontSize: 13, marginTop: 6 }}>
              {isRegister ? "Yeni hesap oluştur" : "Devam etmek için giriş yap"}
            </p>
          </div>
          {/* Kayıt modundaysa ad-soyad kutusunu da gösteriyorum */}
          {isRegister && (
            <input placeholder="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocused("name")} onBlur={() => setFocused("")}
              style={{ ...inputStyle, ...(focused === "name" ? inputFocus : {}) }} />
          )}
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
            style={{ ...inputStyle, ...(focused === "email" ? inputFocus : {}) }} />
          <input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused("pass")} onBlur={() => setFocused("")}
            style={{ ...inputStyle, ...(focused === "pass" ? inputFocus : {}) }} />
          {/* Hata veya bilgi mesajını burada gösteriyorum */}
          {error && (
            <div style={{ color: error.includes("başarılı") ? "#61bd4f" : "#ff6b6b", fontSize: 13, marginBottom: 14, textAlign: "center" }}>
              {error}
            </div>
          )}
          {/* Duruma göre giriş ya da kayıt fonksiyonunu çalıştıran buton */}
          <button onClick={isRegister ? handleRegister : handleLogin}
            style={{ width: "100%", padding: 14, background: "linear-gradient(135deg, #5067c5, #7b3fe4)", color: "white", border: "none", borderRadius: 12, fontWeight: "bold", fontSize: 15, cursor: "pointer", marginBottom: 16, boxShadow: "0 6px 20px rgba(123,63,228,0.45)" }}>
            {isRegister ? "Kayıt Ol" : "Giriş Yap"}
          </button>
          {/* Giriş ve kayıt arasında geçiş yapan link */}
          <div style={{ textAlign: "center", fontSize: 13, color: "#8a8fa3" }}>
            {isRegister ? "Zaten hesabın var mı? " : "Hesabın yok mu? "}
            <span onClick={() => { setIsRegister(!isRegister); setError(""); }}
              style={{ color: "#7b9fff", cursor: "pointer", fontWeight: "bold" }}>
              {isRegister ? "Giriş yap" : "Kayıt ol"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Üst bar: Her ekranda ortak olan başlık + kullanıcı adı + çıkış butonu.
  // Ayrı bir bileşen (component) yaptım ki iki ekranda da tekrar tekrar yazmayayım.
  const TopBar = () => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
      <h1 style={{ color: "#fff", display: "flex", alignItems: "center", gap: 10, fontSize: 29, letterSpacing: 0.3 }}>
        <span style={{ filter: "drop-shadow(0 3px 10px rgba(123,63,228,0.5))" }}>🗂️</span> Trello Clone
      </h1>
      <div style={{ color: "#e0e0e0", display: "flex", alignItems: "center", gap: 14 }}>
        <span>
          Merhaba, <strong style={{ color: "#7b9fff" }}>{userName}</strong>
          {/* Kullanıcı admin ise adının yanında bir ADMIN rozeti gösteriyorum */}
          {userRole === "admin" && (
            <span style={{ marginLeft: 8, background: "#7b3fe4", color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: "bold" }}>ADMIN</span>
          )}
        </span>
        <button onClick={handleLogout}
          style={{ padding: "9px 18px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: "white", cursor: "pointer", fontWeight: "bold" }}>
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
      <div style={{ position: "relative", zIndex: 1, padding: 28, maxWidth: 1150, margin: "0 auto" }}>
        <TopBar />

        {/* Yeni proje oluşturma kutusu */}
        <div style={{ marginBottom: 34, display: "flex", gap: 10 }}>
          <input value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProject()}
            onFocus={() => setFocused("proj")} onBlur={() => setFocused("")}
            placeholder="Yeni proje adı yaz ve Enter'a bas..."
            style={{ padding: "14px 18px", width: 360, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 14, background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none", transition: "all 0.25s ease", ...(focused === "proj" ? { border: "1px solid #7b9fff", boxShadow: "0 0 0 3px rgba(123,159,255,0.2)" } : {}) }} />
          <button onClick={addProject}
            style={{ padding: "14px 28px", border: "none", borderRadius: 12, background: "linear-gradient(135deg, #5067c5, #7b3fe4)", color: "white", fontWeight: "bold", cursor: "pointer", boxShadow: "0 6px 18px rgba(123,63,228,0.35)" }}>
            + Proje
          </button>
        </div>

        <h2 style={{ color: "#fff", fontSize: 18, marginBottom: 16 }}>Projelerim</h2>

        {/* Hiç proje yoksa bilgi mesajı */}
        {projects.length === 0 && (
          <div style={{ color: "#6a6f85", fontSize: 14 }}>Henüz proje yok. Yukarıdan bir proje oluştur.</div>
        )}

        {/* Projeleri kart olarak listeliyorum */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {projects.map((project) => (
            <div key={project.id}
              onClick={() => setSelectedProject(project)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.border = "1px solid rgba(123,159,255,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; }}
              style={{ width: 260, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, cursor: "pointer", boxShadow: "0 10px 35px rgba(0,0,0,0.35)", transition: "all 0.2s ease" }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>📁</div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#fff", marginBottom: 6 }}>{project.title}</div>
              {/* Admin isem projenin sahibini de gösteriyorum */}
              {project.owner && (
                <div style={{ fontSize: 12, color: "#7b9fff", marginBottom: 10 }}>👤 {project.owner}</div>
              )}
              {/* e.stopPropagation: Sil'e basınca kartın "aç" tıklaması tetiklenmesin diye */}
              <button onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                style={{ fontSize: 11, padding: "5px 10px", border: "none", borderRadius: 7, background: "rgba(235,90,70,0.2)", color: "#ff8a7a", cursor: "pointer" }}>
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
    <div style={{ position: "relative", zIndex: 1, padding: 28, maxWidth: 1150, margin: "0 auto" }}>
      <TopBar />

      {/* Geri dön butonu ve seçili projenin adı */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={() => setSelectedProject(null)}
          style={{ padding: "8px 16px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: "white", cursor: "pointer", fontWeight: "bold" }}>
          ← Projeler
        </button>
        <h2 style={{ color: "#fff", fontSize: 20 }}>📁 {selectedProject.title}</h2>
      </div>

      {/* Görev ekleme kutusu */}
      <div style={{ marginBottom: 34, display: "flex", gap: 10 }}>
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          onFocus={() => setFocused("new")} onBlur={() => setFocused("")}
          placeholder="Yeni görev yaz ve Enter'a bas..."
          style={{ padding: "14px 18px", width: 360, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 14, background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none", transition: "all 0.25s ease", ...(focused === "new" ? { border: "1px solid #7b9fff", boxShadow: "0 0 0 3px rgba(123,159,255,0.2)" } : {}) }} />
        <button onClick={addTask}
          style={{ padding: "14px 28px", border: "none", borderRadius: 12, background: "linear-gradient(135deg, #61bd4f, #4a9e3a)", color: "white", fontWeight: "bold", cursor: "pointer", boxShadow: "0 6px 18px rgba(97,189,79,0.35)" }}>
          + Ekle
        </button>
      </div>

      {/* Kanban kolonları: 3 durum için 3 kolon çiziyorum */}
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
        {COLUMNS.map((col) => {
          // Bu kolona ait görevleri filtreliyorum (sadece o durumdakiler)
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key}
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 16, boxShadow: "0 10px 35px rgba(0,0,0,0.35)" }}>
              {/* Kolon başlığı + görev sayısı rozeti */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${col.color}` }}>
                <strong style={{ fontSize: 15, color: "#fff", display: "flex", alignItems: "center", gap: 8, textShadow: `0 0 20px ${col.color}55` }}>
                  <span>{col.icon}</span> {col.title}
                </strong>
                <span style={{ background: col.color, color: "#000", borderRadius: 12, padding: "2px 11px", fontSize: 12, fontWeight: "bold", boxShadow: `0 2px 10px ${col.color}66` }}>
                  {colTasks.length}
                </span>
              </div>
              {/* Kolon boşsa mesaj göster */}
              {colTasks.length === 0 && (
                <div style={{ color: "#6a6f85", fontSize: 13, textAlign: "center", padding: 28 }}>Henüz görev yok</div>
              )}
              {/* Bu kolondaki görev kartları */}
              {colTasks.map((task) => (
                <div key={task.id}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.4)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; }}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", animation: "slideIn 0.3s ease", transition: "all 0.2s ease" }}>
                  <div style={{ fontSize: 14, marginBottom: 12, color: "#e8e8e8" }}>{task.title}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {/* Görevi diğer kolonlara taşıyan butonlar */}
                    {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                      <button key={c.key} onClick={() => moveTask(task.id, c.key)}
                        style={{ fontSize: 11, padding: "5px 10px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, background: "rgba(255,255,255,0.05)", color: "#ccc", cursor: "pointer" }}>
                        {c.title}
                      </button>
                    ))}
                    {/* Görevi silen buton */}
                    <button onClick={() => deleteTask(task.id)}
                      style={{ fontSize: 11, padding: "5px 10px", border: "none", borderRadius: 7, background: "rgba(235,90,70,0.2)", color: "#ff8a7a", cursor: "pointer" }}>
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

// Giriş/kayıt formundaki input kutularının ortak stilini tek yerde tanımladım
const inputStyle = {
  width: "100%", padding: 13, marginBottom: 14, border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, fontSize: 14, background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none", transition: "all 0.25s ease",
};
// Bir kutuya tıklandığında (focus) uygulanan mavi parlama efekti
const inputFocus = { border: "1px solid #7b9fff", boxShadow: "0 0 0 3px rgba(123,159,255,0.2)" };

export default App;