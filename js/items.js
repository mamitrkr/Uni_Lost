// İlan ve talep işlemleri

/**
 * Yeni ilan ekle
 * @param {Object} itemData - İlan verileri
 * @param {File} imageFile - Yüklenecek fotoğraf
 */
async function addItem(itemData, imageFile) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("Giriş yapmanız gerekiyor.");

    let imageUrl = "";

    // Fotoğraf varsa Storage'a yükle
    if (imageFile) {
      const fileName = `items/${user.uid}_${Date.now()}_${imageFile.name}`;
      const storageRef = storage.ref(fileName);
      const snapshot = await storageRef.put(imageFile);
      imageUrl = await snapshot.ref.getDownloadURL();
    }

    // Firestore'a ilan ekle
    const docRef = await db.collection("items").add({
      title: itemData.title,
      description: itemData.description,
      category: itemData.category,
      location: itemData.location,
      date: firebase.firestore.FieldValue.serverTimestamp(),
      status: "açık",
      imageUrl: imageUrl,
      userId: user.uid,
      userEmail: user.email
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    throw new Error(error.message || "İlan eklenirken hata oluştu.");
  }
}

/**
 * Filtrelere göre ilanları getir
 * @param {Object} filters - Filtre seçenekleri
 */
async function getItems(filters = {}) {
  try {
    let query = db.collection("items");

    // Kategori filtresi
    if (filters.category && filters.category !== "hepsi") {
      query = query.where("category", "==", filters.category);
    }

    // Durum filtresi
    if (filters.status && filters.status !== "hepsi") {
      query = query.where("status", "==", filters.status);
    }

    // Sıralama
    const sortDir = filters.sort === "en eski" ? "asc" : "desc";
    query = query.orderBy("date", sortDir);

    // Limit
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw new Error("İlanlar getirilirken hata oluştu: " + error.message);
  }
}

/**
 * Tek ilan getir
 * @param {string} id - İlan ID
 */
async function getItemById(id) {
  try {
    const doc = await db.collection("items").doc(id).get();
    if (!doc.exists) throw new Error("İlan bulunamadı.");
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    throw new Error(error.message || "İlan getirilirken hata oluştu.");
  }
}

/**
 * İlanı güncelle
 * @param {string} id - İlan ID
 * @param {Object} data - Güncellenecek veriler
 */
async function updateItem(id, data) {
  try {
    await db.collection("items").doc(id).update(data);
    return { success: true };
  } catch (error) {
    throw new Error("İlan güncellenirken hata oluştu: " + error.message);
  }
}

/**
 * İlanı sil
 * @param {string} id - İlan ID
 */
async function deleteItem(id) {
  try {
    await db.collection("items").doc(id).delete();
    return { success: true };
  } catch (error) {
    throw new Error("İlan silinirken hata oluştu: " + error.message);
  }
}

/**
 * Demo ilanlari ekle (Storage olmadan, uzak görsellerle)
 */
async function seedDemoItems() {
  const user = getCurrentUser();
  if (!user) throw new Error("Giriş yapmanız gerekiyor.");

  const seedTag = "demo-2026-05-18";
  const existing = await db.collection("items").where("seedTag", "==", seedTag).get();
  if (!existing.empty) {
    return { success: true, count: existing.size, skipped: true };
  }

  const demoItems = [
    {
      title: "Kayip siyah cuzdan",
      description: "Metro cikisinda dusurulmus olabilir. Icinde kimlik ve kartlar var.",
      category: "kayıp",
      location: "Kadikoy Metro Istasyonu",
      imageUrl: "docs/kayıp_siyah_cüzdan.webp"
    },
    {
      title: "Bulunan gri bere",
      description: "Otobus duraginda buldum. Temiz ve yeni gorunuyor.",
      category: "buluntu",
      location: "Uskudar Meydan",
      imageUrl: "docs/buluntu_gri_bere.jpg"
    },
    {
      title: "Kayip anahtarlik (mavi)",
      description: "Uzerinde universite logolu anahtarlik var. Birkac anahtar.",
      category: "kayıp",
      location: "Sogutlucesme",
      imageUrl: "docs/kayıp_mavi_anahtarlık.jpg"
    },
    {
      title: "Kayip gunluk defter",
      description: "Siyah kapakli, icinde notlar var. Kimlik bilgisi yok.",
      category: "kayıp",
      location: "Uskudar Iskele",
      imageUrl: "docs/kayıp_günlük_defter.webp"
    }
  ];

  const batch = db.batch();
  demoItems.forEach(item => {
    const ref = db.collection("items").doc();
    batch.set(ref, {
      title: item.title,
      description: item.description,
      category: item.category,
      location: item.location,
      date: firebase.firestore.FieldValue.serverTimestamp(),
      status: "açık",
      imageUrl: item.imageUrl,
      userId: user.uid,
      userEmail: user.email,
      isDemo: true,
      seedTag
    });
  });

  await batch.commit();
  return { success: true, count: demoItems.length, skipped: false };
}

