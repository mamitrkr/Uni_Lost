// Firebase yapılandırma dosyası
// Gerçek değerleri Firebase Console'dan alıp buraya yapıştırın


// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Servisleri global olarak tanımla
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Türkçe hata mesajları
const FIREBASE_ERRORS = {
  "auth/email-already-in-use": "Bu e-posta adresi zaten kullanımda.",
  "auth/weak-password": "Şifre en az 6 karakter olmalıdır.",
  "auth/user-not-found": "Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.",
  "auth/wrong-password": "Şifre hatalı.",
  "auth/invalid-email": "Geçersiz e-posta adresi.",
  "auth/too-many-requests": "Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.",
  "auth/network-request-failed": "Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.",
  "storage/unauthorized": "Dosya yükleme izniniz yok.",
  "storage/quota-exceeded": "Depolama alanı doldu.",
};

function getFirebaseError(error) {
  return FIREBASE_ERRORS[error.code] || "Bir hata oluştu: " + error.message;
}
