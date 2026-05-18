// Admin paneli işlemleri

/**
 * Sayfa yüklenince admin kontrolü yap
 */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const user = await requireAdmin();
    if (!user) return;

    // Admin içeriğini göster
    document.getElementById("adminContent").style.display = "block";

    // Sekme yönetimi
    initTabs();

    // Verileri yükle
    loadAdminItems();
    loadAdminClaims();
    loadAdminUsers();

  } catch (error) {
    console.error("Admin yükleme hatası:", error);
  }
});

/**
 * Sekme (tab) yönetimi
 */
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const targetId = tab.dataset.tab;
      document.getElementById(targetId)?.classList.add("active");
    });
  });
}

/**
 * Tüm ilanları listele
 */
async function loadAdminItems() {
  const container = document.getElementById("adminItemsList");
  if (!container) return;

  container.innerHTML = '<div class="spinner"></div>';

  try {
    const snapshot = await db.collection("items").orderBy("date", "desc").get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (items.length === 0) {
      container.innerHTML = '<p class="empty-text">Henüz ilan yok.</p>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Başlık</th>
            <th>Kategori</th>
            <th>Durum</th>
            <th>Kullanıcı</th>
            <th>Tarih</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td><a href="detail.html?id=${item.id}" target="_blank">${escapeHtml(item.title)}</a></td>
              <td><span class="badge ${item.category === 'kayıp' ? 'badge-danger' : 'badge-primary'}">${item.category}</span></td>
              <td><span class="badge ${getStatusClass(item.status)}">${item.status}</span></td>
              <td>${escapeHtml(item.userEmail)}</td>
              <td>${formatDate(item.date)}</td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="adminDeleteItem('${item.id}', this)">
                  Sil
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
  }
}

/**
 * Demo ilanlari ekle
 */
async function handleSeedDemo(btn) {
  if (!confirm("Demo ilanlari eklemek istiyor musunuz?")) return;

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Ekleniyor...";

  try {
    const result = await seedDemoItems();
    if (result.skipped) {
      showToast("Demo ilanlar zaten ekli.", "warning");
    } else {
      showToast(`Demo ilanlar eklendi (${result.count}).`, "success");
    }

    await loadAdminItems();
    if (typeof loadStats === "function") {
      loadStats();
    }
  } catch (error) {
    showToast(error.message, "danger");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

/**
 * Tum ilanlari silip demo ilanlari yeniden olustur
 */
async function handleResetDemo(btn) {
  const confirmMsg = "Tum ilanlar ve talepler silinecek, yeni demo ilanlar eklenecek. Onayliyor musunuz?";
  if (!confirm(confirmMsg)) return;

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Sifirlaniyor...";

  try {
    const result = await resetDemoData();
    const count = result.seedResult?.count || 0;
    showToast(`Ilanlar sifirlandi, ${count} demo ilan eklendi.`, "success");
    await loadAdminItems();
    await loadAdminClaims();
    if (typeof loadStats === "function") {
      loadStats();
    }
  } catch (error) {
    showToast(error.message, "danger");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

/**
 * Admin olarak ilan sil
 */
async function adminDeleteItem(itemId, btn) {
  if (!confirm("Bu ilanı silmek istediğinizden emin misiniz?")) return;

  btn.disabled = true;
  btn.textContent = "Siliniyor...";

  try {
    await deleteItem(itemId);
    // Satırı DOM'dan kaldır
    btn.closest("tr").remove();
    showToast("İlan başarıyla silindi.", "success");
  } catch (error) {
    btn.disabled = false;
    btn.textContent = "Sil";
    showToast(error.message, "danger");
  }
}

/**
 * Tüm talepleri listele
 */
async function loadAdminClaims() {
  const container = document.getElementById("adminClaimsList");
  if (!container) return;

  container.innerHTML = '<div class="spinner"></div>';

  try {
    const snapshot = await db.collection("claims").orderBy("createdAt", "desc").get();
    const claims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (claims.length === 0) {
      container.innerHTML = '<p class="empty-text">Henüz talep yok.</p>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Talep Eden</th>
            <th>Mesaj</th>
            <th>Durum</th>
            <th>Tarih</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          ${claims.map(claim => `
            <tr id="claim-row-${claim.id}">
              <td>${escapeHtml(claim.claimantEmail)}</td>
              <td>${escapeHtml(claim.message)}</td>
              <td><span class="badge ${getClaimStatusClass(claim.status)}">${claim.status}</span></td>
              <td>${formatDate(claim.createdAt)}</td>
              <td>
                <select class="form-control form-control-sm" onchange="adminUpdateClaim('${claim.id}', '${claim.itemId}', this.value)">
                  <option value="bekliyor" ${claim.status === 'bekliyor' ? 'selected' : ''}>Bekliyor</option>
                  <option value="onaylandı" ${claim.status === 'onaylandı' ? 'selected' : ''}>Onayla</option>
                  <option value="reddedildi" ${claim.status === 'reddedildi' ? 'selected' : ''}>Reddet</option>
                </select>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
  }
}

/**
 * Admin olarak talep durumunu güncelle
 */
async function adminUpdateClaim(claimId, itemId, status) {
  try {
    await updateClaimStatus(claimId, itemId, status);
    showToast("Talep durumu güncellendi.", "success");
    // Talepleri yenile
    loadAdminClaims();
  } catch (error) {
    showToast(error.message, "danger");
  }
}

/**
 * Tüm kullanıcıları listele
 */
async function loadAdminUsers() {
  const container = document.getElementById("adminUsersList");
  if (!container) return;

  container.innerHTML = '<div class="spinner"></div>';

  try {
    const snapshot = await db.collection("users").orderBy("createdAt", "desc").get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (users.length === 0) {
      container.innerHTML = '<p class="empty-text">Henüz kullanıcı yok.</p>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Ad Soyad</th>
            <th>E-posta</th>
            <th>Rol</th>
            <th>Kayıt Tarihi</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr id="user-row-${user.id}">
              <td>${escapeHtml(user.displayName || "-")}</td>
              <td>${escapeHtml(user.email)}</td>
              <td><span class="badge ${user.role === 'admin' ? 'badge-warning' : 'badge-secondary'}">${user.role}</span></td>
              <td>${formatDate(user.createdAt)}</td>
              <td>
                <button class="btn btn-sm ${user.role === 'admin' ? 'btn-secondary' : 'btn-warning'}"
                  onclick="toggleUserRole('${user.id}', '${user.role}', this)">
                  ${user.role === 'admin' ? 'Kullanıcı Yap' : 'Admin Yap'}
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
  }
}

/**
 * Kullanıcı rolünü değiştir
 */
async function toggleUserRole(userId, currentRole, btn) {
  const newRole = currentRole === "admin" ? "user" : "admin";
  const confirmMsg = newRole === "admin"
    ? "Bu kullanıcıyı admin yapmak istediğinizden emin misiniz?"
    : "Admin yetkisini kaldırmak istediğinizden emin misiniz?";

  if (!confirm(confirmMsg)) return;

  btn.disabled = true;

  try {
    await db.collection("users").doc(userId).update({ role: newRole });
    showToast("Kullanıcı rolü güncellendi.", "success");
    loadAdminUsers();
  } catch (error) {
    btn.disabled = false;
    showToast(error.message, "danger");
  }
}

/**
 * Durum sınıfı yardımcıları
 */
function getStatusClass(status) {
  return { "açık": "badge-success", "talep var": "badge-warning", "çözüldü": "badge-secondary" }[status] || "badge-secondary";
}

function getClaimStatusClass(status) {
  return { "bekliyor": "badge-warning", "onaylandı": "badge-success", "reddedildi": "badge-danger" }[status] || "badge-secondary";
}

/**
 * Toast bildirim göster
 */
function showToast(message, type = "success") {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