/**
 * Talep oluştur
 * @param {string} itemId - İlan ID
 * @param {string} message - Talep mesajı
 */
async function addClaim(itemId, message) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("Giriş yapmanız gerekiyor.");

    // Mevcut talebi kontrol et (aynı kişi iki kez talep oluşturamaz)
    const existingClaims = await db.collection("claims")
      .where("itemId", "==", itemId)
      .where("claimantId", "==", user.uid)
      .get();

    if (!existingClaims.empty) {
      throw new Error("Bu ilan için zaten bir talebiniz var.");
    }

    // Talebi ekle
    await db.collection("claims").add({
      itemId: itemId,
      claimantId: user.uid,
      claimantEmail: user.email,
      message: message,
      status: "bekliyor",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // İlan durumunu "talep var" yap
    await updateItem(itemId, { status: "talep var" });

    return { success: true };
  } catch (error) {
    throw new Error(error.message || "Talep oluşturulurken hata oluştu.");
  }
}

/**
 * İlana gelen talepleri getir
 * @param {string} itemId - İlan ID
 */
async function getClaimsByItem(itemId) {
  try {
    const snapshot = await db.collection("claims")
      .where("itemId", "==", itemId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw new Error("Talepler getirilirken hata oluştu: " + error.message);
  }
}

/**
 * Talep durumunu güncelle
 * @param {string} claimId - Talep ID
 * @param {string} itemId - İlan ID
 * @param {string} status - "onaylandı" veya "reddedildi"
 */
async function updateClaimStatus(claimId, itemId, status) {
  try {
    // Talebi güncelle
    await db.collection("claims").doc(claimId).update({ status });

    // Onaylandıysa ilan durumunu çözüldü yap
    if (status === "onaylandı") {
      await updateItem(itemId, { status: "çözüldü" });

      // Diğer talepleri reddet
      const otherClaims = await db.collection("claims")
        .where("itemId", "==", itemId)
        .where("status", "==", "bekliyor")
        .get();

      const batch = db.batch();
      otherClaims.docs.forEach(doc => {
        if (doc.id !== claimId) {
          batch.update(doc.ref, { status: "reddedildi" });
        }
      });
      await batch.commit();
    }

    return { success: true };
  } catch (error) {
    throw new Error("Talep güncellenirken hata oluştu: " + error.message);
  }
}

/**
 * Tarihi okunabilir formata çevir
 * @param {firebase.firestore.Timestamp} timestamp
 */
function formatDate(timestamp) {
  if (!timestamp) return "Bilinmiyor";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function resolveImageUrl(url) {
  if (!url) return "";
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("/")) return url;
  const base = window.location.pathname.includes("/pages/") ? "../" : "";
  return base + url;
}

async function deleteAllFromCollection(collectionName, batchSize = 50) {
  let deleted = 0;
  while (true) {
    const snapshot = await db.collection(collectionName).limit(batchSize).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
  }
  return deleted;
}

async function resetDemoData() {
  const user = getCurrentUser();
  if (!user) throw new Error("Giris yapmaniz gerekiyor.");

  const deletedClaims = await deleteAllFromCollection("claims");
  const deletedItems = await deleteAllFromCollection("items");
  const seedResult = await seedDemoItems();
  return { deletedClaims, deletedItems, seedResult };
}

function resolveItemImageUrl(item) {
  if (!item) return "";
  if (item.isDemo) {
    const title = (item.title || "").toLowerCase();
    if (item.category === "kayıp") {
      if (title.includes("cuzdan")) return resolveImageUrl("docs/kayıp_siyah_cüzdan.webp");
      if (title.includes("anahtarlik")) return resolveImageUrl("docs/kayıp_mavi_anahtarlık.jpg");
      if (title.includes("gunluk")) return resolveImageUrl("docs/kayıp_günlük_defter.webp");
    }
    if (item.category === "buluntu") {
      if (title.includes("bere")) return resolveImageUrl("docs/buluntu_gri_bere.jpg");
    }
  }
  return resolveImageUrl(item.imageUrl);
}

/**
 * İlan kartı HTML oluştur
 * @param {Object} item - İlan verisi
 */
function createItemCard(item) {
  const categoryClass = item.category === "kayıp" ? "badge-danger" : "badge-primary";
  const statusClass = {
    "açık": "badge-success",
    "talep var": "badge-warning",
    "çözüldü": "badge-secondary"
  }[item.status] || "badge-secondary";

  const resolvedImageUrl = resolveItemImageUrl(item);
  const imageHtml = resolvedImageUrl
    ? `<img src="${resolvedImageUrl}" alt="${item.title}" class="card-img">`
    : `<div class="card-img-placeholder"><span>Fotograf yok</span></div>`;

  const detailUrl = window.location.pathname.includes("/pages/")
    ? `detail.html?id=${item.id}`
    : `pages/detail.html?id=${item.id}`;

  return `
    <div class="card" onclick="window.location.href='${detailUrl}'">
      <div class="card-img-wrapper">
        ${imageHtml}
        <span class="badge ${categoryClass} card-category-badge">${item.category.toUpperCase()}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
        <p class="card-desc">${escapeHtml(item.description).substring(0, 100)}${item.description.length > 100 ? "..." : ""}</p>
        <div class="card-meta">
          <span class="card-location"><svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${escapeHtml(item.location)}</span>
          <span class="card-date">${formatDate(item.date)}</span>
        </div>
        <div class="card-footer-inner">
          <span class="badge ${statusClass}">${item.status}</span>
          <span class="card-arrow">→</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * XSS'e karşı HTML escape
 */
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Loading göster/gizle
 */
function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '<div class="spinner"></div>';
}

function showError(containerId, message) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="alert alert-danger">${message}</div>`;
}

function showEmpty(containerId, message = "Henüz ilan bulunmuyor.") {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
}

// Akilli eslestirme: Jaccard benzerlik katsayisi kullanir
// Smart matching: uses Jaccard similarity coefficient

// Turkce stop word'leri, eslestirme oncesi metinden cikarilir
// Turkish stop words, removed before matching
const STOP_WORDS = new Set([
  "ve", "bir", "bu", "da", "de", "ile", "icin", "için", "ama", "ya", "veya",
  "ki", "mi", "mu", "mı", "mü", "ne", "ya", "ben", "sen", "biz", "siz",
  "var", "yok", "gibi", "kadar", "daha", "en", "cok", "çok", "az", "her",
  "hic", "hiç", "bana", "sana", "ona", "bizim", "sizin", "onlar", "olarak",
  "olan", "ise", "ki", "ile", "ait", "kayip", "kayıp", "buluntu", "bulunan",
  "kaybedilen", "kaybettim", "buldum"
]);

// Metni kelime kumesine cevirir (kucuk harf, stop word filtresi, kisa kelimeler atilir)
// Converts text to a set of meaningful words
function tokenize(text) {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^a-zçğıöşüâîû\s]/gi, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

// Iki kume arasinda Jaccard benzerlik katsayisini hesaplar
// Computes Jaccard similarity between two sets: |A intersect B| / |A union B|
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Verilen bir ilan icin olasi eslesmeleri bulur
// Finds possible matches for a given item
// targetItem: kullanicinin baktigi ilan / the item user is viewing
// returns en iyi 3 eslesmeyi skor ile / returns top 3 matches with scores
async function findMatches(targetItem, threshold = 0.15, topN = 3) {
  // Karsi kategoriyi belirle: kayip ise buluntu, buluntu ise kayip ara
  // Determine opposite category
  const oppositeCategory = targetItem.category === "kayıp" ? "buluntu" : "kayıp";

  try {
    const snapshot = await db.collection("items")
      .where("category", "==", oppositeCategory)
      .where("status", "==", "açık")
      .get();

    const candidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Hedef ilanin kelime kumesini cikar
    // Extract target item word set
    const targetText = `${targetItem.title} ${targetItem.description} ${targetItem.location}`;
    const targetSet = tokenize(targetText);

    if (targetSet.size === 0) return [];

    // Her aday icin skor hesapla
    // Compute score for each candidate
    const scored = candidates.map(item => {
      const itemText = `${item.title} ${item.description} ${item.location}`;
      const itemSet = tokenize(itemText);
      const score = jaccardSimilarity(targetSet, itemSet);
      return { item, score };
    });

    // Esik degeri uzerindekileri al, skora gore sirala, en iyi N'i dondur
    // Filter by threshold, sort by score, return top N
    return scored
      .filter(s => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

  } catch (error) {
    console.error("Eslestirme hatasi / Matching error:", error);
    return [];
  }
}

