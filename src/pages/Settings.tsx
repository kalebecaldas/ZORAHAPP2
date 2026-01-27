import React, { useState, useEffect } from 'react';
import { api } from '../lib/utils';
import { toast } from 'sonner';
import {
  Save, Plus, Trash2, Edit2, X, Check,
  Settings as SettingsIcon, Building2, FileText,
  ChevronDown, ChevronUp, AlertCircle,
  Monitor, Upload, Image as ImageIcon, Webhook, Target
} from 'lucide-react';
import SystemSettingsTab from '../components/settings/SystemSettingsTab';
import WebhooksManagement from '../components/WebhooksManagement';
import GoalsManagement from '../components/settings/GoalsManagement';

interface Unit {
  id: string;
  name: string;
  address?: string;
  mapsUrl: string;
  phone: string;
}

interface Procedure {
  id: string;
  name: string;
  description: string;
  duration: number;
  availableUnits: string[];
  prices: Record<string, any>; // number | object
  packages: Record<string, Array<{ sessions: number, price: number }>>;
  convenios: string[];
}

interface ClinicData {
  name: string;
  businessHours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  insurance: string[];
  discountInsurance: string[];
  procedures: Procedure[];
  units: Unit[];
}

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('geral');
  const [clinicSubTab, setClinicSubTab] = useState<'convenios' | 'procedimentos'>('convenios');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);

  // System branding settings
  const [systemBranding, setSystemBranding] = useState({
    systemName: 'ZoraH',
    logoUrl: '/favicon.svg'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clinicRes, brandingRes] = await Promise.all([
        api.get('/api/settings/clinic-data'),
        api.get('/api/settings/system-branding').catch(() => ({ data: null })) // Optional, may not exist
      ]);

      setClinicData(clinicRes.data);

      // Map system branding
      if (brandingRes.data) {
        setSystemBranding({
          systemName: brandingRes.data.systemName || 'ZoraH',
          logoUrl: brandingRes.data.logoUrl || '/favicon.svg'
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClinicData = async () => {
    if (!clinicData) return;
    try {
      setSaving(true);
      await api.post('/api/settings/clinic-data', clinicData);
      toast.success('Dados da clínica salvos com sucesso');
      // ✅ Recarregar dados do servidor após salvar
      await fetchData();
    } catch (error) {
      console.error('Error saving clinic data:', error);
      toast.error('Erro ao salvar dados da clínica');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystemBranding = async () => {
    try {
      setSaving(true);
      const response = await api.put('/api/settings/system-branding', systemBranding);

      // Wait a bit for the file to be written
      await new Promise(resolve => setTimeout(resolve, 500));

      // Clear cache and force reload
      const { clearBrandingCache, getSystemBranding } = await import('../services/systemBrandingService');

      // Get fresh data from server
      const freshBranding = await getSystemBranding(true);

      // Update local state
      setSystemBranding(freshBranding);

      // Clear cache and notify all components
      clearBrandingCache();

      // Update favicon dynamically
      const faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (faviconLink && freshBranding.logoUrl) {
        const timestamp = Date.now();
        faviconLink.href = `${freshBranding.logoUrl}?t=${timestamp}`;
      }

      // Force reload all images with logo
      const logoUrl = freshBranding.logoUrl;
      const timestamp = Date.now();
      document.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src');
        const alt = img.getAttribute('alt');
        if (src && (src.includes('logo') || src.includes('favicon') || src === logoUrl || (alt && alt.includes('Logo')))) {
          (img as HTMLImageElement).src = `${logoUrl}?t=${timestamp}`;
        }
      });

      toast.success('Configurações de marca salvas com sucesso');

      // Reload page to apply changes everywhere
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error saving system branding:', error);
      toast.error('Erro ao salvar configurações de marca');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(svg\+xml|png|jpeg|jpg)$/)) {
      toast.error('Formato de arquivo inválido. Use SVG, PNG ou JPG.');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 2MB');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('logo', file);

      const response = await api.post('/api/settings/upload-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.logoUrl) {
        setSystemBranding({ ...systemBranding, logoUrl: response.data.logoUrl });

        // Clear cache and force reload
        const { clearBrandingCache } = await import('../services/systemBrandingService');
        clearBrandingCache();

        // Force browser to reload favicon and images
        const faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        if (faviconLink) {
          faviconLink.href = `${response.data.logoUrl}?t=${Date.now()}`;
        }

        // Force reload all images with the logo
        document.querySelectorAll('img').forEach((img) => {
          const src = img.getAttribute('src');
          if (src && (src.includes('logo') || src.includes('favicon'))) {
            (img as HTMLImageElement).src = `${response.data.logoUrl}?t=${Date.now()}`;
          }
        });

        toast.success('Logo enviada com sucesso!');

        // Reload page after a short delay to ensure all components update
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.response?.data?.error || 'Erro ao enviar logo');
    } finally {
      setSaving(false);
      // Reset input
      e.target.value = '';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!clinicData) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-8 h-8 text-blue-600" />
          Configurações
        </h1>
        <p className="text-gray-500">Gerencie os dados da clínica, convênios, procedimentos e integrações.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="w-full lg:w-64 flex-shrink-0 space-y-1">
          {[
            { id: 'geral', label: 'Geral', icon: Building2 },
            { id: 'clinica', label: 'Clínica', icon: Building2 },
            { id: 'metas', label: 'Metas', icon: Target },
            { id: 'configuracoes', label: 'Configurações', icon: SettingsIcon },
            { id: 'webhooks', label: 'Webhooks', icon: Webhook },
            { id: 'sistema', label: 'Branding', icon: Monitor },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px]">
          {activeTab === 'geral' && (
            <div className="p-6 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Informações da Clínica</h2>
                <button onClick={handleSaveClinicData} disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Save className="w-4 h-4" /> Salvar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Clínica</label>
                  <input
                    type="text"
                    value={clinicData.name}
                    onChange={(e) => setClinicData({ ...clinicData, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4">Horário de Funcionamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Segunda a Sexta</label>
                    <input
                      type="text"
                      value={clinicData.businessHours.weekdays}
                      onChange={(e) => setClinicData({
                        ...clinicData,
                        businessHours: { ...clinicData.businessHours, weekdays: e.target.value }
                      })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Sábado</label>
                    <input
                      type="text"
                      value={clinicData.businessHours.saturday}
                      onChange={(e) => setClinicData({
                        ...clinicData,
                        businessHours: { ...clinicData.businessHours, saturday: e.target.value }
                      })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Domingo</label>
                    <input
                      type="text"
                      value={clinicData.businessHours.sunday}
                      onChange={(e) => setClinicData({
                        ...clinicData,
                        businessHours: { ...clinicData.businessHours, sunday: e.target.value }
                      })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-medium text-gray-900">Unidades</h3>
                  <button
                    onClick={() => setClinicData({
                      ...clinicData,
                      units: [...clinicData.units, { id: `unit_${Date.now()}`, name: 'Nova Unidade', address: '', mapsUrl: '', phone: '' }]
                    })}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Unidade
                  </button>
                </div>
                <div className="space-y-4">
                  {clinicData.units.map((unit, index) => (
                    <div key={index} className="border rounded-lg p-4 relative bg-gray-50">
                      <button
                        onClick={() => {
                          const newUnits = [...clinicData.units];
                          newUnits.splice(index, 1);
                          setClinicData({ ...clinicData, units: newUnits });
                        }}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">ID (interno)</label>
                          <input
                            type="text"
                            value={unit.id}
                            onChange={(e) => {
                              const newUnits = [...clinicData.units];
                              newUnits[index].id = e.target.value;
                              setClinicData({ ...clinicData, units: newUnits });
                            }}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Nome</label>
                          <input
                            type="text"
                            value={unit.name}
                            onChange={(e) => {
                              const newUnits = [...clinicData.units];
                              newUnits[index].name = e.target.value;
                              setClinicData({ ...clinicData, units: newUnits });
                            }}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Endereço Completo</label>
                          <input
                            type="text"
                            value={unit.address || ''}
                            onChange={(e) => {
                              const newUnits = [...clinicData.units];
                              newUnits[index].address = e.target.value;
                              setClinicData({ ...clinicData, units: newUnits });
                            }}
                            placeholder="Ex: Rua Vieiralves, 1230 - Vieiralves, Manaus/AM"
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                          <input
                            type="text"
                            value={unit.phone}
                            onChange={(e) => {
                              const newUnits = [...clinicData.units];
                              newUnits[index].phone = e.target.value;
                              setClinicData({ ...clinicData, units: newUnits });
                            }}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Link Maps</label>
                          <input
                            type="text"
                            value={unit.mapsUrl}
                            onChange={(e) => {
                              const newUnits = [...clinicData.units];
                              newUnits[index].mapsUrl = e.target.value;
                              setClinicData({ ...clinicData, units: newUnits });
                            }}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clinica' && (
            <div className="p-6 space-y-6">
              {/* Header com título */}
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h2 className="text-lg font-semibold">Gestão da Clínica</h2>
                  <p className="text-sm text-gray-500">Gerencie convênios e procedimentos</p>
                </div>
                <button 
                  onClick={handleSaveClinicData} 
                  disabled={saving} 
                  className="btn-primary flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Tudo'}
                </button>
              </div>

              {/* Sub-abas horizontais */}
              <div className="flex gap-2 border-b">
                <button
                  onClick={() => setClinicSubTab('convenios')}
                  className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                    clinicSubTab === 'convenios'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Convênios
                </button>
                <button
                  onClick={() => setClinicSubTab('procedimentos')}
                  className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                    clinicSubTab === 'procedimentos'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Procedimentos
                </button>
              </div>

              {/* Conteúdo das sub-abas */}
              <div className="mt-4">
                {clinicSubTab === 'convenios' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Regular Insurance */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-900">Convênios (Lista Padrão)</h3>
                          <button
                            onClick={() => setClinicData({ ...clinicData!, insurance: [...clinicData!.insurance, 'NOVO CONVÊNIO'] })}
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" /> Adicionar
                          </button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-[500px] overflow-y-auto">
                          {clinicData!.insurance.map((ins, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={ins}
                                onChange={(e) => {
                                  const newIns = [...clinicData!.insurance];
                                  newIns[idx] = e.target.value;
                                  setClinicData({ ...clinicData!, insurance: newIns });
                                }}
                                className="flex-1 border rounded px-3 py-2 text-sm"
                              />
                              <button
                                onClick={() => {
                                  const newIns = [...clinicData!.insurance];
                                  newIns.splice(idx, 1);
                                  setClinicData({ ...clinicData!, insurance: newIns });
                                }}
                                className="text-red-500 hover:text-red-700 px-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Discount Insurance */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-900">Convênios com Desconto</h3>
                          <button
                            onClick={() => setClinicData({ ...clinicData!, discountInsurance: [...clinicData!.discountInsurance, 'NOVO CONVÊNIO'] })}
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" /> Adicionar
                          </button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-[500px] overflow-y-auto">
                          {clinicData!.discountInsurance.map((ins, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={ins}
                                onChange={(e) => {
                                  const newIns = [...clinicData!.discountInsurance];
                                  newIns[idx] = e.target.value;
                                  setClinicData({ ...clinicData!, discountInsurance: newIns });
                                }}
                                className="flex-1 border rounded px-3 py-2 text-sm"
                              />
                              <button
                                onClick={() => {
                                  const newIns = [...clinicData!.discountInsurance];
                                  newIns.splice(idx, 1);
                                  setClinicData({ ...clinicData!, discountInsurance: newIns });
                                }}
                                className="text-red-500 hover:text-red-700 px-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {clinicSubTab === 'procedimentos' && (
                  <div className="space-y-6">
                    <ProceduresEditor 
                      clinicData={clinicData!}
                      setClinicData={setClinicData}
                      onSave={handleSaveClinicData}
                      saving={saving}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Configurações */}
          {activeTab === 'configuracoes' && (
            <div className="p-6">
              <SystemSettingsTab />
            </div>
          )}

          {activeTab === 'metas' && (
            <div className="p-6">
              <GoalsManagement />
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div className="p-6">
              <WebhooksManagement />
            </div>
          )}

          {activeTab === 'sistema' && (
            <div className="p-6 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Configurações do Sistema</h2>
                <button
                  onClick={handleSaveSystemBranding}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Salvar
                </button>
              </div>

              <div className="space-y-6">
                {/* Nome do Sistema */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Sistema
                  </label>
                  <input
                    type="text"
                    value={systemBranding.systemName}
                    onChange={(e) => setSystemBranding({ ...systemBranding, systemName: e.target.value })}
                    placeholder="Ex: ZoraH"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este nome aparecerá na página de login, sidebar e em outros lugares do sistema.
                  </p>
                </div>

                {/* Logo do Sistema */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo do Sistema
                  </label>

                  {/* Preview da Logo */}
                  <div className="mb-4 flex items-center space-x-4">
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                      <img
                        src={systemBranding.logoUrl}
                        alt="Logo Preview"
                        className="h-12 w-12 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/favicon.svg';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">
                        <strong>URL atual:</strong> {systemBranding.logoUrl}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        A logo deve ser um arquivo SVG, PNG ou JPG. Use uma URL ou caminho relativo (ex: /favicon.svg)
                      </p>
                    </div>
                  </div>

                  {/* Input para URL da Logo */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600">
                      URL ou Caminho da Logo
                    </label>
                    <input
                      type="text"
                      value={systemBranding.logoUrl}
                      onChange={(e) => setSystemBranding({ ...systemBranding, logoUrl: e.target.value })}
                      placeholder="/favicon.svg ou https://exemplo.com/logo.svg"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Upload de Logo (opcional - para upload direto) */}
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Ou faça upload de uma nova logo
                    </label>
                    <input
                      type="file"
                      accept="image/svg+xml,image/png,image/jpeg,image/jpg"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Selecionar arquivo</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos aceitos: SVG, PNG, JPG (recomendado: SVG para melhor qualidade)
                    </p>
                  </div>
                </div>

                {/* Preview de como aparece */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Preview</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {/* Preview Sidebar */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <img
                          src={systemBranding.logoUrl}
                          alt="Logo"
                          className="h-8 w-8"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/favicon.svg';
                          }}
                        />
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{systemBranding.systemName}</h4>
                          <p className="text-xs text-gray-500">WhatsApp + IA</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-component for Procedures to keep main file cleaner
const ProceduresEditor = ({ clinicData, setClinicData, onSave, saving }: {
  clinicData: ClinicData,
  setClinicData: (d: ClinicData) => void,
  onSave: () => void,
  saving: boolean
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProcedures = clinicData.procedures.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProcedure = () => {
    const newProc: Procedure = {
      id: `proc_${Date.now()}`,
      name: 'Novo Procedimento',
      description: '',
      duration: 30,
      availableUnits: [],
      prices: {},
      packages: {},
      convenios: []
    };
    setClinicData({ ...clinicData, procedures: [...clinicData.procedures, newProc] });
    setExpandedId(newProc.id);
  };

  const handleDelete = (index: number) => {
    if (confirm('Tem certeza que deseja remover este procedimento?')) {
      const newProcs = [...clinicData.procedures];
      newProcs.splice(index, 1);
      setClinicData({ ...clinicData, procedures: newProcs });
    }
  };

  const updateProcedure = (index: number, field: keyof Procedure, value: any) => {
    const newProcs = [...clinicData.procedures];
    newProcs[index] = { ...newProcs[index], [field]: value };
    setClinicData({ ...clinicData, procedures: newProcs });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-md font-semibold">Lista de Procedimentos</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded-md px-3 py-1 text-sm w-64"
            />
          </div>
        </div>
        <button onClick={handleAddProcedure} className="flex items-center gap-1 px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm">
          <Plus className="w-4 h-4" /> Adicionar Procedimento
        </button>
      </div>

      <div className="space-y-4">
        {filteredProcedures.map((proc, idx) => {
          const realIndex = clinicData.procedures.findIndex(p => p.id === proc.id);
          const isExpanded = expandedId === proc.id;

          return (
            <div key={proc.id} className="border rounded-lg bg-white overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(isExpanded ? null : proc.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{proc.name}</h3>
                    <p className="text-xs text-gray-500">{proc.id} • {proc.duration} min</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(realIndex); }}
                  className="text-gray-400 hover:text-red-500 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {isExpanded && (
                <div className="p-4 border-t bg-gray-50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                      <input
                        type="text"
                        value={proc.name}
                        onChange={(e) => updateProcedure(realIndex, 'name', e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">ID (slug)</label>
                      <input
                        type="text"
                        value={proc.id}
                        onChange={(e) => updateProcedure(realIndex, 'id', e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                      <textarea
                        value={proc.description}
                        onChange={(e) => updateProcedure(realIndex, 'description', e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm h-20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Duração (min)</label>
                      <input
                        type="number"
                        value={proc.duration}
                        onChange={(e) => updateProcedure(realIndex, 'duration', Number(e.target.value))}
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  {/* Units & Prices */}
                  <div className="border rounded-lg p-4 bg-white">
                    <h4 className="font-medium text-sm mb-3">Unidades e Preços</h4>
                    <div className="space-y-4">
                      {clinicData.units.map(unit => {
                        const isAvailable = proc.availableUnits.includes(unit.id);
                        const price = proc.prices[unit.id];
                        const packages = proc.packages[unit.id] || [];

                        return (
                          <div key={unit.id} className="border-b pb-4 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="checkbox"
                                checked={isAvailable}
                                onChange={(e) => {
                                  const newUnits = e.target.checked
                                    ? [...proc.availableUnits, unit.id]
                                    : proc.availableUnits.filter(u => u !== unit.id);
                                  updateProcedure(realIndex, 'availableUnits', newUnits);
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm font-medium">{unit.name}</span>
                            </div>

                            {isAvailable && (
                              <div className="ml-6 space-y-3">
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Preço (R$)</label>
                                  {typeof price === 'object' && price !== null ? (
                                    <div className="text-xs text-orange-600 flex items-center gap-1 mb-1">
                                      <AlertCircle className="w-3 h-3" /> Preço complexo (objeto). Edite via JSON abaixo.
                                    </div>
                                  ) : null}
                                  <input
                                    type="text"
                                    value={typeof price === 'object' && price !== null ? JSON.stringify(price) : (price || '')}
                                    onChange={(e) => {
                                      let val: any = e.target.value;
                                      // Try to parse as number if simple
                                      if (!isNaN(Number(val)) && val !== '') val = Number(val);
                                      // Try to parse as JSON if starts with {
                                      if (typeof val === 'string' && val.trim().startsWith('{')) {
                                        try { val = JSON.parse(val); } catch { }
                                      }

                                      const newPrices = { ...proc.prices, [unit.id]: val };
                                      updateProcedure(realIndex, 'prices', newPrices);
                                    }}
                                    placeholder="Ex: 100 ou { ... }"
                                    className="w-full border rounded px-2 py-1 text-sm"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Pacotes (JSON)</label>
                                  <textarea
                                    value={JSON.stringify(packages)}
                                    onChange={(e) => {
                                      try {
                                        const val = JSON.parse(e.target.value);
                                        const newPackages = { ...proc.packages, [unit.id]: val };
                                        updateProcedure(realIndex, 'packages', newPackages);
                                      } catch {
                                        // Allow typing invalid JSON temporarily? No, better to validate on blur or use a better editor.
                                        // For now, simple text edit that must be valid JSON to save effectively
                                      }
                                    }}
                                    className="w-full border rounded px-2 py-1 h-16 font-mono text-xs"
                                  />
                                  <p className="text-[10px] text-gray-400">Ex: [{`{"sessions": 10, "price": 800}`}]</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Convenios */}
                  <div className="border rounded-lg p-4 bg-white">
                    <h4 className="font-medium text-sm mb-3">Convênios Aceitos</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {[...clinicData.insurance, ...clinicData.discountInsurance].map(ins => (
                        <label key={ins} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={proc.convenios.includes(ins)}
                            onChange={(e) => {
                              const newConvenios = e.target.checked
                                ? [...proc.convenios, ins]
                                : proc.convenios.filter(c => c !== ins);
                              updateProcedure(realIndex, 'convenios', newConvenios);
                            }}
                            className="rounded border-gray-300"
                          />
                          {ins}
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
