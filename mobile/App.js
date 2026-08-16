// ============================================================
//  TRELLO CLONE - MOBİL UYGULAMA
//  React Native + Expo ile yazdım.
//  Web sürümüyle AYNI mantık: Giriş -> Projeler -> Seçili Projenin Görevleri.
//  Aynı backend'e bağlanıyor, yani web'de eklediğim veriler burada da görünür.
//  Backend ile konuşma işi api.js dosyasında; burada sadece ekran var.
// ============================================================
import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
} from "react-native";
import { istek } from "./api";

// Kanban kolonlarım (web'deki ile aynı: 3 durum)
const COLUMNS = [
  { key: "todo", title: "Yapılacak", color: "#eb5a46" },
  { key: "doing", title: "Yapılıyor", color: "#f2d600" },
  { key: "done", title: "Bitti", color: "#61bd4f" },
];

export default function App() {
  // --- Oturum bilgisi ---
  const [oturum, setOturum] = useState(null);
  const token = oturum?.token || null;

  // --- Proje ve görev state'leri ---
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");

  // --- Giriş/Kayıt formu state'leri ---
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Bir istek sürüyor mu? (butonları kilitlemek ve dönen çark göstermek için)
  const [yukleniyor, setYukleniyor] = useState(false);

  // Çıkış: tüm bilgileri temizliyorum
  const handleLogout = useCallback(() => {
    setOturum(null);
    setProjects([]);
    setSelectedProject(null);
    setTasks([]);
    setEmail("");
    setPassword("");
    setName("");
  }, []);

  // ============================================================
  //  TÜM İSTEKLERİN GEÇTİĞİ ORTAK NOKTA
  //  Yükleniyor durumu, hata uyarısı ve token süresi dolunca
  //  otomatik çıkış işlerini tek yerde hallediyorum.
  // ============================================================
  const cagir = useCallback(
    async (yol, secenek = {}) => {
      setYukleniyor(true);
      try {
        return await istek(yol, { ...secenek, token });
      } catch (hata) {
        if (hata.durum === 401 && token) {
          handleLogout();
          Alert.alert("Oturum sona erdi", "Lütfen tekrar giriş yap.");
        } else {
          Alert.alert("Hata", hata.message);
        }
        return null;
      } finally {
        setYukleniyor(false);
      }
    },
    [token, handleLogout]
  );

  // ---------- VERİ ÇEKME ----------

  const fetchProjects = useCallback(async () => {
    const veri = await cagir("/projects");
    if (Array.isArray(veri)) setProjects(veri);
  }, [cagir]);

  const fetchTasks = useCallback(async () => {
    if (!selectedProject) return;
    const veri = await cagir(`/projects/${selectedProject.id}/tasks`);
    if (Array.isArray(veri)) setTasks(veri);
  }, [cagir, selectedProject]);

  useEffect(() => {
    if (token) fetchProjects();
  }, [token, fetchProjects]);

  useEffect(() => {
    if (selectedProject) fetchTasks();
    else setTasks([]);
  }, [selectedProject, fetchTasks]);

  // ---------- GİRİŞ / KAYIT ----------

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Eksik bilgi", "Lütfen tüm alanları doldur.");
      return;
    }
    const veri = await cagir("/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
    if (veri) {
      setIsRegister(false);
      setPassword("");
      Alert.alert("Başarılı", "Kayıt tamam, şimdi giriş yap");
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Eksik bilgi", "Email ve şifre gerekli.");
      return;
    }
    const veri = await cagir("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (veri?.token) {
      setOturum({ token: veri.token, name: veri.name, role: veri.role });
      setPassword("");
    }
  }

  // ---------- PROJE İŞLEMLERİ ----------

  async function addProject() {
    const baslik = newProjectTitle.trim();
    if (!baslik) return;

    const veri = await cagir("/projects", { method: "POST", body: { title: baslik } });
    if (veri) {
      setNewProjectTitle("");
      fetchProjects();
    }
  }

  function deleteProject(id) {
    // Yanlışlıkla silmeyi önlemek için onay soruyorum
    Alert.alert("Projeyi sil", "Bu proje ve içindeki tüm görevler silinecek. Emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          const veri = await cagir(`/projects/${id}`, { method: "DELETE" });
          if (veri) fetchProjects();
        },
      },
    ]);
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
    await cagir(`/tasks/${id}`, { method: "PUT", body: { status: newStatus } });
    fetchTasks();
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
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.loginWrap}>
          <Text style={styles.logo}>🗂️</Text>
          <Text style={styles.title}>Trello Clone</Text>
          <Text style={styles.subtitle}>
            {isRegister ? "Yeni hesap oluştur" : "Devam etmek için giriş yap"}
          </Text>

          {isRegister && (
            <TextInput style={styles.input} placeholder="Ad Soyad" placeholderTextColor="#888"
              value={name} onChangeText={setName} />
          )}
          {/* autoCapitalize="none": email yazarken ilk harfi büyük yapmasın */}
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#888"
            autoCapitalize="none" keyboardType="email-address" autoCorrect={false}
            value={email} onChangeText={setEmail} />
          {/* secureTextEntry: şifreyi nokta nokta gizli göster */}
          <TextInput style={styles.input} placeholder="Şifre" placeholderTextColor="#888"
            secureTextEntry value={password} onChangeText={setPassword} />

          {/* İstek sürerken butonu kilitliyorum: üst üste tıklanıp
              aynı kayıt iki kez gönderilmesin */}
          <TouchableOpacity
            style={[styles.primaryBtn, yukleniyor && styles.btnPasif]}
            disabled={yukleniyor}
            onPress={isRegister ? handleRegister : handleLogin}
          >
            {yukleniyor ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{isRegister ? "Kayıt Ol" : "Giriş Yap"}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
            <Text style={styles.link}>
              {isRegister ? "Zaten hesabın var mı? Giriş yap" : "Hesabın yok mu? Kayıt ol"}
            </Text>
          </TouchableOpacity>

          {/* Render'ın ücretsiz sunucusu uykudaysa ilk giriş uzun sürebiliyor */}
          {yukleniyor && (
            <Text style={styles.bilgi}>Sunucu uyanıyor, biraz sürebilir...</Text>
          )}
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🗂️ Projelerim</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Çıkış</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.welcome}>
          Merhaba, {oturum.name}{oturum.role === "admin" ? "  (ADMIN)" : ""}
        </Text>

        <View style={styles.addRow}>
          <TextInput style={styles.addInput} placeholder="Yeni proje adı..." placeholderTextColor="#888"
            value={newProjectTitle} onChangeText={setNewProjectTitle}
            onSubmitEditing={addProject} />
          <TouchableOpacity style={[styles.addBtn, yukleniyor && styles.btnPasif]}
            disabled={yukleniyor} onPress={addProject}>
            <Text style={styles.addBtnText}>+ Proje</Text>
          </TouchableOpacity>
        </View>

        <ScrollView>
          {yukleniyor && projects.length === 0 && (
            <ActivityIndicator color="#7b9fff" style={{ marginTop: 20 }} />
          )}
          {!yukleniyor && projects.length === 0 && (
            <Text style={styles.empty}>Henüz proje yok.</Text>
          )}

          {projects.map((project) => (
            <TouchableOpacity key={project.id} style={styles.projectCard}
              onPress={() => setSelectedProject(project)}>
              <Text style={styles.projectTitle}>📁 {project.title}</Text>
              {/* Admin isem sahibini de gösteriyorum */}
              {project.owner && <Text style={styles.owner}>👤 {project.owner}</Text>}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteProject(project.id)}>
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedProject(null)}>
          <Text style={styles.backText}>← Projeler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.projectHeader}>📁 {selectedProject.title}</Text>

      <View style={styles.addRow}>
        <TextInput style={styles.addInput} placeholder="Yeni görev..." placeholderTextColor="#888"
          value={newTitle} onChangeText={setNewTitle} onSubmitEditing={addTask} />
        <TouchableOpacity style={[styles.addBtn, yukleniyor && styles.btnPasif]}
          disabled={yukleniyor} onPress={addTask}>
          <Text style={styles.addBtnText}>+ Ekle</Text>
        </TouchableOpacity>
      </View>

      {/* Kanban kolonları (mobilde alt alta sıralı) */}
      <ScrollView>
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <View key={col.key} style={styles.column}>
              <View style={[styles.columnHeader, { borderBottomColor: col.color }]}>
                <Text style={styles.columnTitle}>{col.title}</Text>
                <View style={[styles.badge, { backgroundColor: col.color }]}>
                  <Text style={styles.badgeText}>{colTasks.length}</Text>
                </View>
              </View>
              {colTasks.length === 0 && <Text style={styles.empty}>Görev yok</Text>}

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
  btnPasif: { opacity: 0.55 },
  bilgi: { color: "#7b9fff", fontSize: 13, marginTop: 16, textAlign: "center" },
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
