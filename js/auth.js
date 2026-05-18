// Kimlik doğrulama işlemleri

/**
 * Bulunulan sayfaya göre ana sayfa URL'sini döndür
 * Returns the correct relative path to index.html based on current location
 * pages/ altındaki sayfalar için "../index.html", root için "index.html"
 */
function getHomeUrl() {
  return window.location.pathname.includes("/pages/") ? "../index.html" : "index.html";
}

/**
 * Yeni kullanıcı kaydı
 * @param {string} email - Kullanıcı e-postası
 * @param {string} password - Şifre
 * @param {string} displayName - Görünen ad
 */
async function registerUser(email, password, displayName) {
  try {
    // Firebase Auth ile kullanıcı oluştur
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Görünen adı güncelle
    await user.updateProfile({ displayName });

    // Firestore'da kullanıcı belgesi oluştur
    await db.collection("users").doc(user.uid).set({
      email: email,
      displayName: displayName,
      role: "user", // Varsayılan rol
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, user };
  } catch (error) {
    throw new Error(getFirebaseError(error));
  }
}

/**
 * Kullanıcı girişi
 * @param {string} email
 * @param {string} password
 */
async function loginUser(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    throw new Error(getFirebaseError(error));
  }
}

/**
 * Kullanıcı çıkışı
 */
async function logoutUser() {
  try {
    await auth.signOut();
    window.location.href = getHomeUrl();
  } catch (error) {
    throw new Error(getFirebaseError(error));
  }
}

/**
 * Mevcut kullanıcıyı döndür
 */
function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Firestore'dan kullanıcı rolünü getir
 * @param {string} uid - Kullanıcı ID
 */
async function getUserRole(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
      return doc.data().role || "user";
    }
    return "user";
  } catch (error) {
    console.error("Rol getirme hatası:", error);
    return "user";
  }
}

/**
 * Navbar'ı auth durumuna göre güncelle
 */
function updateNavbar(user) {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const addItemBtn = document.getElementById("addItemBtn");
  const adminBtn = document.getElementById("adminBtn");
  const userInfo = document.getElementById("userInfo");

  if (user) {
    // Giriş yapılmış
    if (loginBtn) loginBtn.style.display = "none";
    if (registerBtn) registerBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
    if (addItemBtn) addItemBtn.style.display = "inline-flex";
    if (userInfo) {
      userInfo.textContent = user.displayName || user.email;
      userInfo.style.display = "inline-flex";
    }

    // Admin kontrolü
    getUserRole(user.uid).then(role => {
      if (adminBtn) {
        adminBtn.style.display = role === "admin" ? "inline-flex" : "none";
      }
    });
  } else {
    // Çıkış yapılmış
    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (registerBtn) registerBtn.style.display = "inline-flex";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (addItemBtn) addItemBtn.style.display = "none";
    if (adminBtn) adminBtn.style.display = "none";
    if (userInfo) {
      userInfo.textContent = "";
      userInfo.style.display = "none";
    }
  }
}

// Auth durumu değişince navbar güncelle
auth.onAuthStateChanged(user => {
  updateNavbar(user);
});

// Logout butonuna tıklama
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await logoutUser();
    });
  }

  // Mobil menü toggle
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }
});

/**
 * Giriş yapılmamışsa yönlendir
 * @param {string} redirectUrl - Yönlendirme URL
 */
function requireAuth(redirectUrl) {
  if (!redirectUrl) redirectUrl = getHomeUrl();
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe();
      if (!user) {
        window.location.href = redirectUrl;
      } else {
        resolve(user);
      }
    });
  });
}

/**
 * Admin kontrolü yapılmamışsa yönlendir
 */
async function requireAdmin() {
  const user = await requireAuth();
  const role = await getUserRole(user.uid);
  if (role !== "admin") {
    alert("Bu sayfaya erişim yetkiniz yok.");
    window.location.href = getHomeUrl();
    return null;
  }
  return user;
}
