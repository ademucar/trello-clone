// ============================================================
//  TRELLO CLONE - MOBİL UYGULAMA
//  React Native + Expo ile yazdım (iPhone'da çalışıyor).
//  Web sürümüyle AYNI mantık: Giriş -> Projeler -> Seçili Projenin Görevleri.
//  Aynı backend'e bağlanıyor, yani web'de eklediğim veriler burada da görünür.
// ============================================================
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Alert,
} from "react-native";

// Backend adresim. Telefon "localhost" deyince kendini arar, bilgisayarı bulamaz.
// O yüzden bilgisayarımın yerel ağ (Wi-Fi) IP adresini yazdım.
// (Not: Ağ değişirse bu adres de güncellenmeli.)
const API = "https://trello-clone-pjnd.onrender.com";

// Kanban kolonlarım (web'deki ile aynı: 3 durum)
const COLUMNS = [
  { key: "todo", title: "Yapılacak", color: "#eb5a46" },
  { key: "doing", title: "Yapılıyor", color: "#f2d600" },
  { key: "done", title: "Bitti", color: "#61bd4f" },
];

export default function App() {
  // --- Kullanıcı bilgileri (state) ---
  const [token, setToken] = useState(null);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");

  // --- Proje state'leri ---
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectTitle, setNewProjectTitle] = useState("");

  // --- Görev state'leri ---
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");

  // --- Giriş/Kayıt formu state'leri ---
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Giriş yapınca projeleri otomatik çekiyorum
  useEffect(() => { if (token) fetchProjects(); }, [token]);
  // Proje seçilince o projenin görevlerini otomatik çekiyorum
  useEffect(() => { if (selectedProject) fetchTasks(); }, [selectedProject]);

  // Projeleri backend'den çekiyorum.
  // .catch: Backend kapalıysa veya telefon aynı Wi-Fi'da değilse uyarı gösteriyorum.
  function fetchProjects() {
    fetch(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .catch(() => Alert.alert("Hata", "Sunucuya bağlanılamadı"));
  }

  // Seçili projenin görevlerini çekiyorum
  function fetchTasks() {
    fetch(`${API}/projects/${selectedProject.id}/tasks`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .catch(() => Alert.alert("Hata", "Görevler yüklenemedi"));
  }

  // Kayıt olma
  function handleRegister() {
    fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.message === "Kayıt başarılı") {
          setIsRegister(false);
          Alert.alert("Başarılı", "Kayıt tamam, şimdi giriş yap");
        } else {
          Alert.alert("Hata", data.message); // örn. "Bu email zaten kayıtlı"
        }
      })
      .catch(() => Alert.alert("Hata", "Sunucuya bağlanılamadı"));
  }

  // Giriş yapma
  function handleLogin() {
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
          Alert.alert("Hata", data.message); // "Email veya şifre hatalı"
        }
      })
      .catch(() => Alert.alert("Hata", "Sunucuya bağlanılamadı"));
  }

  // Çıkış yapınca tüm bilgileri temizliyorum
  function handleLogout() {
    setToken(null); setUserName(""); setUserRole("");
    setProjects([]); setSelectedProject(null); setTasks([]);
    setEmail(""); setPassword(""); setName("");
  }

  // Proje ekleme
  function addProject() {
    if (!newProjectTitle.trim()) return; // Boş isim engeli
    fetch(`${API}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: newProjectTitle }),
    })
      .then(() => { setNewProjectTitle(""); fetchProjects(); })
      .catch(() => Alert.alert("Hata", "Proje oluşturulamadı"));
  }

  // Proje silme
  function deleteProject(id) {
    fetch(`${API}/projects/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      .then(() => fetchProjects())
      .catch(() => Alert.alert("Hata", "Proje silinemedi"));
  }

  // Görev ekleme
  function addTask() {
    if (!newTitle.trim()) return;
    fetch(`${API}/projects/${selectedProject.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: newTitle, status: "todo" }),
    })
      .then(() => { setNewTitle(""); fetchTasks(); })
      .catch(() => Alert.alert("Hata", "Görev eklenemedi"));
  }

  // Görev taşıma (durum değiştirme)
  function moveTask(id, newStatus) {
    fetch(`${API}/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(() => fetchTasks())
      .catch(() => Alert.alert("Hata", "Görev taşınamadı"));
  }

  // Görev silme
  function deleteTask(id) {
    fetch(`${API}/tasks/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      .then(() => fetchTasks())
      .catch(() => Alert.alert("Hata", "Görev silinemedi"));
  }

  // ============================================================
  //  EKRAN 1: GİRİŞ YAPILMAMIŞSA -> Giriş / Kayıt ekranı
  // ============================================================
  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        {/* ScrollView: içerik taşarsa kaydırılabilsin diye */}
        <ScrollView contentContainerStyle={styles.loginWrap}>
          <Text style={styles.logo}>🗂️</Text>
          <Text style={styles.title}>Trello Clone</Text>
          <Text style={styles.subtitle}>
            {isRegister ? "Yeni hesap oluştur" : "Devam etmek için giriş yap"}
          </Text>

          {/* Kayıt modundaysa ad-soyad kutusu da çıksın */}
          {isRegister && (
            <TextInput style={styles.input} placeholder="Ad Soyad" placeholderTextColor="#888"
              value={name} onChangeText={setName} />
          )}
          {/* autoCapitalize="none": email yazarken ilk harfi büyük yapmasın */}
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#888"
            autoCapitalize="none" value={email} onChangeText={setEmail} />
          {/* secureTextEntry: şifreyi nokta nokta gizli göster */}
          <TextInput style={styles.input} placeholder="Şifre" placeholderTextColor="#888"
            secureTextEntry value={password} onChangeText={setPassword} />

          <TouchableOpacity style={styles.primaryBtn} onPress={isRegister ? handleRegister : handleLogin}>
            <Text style={styles.primaryBtnText}>{isRegister ? "Kayıt Ol" : "Giriş Yap"}</Text>
          </TouchableOpacity>

          {/* Giriş / kayıt arasında geçiş */}
          <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
            <Text style={styles.link}>
              {isRegister ? "Zaten hesabın var mı? Giriş yap" : "Hesabın yok mu? Kayıt ol"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============================================================
  //  EKRAN 2: PROJE SEÇİLMEDİ -> Proje Listesi
  // ============================================================
  if (!selectedProject) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Üst bar: başlık + çıkış */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🗂️ Projelerim</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Çıkış</Text>
          </TouchableOpacity>
        </View>
        {/* Karşılama + admin ise rol bilgisi */}
        <Text style={styles.welcome}>
          Merhaba, {userName}{userRole === "admin" ? "  (ADMIN)" : ""}
        </Text>

        {/* Yeni proje ekleme satırı */}
        <View style={styles.addRow}>
          <TextInput style={styles.addInput} placeholder="Yeni proje adı..." placeholderTextColor="#888"
            value={newProjectTitle} onChangeText={setNewProjectTitle} />
          <TouchableOpacity style={styles.addBtn} onPress={addProject}>
            <Text style={styles.addBtnText}>+ Proje</Text>
          </TouchableOpacity>
        </View>

        <ScrollView>
          {projects.length === 0 && <Text style={styles.empty}>Henüz proje yok.</Text>}
          {/* Projeleri kart olarak listeliyorum */}
          {projects.map((project) => (
            <TouchableOpacity key={project.id} style={styles.projectCard}
              onPress={() => setSelectedProject(project)}>
              <Text style={styles.projectTitle}>📁 {project.title}</Text>
              {/* Admin isem sahibini de gösteriyorum */}
              {project.owner && <Text style={styles.owner}>👤 {project.owner}</Text>}
              <TouchableOpacity style={styles.deleteBtn}
                onPress={() => deleteProject(project.id)}>
                <Text style={styles.deleteText}>Sil</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============================================================
  //  EKRAN 3: PROJE SEÇİLDİ -> Kanban Görevleri
  // ============================================================
  return (
    <SafeAreaView style={styles.container}>
      {/* Üst bar: geri dön + çıkış */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedProject(null)}>
          <Text style={styles.backText}>← Projeler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.projectHeader}>📁 {selectedProject.title}</Text>

      {/* Görev ekleme satırı */}
      <View style={styles.addRow}>
        <TextInput style={styles.addInput} placeholder="Yeni görev..." placeholderTextColor="#888"
          value={newTitle} onChangeText={setNewTitle} />
        <TouchableOpacity style={styles.addBtn} onPress={addTask}>
          <Text style={styles.addBtnText}>+ Ekle</Text>
        </TouchableOpacity>
      </View>

      {/* Kanban kolonları (mobilde alt alta sıralı) */}
      <ScrollView>
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <View key={col.key} style={styles.column}>
              {/* Kolon başlığı + görev sayısı */}
              <View style={[styles.columnHeader, { borderBottomColor: col.color }]}>
                <Text style={styles.columnTitle}>{col.title}</Text>
                <View style={[styles.badge, { backgroundColor: col.color }]}>
                  <Text style={styles.badgeText}>{colTasks.length}</Text>
                </View>
              </View>
              {colTasks.length === 0 && <Text style={styles.empty}>Görev yok</Text>}
              {/* Görev kartları */}
              {colTasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View style={styles.taskButtons}>
                    {/* Diğer kolonlara taşıma butonları */}
                    {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                      <TouchableOpacity key={c.key} style={styles.moveBtn}
                        onPress={() => moveTask(task.id, c.key)}>
                        <Text style={styles.moveText}>{c.title}</Text>
                      </TouchableOpacity>
                    ))}
                    {/* Silme butonu */}
                    <TouchableOpacity style={styles.taskDelete} onPress={() => deleteTask(task.id)}>
                      <Text style={styles.taskDeleteText}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// Tüm stillerimi burada tanımladım.
// (Mobilde web'deki CSS yerine StyleSheet.create kullanılır.)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1025", paddingHorizontal: 16, paddingTop: 20 },
  loginWrap: { alignItems: "center", paddingTop: 60 },
  logo: { fontSize: 50, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#8a8fa3", marginBottom: 30 },
  input: { width: "100%", backgroundColor: "#1a1f3a", color: "#fff", padding: 14, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: "#2a2f4a" },
  primaryBtn: { width: "100%", backgroundColor: "#5067c5", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 6, marginBottom: 16 },
  primaryBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  link: { color: "#7b9fff", fontWeight: "bold" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  welcome: { color: "#e0e0e0", marginBottom: 16 },
  logoutBtn: { backgroundColor: "#2a2f4a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: "#fff", fontWeight: "bold" },
  backBtn: { backgroundColor: "#2a2f4a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  backText: { color: "#fff", fontWeight: "bold" },
  projectHeader: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 16 },
  addRow: { flexDirection: "row", marginBottom: 20, gap: 8 },
  addInput: { flex: 1, backgroundColor: "#1a1f3a", color: "#fff", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#2a2f4a" },
  addBtn: { backgroundColor: "#61bd4f", paddingHorizontal: 16, justifyContent: "center", borderRadius: 10 },
  addBtnText: { color: "#fff", fontWeight: "bold" },
  empty: { color: "#6a6f85", textAlign: "center", padding: 20 },
  projectCard: { backgroundColor: "#1a1f3a", padding: 18, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#2a2f4a" },
  projectTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  owner: { fontSize: 12, color: "#7b9fff", marginTop: 4 },
  column: { backgroundColor: "#151a30", borderRadius: 12, padding: 14, marginBottom: 16 },
  columnHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 2, paddingBottom: 10, marginBottom: 12 },
  columnTitle: { fontSize: 15, fontWeight: "bold", color: "#fff" },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { color: "#000", fontWeight: "bold", fontSize: 12 },
  taskCard: { backgroundColor: "#1f2540", padding: 12, borderRadius: 10, marginBottom: 10 },
  taskTitle: { color: "#e8e8e8", fontSize: 14, marginBottom: 10 },
  taskButtons: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  moveBtn: { backgroundColor: "#2a2f4a", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  moveText: { color: "#ccc", fontSize: 11 },
  taskDelete: { backgroundColor: "#4a2020", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  taskDeleteText: { color: "#ff8a7a", fontSize: 11 },
  deleteBtn: { backgroundColor: "#4a2020", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginTop: 10, alignSelf: "flex-start" },
  deleteText: { color: "#ff8a7a", fontSize: 12 },
});