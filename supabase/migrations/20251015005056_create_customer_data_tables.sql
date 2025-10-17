/*
  # Müşteri Veri Toplama Sistemi

  1. Yeni Tablolar
    - `site_configurations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, kullanıcı kimliği)
      - `site_url` (text, site adresi)
      - `site_name` (text, site adı)
      - `field_mappings` (jsonb, alan eşlemeleri - hangi veri nerede)
      - `created_at` (timestamptz, oluşturulma zamanı)
      - `updated_at` (timestamptz, güncellenme zamanı)
    
    - `customers`
      - `id` (uuid, primary key)
      - `site_config_id` (uuid, foreign key to site_configurations)
      - `full_name` (text, ad soyad)
      - `email` (text, e-posta)
      - `phone` (text, telefon)
      - `address` (text, adres)
      - `notes` (text, notlar)
      - `source_url` (text, verinin çekildiği sayfa URL'si)
      - `created_at` (timestamptz, oluşturulma zamanı)

  2. Güvenlik
    - Her iki tablo için RLS etkinleştirildi
    - Kullanıcılar sadece kendi verilerini görebilir ve yönetebilir
    - site_configurations: Kullanıcı kendi site yapılandırmalarını CRUD yapabilir
    - customers: Kullanıcı kendi müşteri verilerini CRUD yapabilir

  3. İndeksler
    - site_configurations.user_id için indeks
    - site_configurations.site_url için indeks
    - customers.site_config_id için indeks
    - customers.phone için indeks (performans için)

  4. Notlar
    - Telefon numarası tekrarı uygulama katmanında kontrol edilir
    - Trigger ile updated_at otomatik güncellenir
*/

-- site_configurations tablosu
CREATE TABLE IF NOT EXISTS site_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  site_url text NOT NULL,
  site_name text NOT NULL,
  field_mappings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- customers tablosu
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_config_id uuid REFERENCES site_configurations(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  notes text DEFAULT '',
  source_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- RLS etkinleştir
ALTER TABLE site_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- site_configurations policies
CREATE POLICY "Users can view own site configurations"
  ON site_configurations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own site configurations"
  ON site_configurations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own site configurations"
  ON site_configurations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own site configurations"
  ON site_configurations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- customers policies
CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM site_configurations
      WHERE site_configurations.id = customers.site_config_id
      AND site_configurations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_configurations
      WHERE site_configurations.id = customers.site_config_id
      AND site_configurations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM site_configurations
      WHERE site_configurations.id = customers.site_config_id
      AND site_configurations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_configurations
      WHERE site_configurations.id = customers.site_config_id
      AND site_configurations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM site_configurations
      WHERE site_configurations.id = customers.site_config_id
      AND site_configurations.user_id = auth.uid()
    )
  );

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_site_configurations_user_id ON site_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_site_configurations_site_url ON site_configurations(site_url);
CREATE INDEX IF NOT EXISTS idx_customers_site_config_id ON customers(site_config_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone != '';

-- updated_at için trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_site_configurations_updated_at
  BEFORE UPDATE ON site_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
