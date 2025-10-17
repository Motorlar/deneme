import { useState, useEffect } from 'react';
import { Settings, ChevronDown, ChevronRight, Download, Plus, Trash2, Play, LogIn } from 'lucide-react';
import { supabase, SiteConfiguration, Customer } from './lib/supabase';
import { exportToCSV } from './lib/csv';
import SiteConfigForm from './components/SiteConfigForm';
import CustomerList from './components/CustomerList';

type View = 'main' | 'config' | 'login' | 'editConfig';

function App() {
  const [view, setView] = useState<View>('login');
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [showSites, setShowSites] = useState(false); // varsayılan olarak açık



  const [siteConfigs, setSiteConfigs] = useState<SiteConfiguration[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<SiteConfiguration | null>(null);
  const [editingConfig, setEditingConfig] = useState<SiteConfiguration | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadSiteConfigs();
      loadAllCustomers();
      getCurrentTabUrl();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      setView('main');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setError(error.message);
    } else if (data.user) {
      setUser(data.user);
      setView('main');
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setError(error.message);
    } else if (data.user) {
      setUser(data.user);
      setView('main');
    }

    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('login');
  };

  const getCurrentTabUrl = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.url) {
      setCurrentUrl(tab.url);
      checkForMatchingSite(tab.url);
    }
  };

  const checkForMatchingSite = (url: string) => {
    try {
      const currentHostname = new URL(url).hostname;
      const matchingConfig = siteConfigs.find(config => {
        try {
          const configHostname = new URL(config.site_url).hostname;
          return currentHostname.includes(configHostname) || configHostname.includes(currentHostname);
        } catch {
          return false;
        }
      });
      if (matchingConfig && selectedConfig?.id !== matchingConfig.id) {
        setSelectedConfig(matchingConfig);
      }
    } catch (e) {
      console.error('Error checking URL:', e);
    }
  };

  const loadSiteConfigs = async () => {
    const { data, error } = await supabase
      .from('site_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setSiteConfigs(data);
    }
  };

  const loadAllCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*, site_configurations!inner(site_name)')
      .order('created_at', { ascending: false });

    if (data) {
      setAllCustomers(data);
    }
  };

  const saveSiteConfig = async (siteName: string, siteUrl: string, fieldMappings: any, listUrl?: string) => {
    if (editingConfig) {
      const { data, error } = await supabase
        .from('site_configurations')
        .update({
          site_name: siteName,
          site_url: siteUrl,
          field_mappings: fieldMappings,
          list_url: listUrl || null
        })
        .eq('id', editingConfig.id)
        .select()
        .single();

      if (data) {
        await loadSiteConfigs();
        await loadAllCustomers();
        setEditingConfig(null);
        setView('main');
      }
    } else {
      const { data, error } = await supabase
        .from('site_configurations')
        .insert({
          user_id: user.id,
          site_name: siteName,
          site_url: siteUrl,
          field_mappings: fieldMappings,
          list_url: listUrl || null
        })
        .select()
        .single();

      if (data) {
        await loadSiteConfigs();
        setView('main');
      }
    }
  };

  const deleteSiteConfig = async (id: string) => {
    await supabase.from('site_configurations').delete().eq('id', id);
    await loadSiteConfigs();
    await loadAllCustomers();
    if (selectedConfig?.id === id) {
      setSelectedConfig(null);
    }
  };

  const deleteCustomer = async (id: string) => {
    await supabase.from('customers').delete().eq('id', id);
    await loadAllCustomers();
  };

  const extractDataFromPage = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id || !tab.url) return;

    // Aktif sekmenin URL'sine göre site yapılandırmasını bul
    const currentTabUrl = tab.url;
    const matchingConfig = siteConfigs.find(config => {
      try {
        const currentHostname = new URL(currentTabUrl).hostname;
        const configHostname = new URL(config.site_url).hostname;
        return currentHostname.includes(configHostname) || configHostname.includes(currentHostname);
      } catch {
        return false;
      }
    });

    if (!matchingConfig) {
      setDuplicateWarning('Bu site için yapılandırma bulunamadı!');
      setTimeout(() => setDuplicateWarning(''), 4000);
      return;
    }

    chrome.tabs.sendMessage(
      tab.id,
      {
        type: 'EXTRACT_DATA',
        fieldMappings: matchingConfig.field_mappings
      },
      async (response) => {
        if (response?.success && response.data) {
          const phone = response.data.phone || '';

          if (!phone) {
            setDuplicateWarning('Telefon numarası olmayan müşteri kaydedilmedi!');
            setTimeout(() => setDuplicateWarning(''), 4000);
            return;
          }

          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();

          if (existingCustomer) {
            setDuplicateWarning('Bu telefon numarası zaten kayıtlı!');
            setTimeout(() => setDuplicateWarning(''), 4000);
            return;
          }

          const { data, error } = await supabase
            .from('customers')
            .insert({
              site_config_id: matchingConfig.id,
              full_name: response.data.full_name || '',
              email: response.data.email || '',
              phone: phone,
              address: response.data.address || '',
              notes: response.data.notes || '',
              source_url: currentTabUrl
            })
            .select()
            .single();

          if (data) {
            await loadAllCustomers();
          }
        }
      }
    );
  };

  const handleExportCSV = () => {
    if (allCustomers.length > 0) {
      exportToCSV(allCustomers, 'tum_musteriler.csv');
    }
  };

  const startBulkExtraction = async () => {
    if (!selectedConfig?.field_mappings?.customer_list || !selectedConfig?.list_url) {
      setDuplicateWarning('Toplu veri çekme için müşteri listesi yapılandırması gerekli!');
      setTimeout(() => setDuplicateWarning(''), 4000);
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    const listUrl = selectedConfig.list_url;

    chrome.tabs.update(tab.id, { url: listUrl }, () => {
      setTimeout(() => {
        if (tab.id) {
          chrome.tabs.sendMessage(
            tab.id,
            {
              type: 'START_BULK_EXTRACTION',
              config: {
                customerListSelector: selectedConfig.field_mappings.customer_list,
                fieldMappings: selectedConfig.field_mappings,
                configId: selectedConfig.id
              }
            },
            (response) => {
              if (response?.success) {
                setDuplicateWarning(`Toplu veri çekme başlatıldı. ${response.totalLinks} müşteri bulundu.`);
                setTimeout(() => setDuplicateWarning(''), 4000);
              } else {
                setDuplicateWarning('Toplu veri çekme başlatılamadı!');
                setTimeout(() => setDuplicateWarning(''), 4000);
              }
            }
          );
        }
      }, 2000);
    });
  };

  if (view === 'login') {
    return (
      <div className="p-6 bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Müşteri Veri Toplama</h1>
          <p className="text-sm text-gray-600 mt-1">Giriş yapın veya kayıt olun</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifre"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
            <button
              type="button"
              onClick={handleSignup}
              disabled={isLoading}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
            >
              Kayıt Ol
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (view === 'config' || view === 'editConfig') {
    return (
      <div className="p-6 bg-gradient-to-br from-blue-50 to-white">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {editingConfig ? 'Site Yapılandırmasını Düzenle' : 'Yeni Site Yapılandırması'}
        </h2>
        <SiteConfigForm
          onSave={saveSiteConfig}
          onCancel={() => {
            setEditingConfig(null);
            setView('main');
          }}
          initialData={editingConfig ? {
            siteName: editingConfig.site_name,
            siteUrl: editingConfig.site_url,
            fieldMappings: editingConfig.field_mappings,
            listUrl: editingConfig.list_url || ''
          } : undefined}
          currentUrl={currentUrl}
        />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white">
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900">Müşteri Veri Toplama</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Çıkış
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-900">
            {selectedConfig ? selectedConfig.site_name : 'Tüm Siteler'}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {allCustomers.length} müşteri kaydı
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setView('config')}
            className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Yeni Site
          </button>
          <button
            onClick={extractDataFromPage}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            Veri Çek
          </button>
          <button
            onClick={startBulkExtraction}
            disabled={!selectedConfig?.field_mappings?.customer_list || !selectedConfig?.list_url}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            title="Toplu veri çekme"
          >
            <Download className="w-4 h-4" />
            Toplu
          </button>
        </div>
        {duplicateWarning && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mt-2 text-center">
              {duplicateWarning}
            </div>
          )}


        {siteConfigs.length > 0 && (
  <div className="bg-white rounded-lg border border-gray-200 p-3">
    {/* Başlık */}
    <button
      onClick={() => setShowSites((prev) => !prev)}
      className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2"
    >
      <span>Kayıtlı Siteler</span>
      {showSites ? (
        <ChevronDown className="w-4 h-4 text-gray-600" />
      ) : (
        <ChevronRight className="w-4 h-4 text-gray-600" />
      )}
    </button>

    {/* Açılır liste */}
    {showSites && (
      <div className="space-y-1">
        {siteConfigs.map((config) => (
          <div
            key={config.id}
            className={`flex items-center justify-between p-2 rounded transition-colors ${
              selectedConfig?.id === config.id
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-gray-50'
            }`}
          >
            <button
              onClick={() => setSelectedConfig(config)}
              className="flex-1 text-left text-sm font-medium text-gray-900"
            >
              {config.site_name}
            </button>

            <div className="flex gap-1">
              <button
                onClick={() => {
                  setEditingConfig(config);
                  setView('editConfig');
                }}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Düzenle"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteSiteConfig(config.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Müşteriler</h3>
            {allCustomers.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Download className="w-4 h-4" />
                CSV İndir
              </button>
            )}
          </div>
          <CustomerList customers={allCustomers} onDelete={deleteCustomer} />
        </div>

        {siteConfigs.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            Başlamak için yeni bir site yapılandırması ekleyin
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
