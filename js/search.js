// Arama ve filtreleme işlemleri

let allItems = []; // Tüm ilanları bellekte tut

/**
 * İlanları yükle ve göster
 */
async function loadAndDisplayItems() {
  showLoading("itemsGrid");
  try {
    allItems = await getItems({ sort: "en yeni" });
    applyFiltersAndSearch();
  } catch (error) {
    showError("itemsGrid", error.message);
  }
}

/**
 * Mevcut filtre ve arama değerlerini uygula
 */
function applyFiltersAndSearch() {
  const searchQuery = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const categoryFilter = document.getElementById("categoryFilter")?.value || "hepsi";
  const statusFilter = document.getElementById("statusFilter")?.value || "hepsi";
  const sortFilter = document.getElementById("sortFilter")?.value || "en yeni";

  let filtered = [...allItems];

  // Arama filtresi (başlık ve açıklamada)
  if (searchQuery) {
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(searchQuery) ||
      item.description.toLowerCase().includes(searchQuery) ||
      item.location.toLowerCase().includes(searchQuery)
    );
  }

  // Kategori filtresi
  if (categoryFilter !== "hepsi") {
    filtered = filtered.filter(item => item.category === categoryFilter);
  }

  // Durum filtresi
  if (statusFilter !== "hepsi") {
    filtered = filtered.filter(item => item.status === statusFilter);
  }

  // Sıralama
  filtered = sortItems(filtered, sortFilter);

  // Sonuçları göster
  displayItems(filtered);
  updateResultCount(filtered.length);
}

/**
 * İlanları sırala
 * @param {Array} items - İlanlar
 * @param {string} sortType - Sıralama tipi
 */
function sortItems(items, sortType) {
  return [...items].sort((a, b) => {
    const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
    const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);

    if (sortType === "en yeni") return dateB - dateA;
    if (sortType === "en eski") return dateA - dateB;
    return 0;
  });
}

/**
 * İlanları grid'e yaz
 * @param {Array} items
 */
function displayItems(items) {
  const grid = document.getElementById("itemsGrid");
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <h3>Sonuç bulunamadı</h3>
        <p>Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(item => createItemCard(item)).join("");
}

/**
 * Sonuç sayısını güncelle
 */
function updateResultCount(count) {
  const el = document.getElementById("resultCount");
  if (el) el.textContent = `${count} ilan bulundu`;
}

/**
 * Arama ve filtre event listener'larını bağla
 */
function initSearchAndFilters() {
  // Anlık arama
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyFiltersAndSearch, 200);
    });
  }

  // Filtre değişiklikleri
  ["categoryFilter", "statusFilter", "sortFilter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", applyFiltersAndSearch);
  });

  // Filtre sıfırlama
  const resetBtn = document.getElementById("resetFilters");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      const categoryFilter = document.getElementById("categoryFilter");
      const statusFilter = document.getElementById("statusFilter");
      const sortFilter = document.getElementById("sortFilter");
      if (categoryFilter) categoryFilter.value = "hepsi";
      if (statusFilter) statusFilter.value = "hepsi";
      if (sortFilter) sortFilter.value = "en yeni";
      applyFiltersAndSearch();
    });
  }
}
