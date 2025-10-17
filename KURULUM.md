# Chrome Eklentisi Kurulum Rehberi

## Eklentiyi Chrome'a Yükleme

1. Chrome'da `chrome://extensions/` adresine gidin
2. Sağ üst köşedeki "Geliştirici modu" seçeneğini aktif edin
3. "Paketlenmemiş öğe yükle" butonuna tıklayın
4. Projenin `dist` klasörünü seçin

## Kullanım

### 1. İlk Giriş
- Eklenti ikonuna tıklayın
- E-posta ve şifre ile kayıt olun veya giriş yapın

### 2. Yeni Site Yapılandırması Ekleme
- "Yeni Site" butonuna tıklayın
- Site adını girin (örn: Sahibinden.com)
- Site URL'sini girin (örn: https://www.sahibinden.com)
- Her alan için:
  - Mouse ikonu butonuna tıklayın
  - Açılan sayfada ilgili elementi mouse ile tıklayın
  - Element otomatik olarak seçilecektir
  - ESC tuşu ile iptal edebilirsiniz

### 3. Veri Çekme
- Kayıtlı site yapılandırmanızın olduğu bir sayfaya gidin
- Eklenti otomatik olarak o site için yapılandırmayı bulacaktır
- "Veri Çek" butonuna tıklayın
- Veriler otomatik olarak çekilecek ve kaydedilecektir

### 4. CSV Export
- Müşteriler listesinde "CSV İndir" butonuna tıklayın
- Dosya UTF-8 formatında indirilecektir

## Önemli Notlar

- Her site için ayrı yapılandırma oluşturmanız gerekir
- Tüm veriler Supabase veritabanında güvenli şekilde saklanır
- CSV dosyası formatı: Ad Soyad, E-posta, Telefon, Adres, Notlar

## Geliştirme

Değişiklik yaptıktan sonra:

```bash
npm run build
```

Chrome'da eklentiyi yeniden yükleyin (chrome://extensions/ sayfasında yenile butonuna tıklayın)
