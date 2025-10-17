import { useState, useEffect } from 'react';
import { Save, MousePointer, X } from 'lucide-react';

interface FieldMapping {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  customer_list?: string;
}

interface SiteConfigFormProps {
  onSave: (siteName: string, siteUrl: string, fieldMappings: FieldMapping, listUrl?: string) => void;
  onCancel: () => void;
  initialData?: {
    siteName: string;
    siteUrl: string;
    fieldMappings: FieldMapping;
    listUrl?: string;
  };
  currentUrl?: string;
}

const FIELD_LABELS = {
  full_name: 'Ad Soyad',
  email: 'E-posta',
  phone: 'Telefon',
  address: 'Adres',
  notes: 'Notlar',
  customer_list: 'Müşteri Liste Elementleri'
};

function extractSiteName(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const parts = hostname.split('.');

    if (parts.length >= 2) {
      const domain = parts[parts.length - 2];
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    return hostname;
  } catch {
    return '';
  }
}

function simplifyUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}/`;
  } catch {
    return url;
  }
}

export default function SiteConfigForm({ onSave, onCancel, initialData, currentUrl }: SiteConfigFormProps) {
  const [siteName, setSiteName] = useState(initialData?.siteName || '');
  const [siteUrl, setSiteUrl] = useState(initialData?.siteUrl || '');
  const [fieldMappings, setFieldMappings] = useState<FieldMapping>(
    initialData?.fieldMappings || {
      full_name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      customer_list: ''
    }
  );
  const [listUrl, setListUrl] = useState(initialData?.listUrl || '');
  const [selectingField, setSelectingField] = useState<keyof FieldMapping | null>(null);

  useEffect(() => {
    if (currentUrl && !initialData) {
      const simplified = simplifyUrl(currentUrl);
      const extracted = extractSiteName(currentUrl);
      setSiteUrl(simplified);
      setSiteName(extracted);
    }
  }, [currentUrl, initialData]);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'ELEMENT_SELECTED' && selectingField) {
        setFieldMappings(prev => ({
          ...prev,
          [selectingField]: message.data.selector
        }));
        setSelectingField(null);
      } else if (message.type === 'SELECTION_CANCELLED') {
        setSelectingField(null);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [selectingField]);

  const startSelecting = async (field: keyof FieldMapping) => {
    setSelectingField(field);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'START_SELECTING',
        field: FIELD_LABELS[field]
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (siteName && siteUrl) {
      onSave(siteName, siteUrl, fieldMappings, listUrl);
    }
  };

  const isFormValid = siteName && siteUrl && Object.values(fieldMappings).some(v => v);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Site Adı
        </label>
        <input
          type="text"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="örn: Sahibinden.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Site URL
        </label>
        <input
          type="url"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://www.sahibinden.com"
          required
        />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Toplu Veri Çekme (Opsiyonel)</h3>
        <div className="space-y-2 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Müşteri Listesi Sayfası URL
            </label>
            <input
              type="url"
              value={listUrl}
              onChange={(e) => setListUrl(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              placeholder="https://example.com/mesajlarim"
            />
            <p className="text-xs text-gray-500 mt-1">
              Müşteri listesinin bulunduğu sayfa URL'si
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 w-32">Liste Elementleri:</span>
            <input
              type="text"
              value={fieldMappings.customer_list || ''}
              onChange={(e) => setFieldMappings(prev => ({ ...prev, customer_list: e.target.value }))}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              placeholder="CSS seçici (örn: li.customer-item a)"
              readOnly
            />
            <button
              type="button"
              onClick={() => startSelecting('customer_list')}
              disabled={selectingField !== null}
              className={`p-2 rounded ${
                selectingField === 'customer_list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              title="Mouse ile seç"
            >
              <MousePointer className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Tıklanabilir müşteri linklerini seçin. Sistem bu linklere sırayla girip veri çekecek.
          </p>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Alan Eşlemeleri</h3>
        <div className="space-y-2">
          {Object.entries(FIELD_LABELS).filter(([field]) => field !== 'customer_list').map(([field, label]) => (
            <div key={field} className="flex items-center gap-2">
              <span className="text-sm text-gray-600 w-20">{label}:</span>
              <input
                type="text"
                value={fieldMappings[field as keyof FieldMapping]}
                onChange={(e) => setFieldMappings(prev => ({ ...prev, [field]: e.target.value }))}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                placeholder="CSS seçici"
                readOnly
              />
              <button
                type="button"
                onClick={() => startSelecting(field as keyof FieldMapping)}
                disabled={selectingField !== null}
                className={`p-2 rounded ${
                  selectingField === field
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                title="Mouse ile seç"
              >
                <MousePointer className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {selectingField && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            Sayfada <strong>{FIELD_LABELS[selectingField]}</strong> alanını mouse ile tıklayın. ESC ile iptal edebilirsiniz.
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <button
          type="submit"
          disabled={!isFormValid}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          Kaydet
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
          İptal
        </button>
      </div>
    </form>
  );
}
