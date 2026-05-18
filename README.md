# Uni_Lost — Kayıp & Buluntu Eşya Platformu

Üniversite kampüsünde kaybedilen ve bulunan eşyaları takip etmek için geliştirilmiş web tabanlı bir platform. Atatürk Üniversitesi Web Programlama dersi 2026 Bahar dönem projesi.

## Geliştirici Ekip

3 kişilik proje. Bireysel katkılar için bkz: `docs/KATKI_BEYANI.md`.

## Teknoloji Yığını

- HTML5, CSS3, vanilla JavaScript (ES6+)
- Firebase Authentication (e-posta/şifre)
- Cloud Firestore (NoSQL veritabanı)
- Firebase Storage (dosya yükleme)

## Dosya Yapısı

```
Uni_Lost/
├── index.html              Ana sayfa, giriş/kayıt modali
├── pages/
│   ├── add.html            İlan ekleme formu
│   ├── list.html           İlan listesi, arama, filtre, sıralama
│   ├── detail.html         İlan detayı, talep yönetimi
│   └── admin.html          Yönetici paneli
├── css/
│   └── style.css           Tüm sayfaların ortak stilleri
├── js/
│   ├── firebase-config.js  Firebase başlatma ve hata mesajları
│   ├── auth.js             Kimlik doğrulama
│   ├── items.js            İlan ve talep CRUD işlemleri
│   ├── search.js           Arama ve filtreleme mantığı
│   └── admin.js            Yönetici paneli işlemleri
├── docs/
│   ├── RAPOR.md            Proje raporu
│   └── KATKI_BEYANI.md     Bireysel katkı beyanı
├── cors.json               Firebase Storage CORS yapılandırması
├── .gitignore
└── README.md
```

## Kurulum

### 1. Firebase Projesi

1. https://console.firebase.google.com adresinden yeni proje oluşturun.
2. Web uygulaması ekleyin, `firebaseConfig` değerlerini kopyalayın.
3. `js/firebase-config.js` dosyasındaki yapılandırmayı kendi değerlerinizle değiştirin.

### 2. Authentication

Firebase Console → Authentication → Sign-in method → Email/Password → Enable.

### 3. Firestore

Firebase Console → Firestore Database → Create database → Test mode → Bölge seçin.

Güvenlik kuralları:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /items/{itemId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
    match /claims/{claimId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Storage

Firebase Console → Storage → Get started → Test mode.

Güvenlik kuralları:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /items/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

### 5. İlk Admin Kullanıcısı

1. Uygulamaya kayıt olun.
2. Firebase Console → Firestore → `users` koleksiyonu → kendi belgenizi açın.
3. `role` alanını `"admin"` yapın.

## Çalıştırma

VS Code Live Server: `index.html` üzerine sağ tıklayın → Open with Live Server.

Python ile:

```bash
cd Uni_Lost
python -m http.server 8000
```

Sonra http://localhost:8000 adresine gidin.

Node.js ile:

```bash
npx serve .
```

## Özellikler

- E-posta/şifre ile kayıt ve giriş
- Fotoğraf yüklemeli ilan ekleme
- Başlık, açıklama ve konumda arama
- Kategori ve durum filtreleme
- Tarih bazlı sıralama
- Sahip-talepçi mesajlaşma akışı ("Bu benim!" sistemi)
- İlan sahibi için talep onaylama/reddetme
- Admin paneli (ilanlar, talepler, kullanıcılar)
- İki kullanıcı rolü: `user` ve `admin`
- Responsive arayüz

## Kullanıcı Rolleri

| Rol | Yetkiler |
|-----|----------|
| `user` | İlan ekleme, kendi ilanlarını silme, talep oluşturma, kendi ilanına gelen talepleri yönetme |
| `admin` | Tüm ilanları/talepleri/kullanıcıları görüntüleme, herhangi bir ilanı silme, kullanıcı rolünü değiştirme |
