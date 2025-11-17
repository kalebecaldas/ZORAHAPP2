import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  TestTube,
  Bot,
  Phone,
  Key,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { api } from '../lib/utils';
import { toast } from 'sonner';

interface SettingsData {
  clinicName: string;
  phoneNumber: string;
  address: string;
  workingHours: string;
  whatsappToken: string;
  openaiApiKey: string;
  metaAppId: string;
  metaAppSecret: string;
  metaPhoneNumberId: string;
  metaBusinessAccountId: string;
  webhookUrl: string;
  autoReplyEnabled: boolean;
  evaluationRequired: boolean;
  defaultResponseTime: number;
  maxConversationTime: number;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    clinicName: '',
    phoneNumber: '',
    address: '',
    workingHours: '',
    whatsappToken: '',
    openaiApiKey: '',
    metaAppId: '',
    metaAppSecret: '',
    metaPhoneNumberId: '',
    metaBusinessAccountId: '',
    webhookUrl: '',
    autoReplyEnabled: true,
    evaluationRequired: false,
    defaultResponseTime: 5,
    maxConversationTime: 30
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<any>({});

  const [insurances, setInsurances] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [newInsurance, setNewInsurance] = useState({ code: '', name: '', displayName: '', discount: false, notes: '' });
  const [newProcedure, setNewProcedure] = useState({ code: '', name: '', description: '', basePrice: 0, requiresEvaluation: false, duration: 30, categories: '' });
  const [linkInsuranceCode, setLinkInsuranceCode] = useState('');
  const [linkProcedureCode, setLinkProcedureCode] = useState('');
  const [expandedInsurance, setExpandedInsurance] = useState<string | null>(null);
  const [insuranceProcedures, setInsuranceProcedures] = useState<Record<string, any[]>>({});
  const [procSearch, setProcSearch] = useState('');
  const [procFilterInsurance, setProcFilterInsurance] = useState('');
  const [procFilterCoverageCodes, setProcFilterCoverageCodes] = useState<string[]>([]);
  const [insPage, setInsPage] = useState(1);
  const [insLimit, setInsLimit] = useState(10);
  const [insTotalPages, setInsTotalPages] = useState(1);
  const [insSearch, setInsSearch] = useState('');
  const [procPage, setProcPage] = useState(1);
  const [procLimit, setProcLimit] = useState(10);
  const [procTotalPages, setProcTotalPages] = useState(1);
  const [insSortCoverage, setInsSortCoverage] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<any | null>(null);
  const [editingProcedure, setEditingProcedure] = useState<any | null>(null);
  const [expandedProcedure, setExpandedProcedure] = useState<string | null>(null);
  const [procedureAvailability, setProcedureAvailability] = useState<Record<string, any>>({});

  const [clinics, setClinics] = useState<any[]>([]);
  const [newClinic, setNewClinic] = useState({
    code: '',
    name: '',
    displayName: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    openingHours: '',
    specialties: '',
    parkingAvailable: false,
    accessibility: ''
  });
  const [editingClinic, setEditingClinic] = useState<any | null>(null);
  const [clinicPage, setClinicPage] = useState(1);
  const [clinicLimit, setClinicLimit] = useState(10);
  const [clinicTotalPages, setClinicTotalPages] = useState(1);
  const [clinicSearch, setClinicSearch] = useState('');

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      const data = response.data || {};
      const mapped: SettingsData = {
        clinicName: data.clinic?.name || settings.clinicName,
        phoneNumber: data.clinic?.phone || settings.phoneNumber,
        address: data.clinic?.address || settings.address,
        workingHours: data.businessHours?.weekdays || settings.workingHours,
        whatsappToken: '',
        openaiApiKey: data.ai?.openaiApiKeyMasked ? data.ai.openaiApiKeyMasked : '',
        metaAppId: '',
        metaAppSecret: '',
        metaPhoneNumberId: data.whatsapp?.phoneNumberId || settings.metaPhoneNumberId,
        metaBusinessAccountId: '',
        webhookUrl: '',
        autoReplyEnabled: settings.autoReplyEnabled,
        evaluationRequired: settings.evaluationRequired,
        defaultResponseTime: settings.defaultResponseTime,
        maxConversationTime: settings.maxConversationTime
      };
      setSettings(mapped);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchEditableData();
    fetchRolePermissions();
  }, []);

  const fetchRolePermissions = async () => {
    try {
      const res = await api.get('/api/permissions');
      setRolePermissions(res.data?.permissions || {});
    } catch (error) {}
  };

  const saveRolePermissions = async () => {
    try {
      await api.put('/api/permissions', rolePermissions);
      toast.success('Permissões atualizadas');
    } catch (error) {
      toast.error('Erro ao atualizar permissões');
    }
  };

  const fetchEditableData = async () => {
    try {
      const [insRes, procRes, clinicRes] = await Promise.all([
        api.get(`/api/clinic/insurances?q=${encodeURIComponent(insSearch)}&page=${insPage}&limit=${insLimit}`),
        api.get(`/api/clinic/procedures?q=${encodeURIComponent(procSearch)}&page=${procPage}&limit=${procLimit}`),
        api.get(`/api/clinics?q=${encodeURIComponent(clinicSearch)}&page=${clinicPage}&limit=${clinicLimit}`)
      ]);
      setInsurances(insRes.data?.insurances || []);
      setInsTotalPages(insRes.data?.pagination?.pages || 1);
      setProcedures(procRes.data?.procedures || []);
      setProcTotalPages(procRes.data?.pagination?.pages || 1);
      setClinics(clinicRes.data?.clinics || []);
      setClinicTotalPages(clinicRes.data?.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching clinic editable data:', error);
    }
  };

  const fetchInsuranceProcedures = async (code: string) => {
    try {
      const res = await api.get(`/api/cobertura/convenios/${code}/procedimentos`);
      setInsuranceProcedures(prev => ({ ...prev, [code]: res.data?.procedimentos || [] }));
    } catch (error) {}
  };

  const applyProcInsuranceFilter = async (code: string) => {
    setProcFilterInsurance(code);
    if (!code) {
      setProcFilterCoverageCodes([]);
      return;
    }
    try {
      const res = await api.get(`/api/cobertura/convenios/${code}/procedimentos`);
      const codes = (res.data?.procedimentos || []).map((p: any) => p.id);
      setProcFilterCoverageCodes(codes);
    } catch (error) {
      setProcFilterCoverageCodes([]);
    }
  };

  const fetchProcedureAvailability = async (clinicCode: string, procedureCode: string) => {
    try {
      const res = await api.get(`/api/clinics/${clinicCode}/procedures/${procedureCode}/availability`);
      const key = `${clinicCode}:${procedureCode}`;
      setProcedureAvailability(prev => ({ ...prev, [key]: res.data?.availability || {} }));
    } catch (error) {}
  };

  const saveProcedureAvailability = async (clinicCode: string, procedureCode: string) => {
    const key = `${clinicCode}:${procedureCode}`;
    const availability = procedureAvailability[key] || {};
    try {
      await api.put(`/api/clinics/${clinicCode}/procedures/${procedureCode}/availability`, { availability });
      toast.success('Disponibilidade atualizada');
    } catch (error) {
      toast.error('Erro ao atualizar disponibilidade');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        clinic: {
          name: settings.clinicName,
          address: settings.address,
          phone: settings.phoneNumber,
          email: ''
        },
        businessHours: {
          weekdays: settings.workingHours,
          saturday: '08:00 - 12:00',
          sunday: 'Fechado'
        }
      };
      if (settings.openaiApiKey && settings.openaiApiKey !== '********') {
        payload.ai = { openaiApiKey: settings.openaiApiKey };
      }
      await api.put('/api/settings', payload);
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const testWhatsAppConnection = async () => {
    setTestingWhatsApp(true);
    try {
      const response = await api.post('/api/settings/whatsapp/test', {
        phone: settings.phoneNumber || '5511999999999',
        message: 'Teste de conexão WhatsApp'
      });
      if (response.data.success) {
        toast.success('Conexão WhatsApp testada com sucesso');
      } else {
        toast.error('Falha na conexão WhatsApp: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error testing WhatsApp:', error);
      toast.error('Erro ao testar conexão WhatsApp');
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const testAIConnection = async () => {
    setTestingAI(true);
    try {
      const response = await api.post('/api/settings/ai/test', {
        message: 'Olá IA, teste de conexão',
        context: {}
      });
      if (response.data.success) {
        toast.success('Conexão IA testada com sucesso');
      } else {
        toast.error('Falha na conexão IA: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error testing AI:', error);
      toast.error('Erro ao testar conexão IA');
    } finally {
      setTestingAI(false);
    }
  };

  const createInsurance = async () => {
    try {
      if (!newInsurance.code || !newInsurance.name || !newInsurance.displayName) {
        toast.error('Preencha código, nome e nome de exibição do convênio');
        return;
      }
      await api.post('/api/clinic/insurances', newInsurance);
      toast.success('Convênio criado');
      setNewInsurance({ code: '', name: '', displayName: '', discount: false, notes: '' });
      fetchEditableData();
    } catch (error: any) {
      toast.error('Erro ao criar convênio');
    }
  };

  const updateInsurance = async (code: string, payload: any) => {
    try {
      await api.put(`/api/clinic/insurances/${code}`, payload);
      toast.success('Convênio atualizado');
      fetchEditableData();
    } catch (error) {
      toast.error('Erro ao atualizar convênio');
    }
  };

  const deleteInsurance = async (code: string) => {
    try {
      await api.delete(`/api/clinic/insurances/${code}`);
      toast.success('Convênio removido');
      fetchEditableData();
    } catch (error) {
      toast.error('Erro ao remover convênio');
    }
  };

  const createProcedure = async () => {
    try {
      if (!newProcedure.code || !newProcedure.name || !newProcedure.description) {
        toast.error('Preencha código, nome e descrição do procedimento');
        return;
      }
      const payload = {
        ...newProcedure,
        basePrice: Number(newProcedure.basePrice),
        duration: Number(newProcedure.duration),
        categories: newProcedure.categories.split(',').map(s => s.trim()).filter(Boolean)
      };
      await api.post('/api/clinic/procedures', payload);
      toast.success('Procedimento criado');
      setNewProcedure({ code: '', name: '', description: '', basePrice: 0, requiresEvaluation: false, duration: 30, categories: '' });
      fetchEditableData();
    } catch (error) {
      toast.error('Erro ao criar procedimento');
    }
  };

  const updateProcedure = async (code: string, payload: any) => {
    try {
      await api.put(`/api/clinic/procedures/${code}`, payload);
      toast.success('Procedimento atualizado');
      fetchEditableData();
    } catch (error) {
      toast.error('Erro ao atualizar procedimento');
    }
  };

  const deleteProcedure = async (code: string) => {
    try {
      await api.delete(`/api/clinic/procedures/${code}`);
      toast.success('Procedimento removido');
      fetchEditableData();
    } catch (error) {
      toast.error('Erro ao remover procedimento');
    }
  };

  const linkProcedureToInsurance = async () => {
    try {
      if (!linkInsuranceCode || !linkProcedureCode) {
        toast.error('Selecione convênio e procedimento');
        return;
      }
      await api.post(`/api/clinic/insurances/${linkInsuranceCode}/procedures/${linkProcedureCode}`);
      toast.success('Procedimento vinculado ao convênio');
      setLinkInsuranceCode('');
      setLinkProcedureCode('');
      fetchEditableData();
    } catch (error) {
      toast.error('Erro ao vincular procedimento');
    }
  };

  const unlinkProcedureFromInsurance = async (insuranceCode: string, procedureCode: string) => {
    try {
      await api.delete(`/api/clinic/insurances/${insuranceCode}/procedures/${procedureCode}`);
      toast.success('Procedimento desvinculado');
      fetchEditableData();
      fetchInsuranceProcedures(insuranceCode);
    } catch (error) {
      toast.error('Erro ao desvincular procedimento');
    }
  };

  const createClinic = async () => {
    try {
      if (!newClinic.code || !newClinic.name || !newClinic.displayName) {
        toast.error('Preencha código, nome e nome de exibição da clínica');
        return;
      }
      const payload = {
        ...newClinic,
        specialties: newClinic.specialties.split(',').map(s => s.trim()).filter(Boolean),
        accessibility: newClinic.accessibility.split(',').map(s => s.trim()).filter(Boolean)
      };
      await api.post('/api/clinics', payload);
      toast.success('Clínica criada');
      setNewClinic({
        code: '',
        name: '',
        displayName: '',
        address: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        openingHours: '',
        specialties: '',
        parkingAvailable: false,
        accessibility: ''
      });
      fetchEditableData();
    } catch (error: any) {
      toast.error('Erro ao criar clínica');
    }
  };

  const updateClinic = async (code: string, payload: any) => {
    try {
      await api.put(`/api/clinics/${code}`, payload);
      toast.success('Clínica atualizada');
      fetchEditableData();
    } catch (error) {
      toast.error('Erro ao atualizar clínica');
    }
  };

  const deleteClinic = async (code: string) => {
    try {
      await api.delete(`/api/clinics/${code}`);
      toast.success('Clínica removida');
      fetchEditableData();
    } catch (error) {
      toast.error('Erro ao remover clínica');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <SettingsIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-600 mt-2">Configure o sistema de atendimento</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Clinic Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Phone className="h-5 w-5 mr-2 text-blue-600" />
            Informações da Clínica
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Clínica</label>
              <input
                type="text"
                value={settings.clinicName}
                onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={settings.phoneNumber}
                onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Funcionamento</label>
              <input
                type="text"
                value={settings.workingHours}
                onChange={(e) => setSettings({ ...settings, workingHours: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Clinic Management */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Phone className="h-5 w-5 mr-2 text-blue-600" />
            Gerenciamento de Clínicas
          </h2>
          
          {/* Add New Clinic Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input
                type="text"
                value={newClinic.code}
                onChange={(e) => setNewClinic({ ...newClinic, code: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: vieiralves"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={newClinic.name}
                onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Clínica Vieiralves"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Exibição</label>
              <input
                type="text"
                value={newClinic.displayName}
                onChange={(e) => setNewClinic({ ...newClinic, displayName: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Unidade Vieiralves"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <input
                type="text"
                value={newClinic.address}
                onChange={(e) => setNewClinic({ ...newClinic, address: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rua, número, complemento"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input
                type="text"
                value={newClinic.neighborhood}
                onChange={(e) => setNewClinic({ ...newClinic, neighborhood: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Vieiralves"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                type="text"
                value={newClinic.city}
                onChange={(e) => setNewClinic({ ...newClinic, city: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Manaus"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input
                type="text"
                value={newClinic.state}
                onChange={(e) => setNewClinic({ ...newClinic, state: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: AM"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <input
                type="text"
                value={newClinic.zipCode}
                onChange={(e) => setNewClinic({ ...newClinic, zipCode: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="00000-000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={newClinic.phone}
                onChange={(e) => setNewClinic({ ...newClinic, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={newClinic.email}
                onChange={(e) => setNewClinic({ ...newClinic, email: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="clinica@email.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Funcionamento</label>
              <input
                type="text"
                value={newClinic.openingHours}
                onChange={(e) => setNewClinic({ ...newClinic, openingHours: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Seg-Sex: 08:00-18:00, Sáb: 08:00-12:00"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidades (separadas por vírgula)</label>
              <input
                type="text"
                value={newClinic.specialties}
                onChange={(e) => setNewClinic({ ...newClinic, specialties: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Fisioterapia, Acupuntura, RPG"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Acessibilidade (separadas por vírgula)</label>
              <input
                type="text"
                value={newClinic.accessibility}
                onChange={(e) => setNewClinic({ ...newClinic, accessibility: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Estacionamento, Acesso para cadeirantes, Elevador"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={newClinic.parkingAvailable}
                onChange={(e) => setNewClinic({ ...newClinic, parkingAvailable: e.target.checked })}
              />
              <span className="text-sm text-gray-700">Estacionamento disponível</span>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={createClinic}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>Adicionar Clínica</span>
            </button>
          </div>

          {/* Clinics List */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-medium text-gray-900">Clínicas Cadastradas</h3>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={clinicSearch}
                  onChange={(e) => setClinicSearch(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Buscar clínica"
                />
                <select
                  value={clinicLimit}
                  onChange={(e) => setClinicLimit(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                <button
                  onClick={() => { setClinicPage(1); fetchEditableData(); }}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  Aplicar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinics.map((clinic) => (
                <div key={clinic.code} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{clinic.displayName || clinic.name}</h4>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{clinic.code}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{clinic.address}</p>
                  <p className="text-sm text-gray-600 mb-1">{clinic.neighborhood}, {clinic.city} - {clinic.state}</p>
                  <p className="text-sm text-gray-600 mb-2">{clinic.phone}</p>
                  {clinic.openingHours && (
                    <p className="text-xs text-gray-500 mb-2">
                      {(() => {
                        const oh = clinic.openingHours as any;
                        if (typeof oh === 'string') return oh;
                        if (oh && typeof oh === 'object') {
                          try {
                            const order = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
                            const entries = Object.entries(oh as Record<string,string>).sort((a,b) => order.indexOf(a[0]) - order.indexOf(b[0]));
                            return entries.map(([d,v]) => `${d}: ${v}`).join(', ');
                          } catch {}
                        }
                        return String(oh);
                      })()}
                    </p>
                  )}
                  {clinic.parkingAvailable && (
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-2 mb-2">
                      Estacionamento
                    </span>
                  )}
                  {clinic.specialties && clinic.specialties.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Especialidades:</p>
                      <div className="flex flex-wrap gap-1">
                        {clinic.specialties.slice(0, 3).map((specialty: string, index: number) => (
                          <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {specialty}
                          </span>
                        ))}
                        {clinic.specialties.length > 3 && (
                          <span className="text-xs text-gray-500">+{clinic.specialties.length - 3} mais</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingClinic(clinic)}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteClinic(clinic.code)}
                      className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {clinics.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma clínica cadastrada</p>
                <p className="text-sm">Adicione sua primeira clínica usando o formulário acima</p>
                <div className="mt-4">
                  <button
                    onClick={async () => { await api.post('/api/clinic/seed'); fetchEditableData(); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md"
                  >Carregar do catálogo</button>
                </div>
              </div>
            )}

            {clinicTotalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-6">
                <button
                  disabled={clinicPage <= 1}
                  onClick={() => { setClinicPage(p => Math.max(1, p - 1)); fetchEditableData(); }}
                  className="px-3 py-1 border rounded-md disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm">Página {clinicPage} de {clinicTotalPages}</span>
                <button
                  disabled={clinicPage >= clinicTotalPages}
                  onClick={() => { setClinicPage(p => Math.min(clinicTotalPages, p + 1)); fetchEditableData(); }}
                  className="px-3 py-1 border rounded-md disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Configuration */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Phone className="h-5 w-5 mr-2 text-green-600" />
            Configuração WhatsApp Business
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Token de Acesso</label>
              <input
                type="password"
                value={settings.whatsappToken}
                onChange={(e) => setSettings({ ...settings, whatsappToken: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Seu token de acesso do WhatsApp Business"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">App ID (Meta)</label>
              <input
                type="text"
                value={settings.metaAppId}
                onChange={(e) => setSettings({ ...settings, metaAppId: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">App Secret (Meta)</label>
              <input
                type="password"
                value={settings.metaAppSecret}
                onChange={(e) => setSettings({ ...settings, metaAppSecret: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID do Número de Telefone</label>
                <input
                  type="text"
                  value={settings.metaPhoneNumberId}
                  onChange={(e) => setSettings({ ...settings, metaPhoneNumberId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID da Conta Comercial</label>
                <input
                  type="text"
                  value={settings.metaBusinessAccountId}
                  onChange={(e) => setSettings({ ...settings, metaBusinessAccountId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL do Webhook</label>
              <input
                type="text"
                value={settings.webhookUrl}
                onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://seu-dominio.com/api/webhook"
              />
            </div>
            <button
              onClick={testWhatsAppConnection}
              disabled={testingWhatsApp}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <TestTube className="h-4 w-4" />
              <span>{testingWhatsApp ? 'Testando...' : 'Testar Conexão WhatsApp'}</span>
            </button>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Bot className="h-5 w-5 mr-2 text-purple-600" />
            Configuração de IA
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chave API OpenAI</label>
              <input
                type="password"
                value={settings.openaiApiKey}
                onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sua chave API da OpenAI"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tempo de Resposta Padrão (min)</label>
                <input
                  type="number"
                  value={settings.defaultResponseTime}
                  onChange={(e) => setSettings({ ...settings, defaultResponseTime: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tempo Máximo de Conversa (min)</label>
                <input
                  type="number"
                  value={settings.maxConversationTime}
                  onChange={(e) => setSettings({ ...settings, maxConversationTime: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoReplyEnabled}
                  onChange={(e) => setSettings({ ...settings, autoReplyEnabled: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Auto-resposta ativada</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.evaluationRequired}
                  onChange={(e) => setSettings({ ...settings, evaluationRequired: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Avaliação obrigatória</span>
              </label>
            </div>
            <button
              onClick={testAIConnection}
              disabled={testingAI}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <TestTube className="h-4 w-4" />
              <span>{testingAI ? 'Testando...' : 'Testar Conexão IA'}</span>
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissões por Nível</h2>
          <div className="overflow-x-auto">
            {['MASTER','ADMIN','SUPERVISOR','ATENDENTE'].map((role) => (
              <div key={role} className="mb-4">
                <h3 className="text-sm font-medium text-gray-800 mb-2">{role}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['users','settings','workflows','patients','conversations','stats'].map((perm) => (
                    <label key={`${role}-${perm}`} className="flex items-center space-x-2">
                      <input type="checkbox" checked={!!rolePermissions?.[role]?.[perm]} onChange={(e) => setRolePermissions((prev:any) => ({ ...prev, [role]: { ...(prev?.[role]||{}), [perm]: e.target.checked } }))} />
                      <span className="text-sm text-gray-700">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={saveRolePermissions} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Salvar Permissões</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Convênios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input type="text" value={newInsurance.code} onChange={(e) => setNewInsurance({ ...newInsurance, code: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" value={newInsurance.name} onChange={(e) => setNewInsurance({ ...newInsurance, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Exibição</label>
              <input type="text" value={newInsurance.displayName} onChange={(e) => setNewInsurance({ ...newInsurance, displayName: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div className="flex items-center space-x-2 mt-6">
              <input type="checkbox" checked={newInsurance.discount} onChange={(e) => setNewInsurance({ ...newInsurance, discount: e.target.checked })} />
              <span className="text-sm text-gray-700">Convênio com desconto</span>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <input type="text" value={newInsurance.notes} onChange={(e) => setNewInsurance({ ...newInsurance, notes: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={createInsurance} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Adicionar Convênio</button>
          </div>

          <div className="flex items-center space-x-3 mt-4">
            <input type="text" value={insSearch} onChange={(e) => setInsSearch(e.target.value)} placeholder="Buscar convênio" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <select value={insLimit} onChange={(e) => setInsLimit(Number(e.target.value))} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button onClick={() => { setInsPage(1); fetchEditableData(); }} className="px-3 py-2 border rounded-md">Aplicar</button>
            <button onClick={() => setInsSortCoverage(s => !s)} className="px-3 py-2 border rounded-md">{insSortCoverage ? 'Ordenar por nome' : 'Ordenar por cobertura'}</button>
          </div>

          <div className="mt-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2">Código</th>
                  <th className="py-2">Nome</th>
                  <th className="py-2">Desconto</th>
                  <th className="py-2">Cobertura</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(insSortCoverage ? [...insurances].sort((a:any,b:any) => (b.procedureCount||0)-(a.procedureCount||0)) : insurances).map((ic) => (
                  <tr key={ic.code} className="border-t">
                    <td className="py-2">{ic.code}</td>
                    <td className="py-2">{ic.name}</td>
                    <td className="py-2">{ic.discount ? 'Sim' : 'Não'}</td>
                    <td className="py-2">{ic.procedureCount ?? '-'}</td>
                    <td className="py-2 space-x-2">
                      <button onClick={() => updateInsurance(ic.code, { ...ic, discount: !ic.discount })} className="px-3 py-1 border rounded-md">Alternar Desconto</button>
                      <button onClick={() => setEditingInsurance(ic)} className="px-3 py-1 border rounded-md">Editar</button>
                      <button onClick={() => deleteInsurance(ic.code)} className="px-3 py-1 border rounded-md text-red-600">Remover</button>
                      <button
                        onClick={async () => {
                          const next = expandedInsurance === ic.code ? null : ic.code;
                          setExpandedInsurance(next);
                          if (next) await fetchInsuranceProcedures(ic.code);
                        }}
                        className="px-3 py-1 border rounded-md"
                      >{expandedInsurance === ic.code ? 'Ocultar' : 'Ver procedimentos'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-end space-x-2 mt-3">
              <button disabled={insPage<=1} onClick={() => { setInsPage(p => Math.max(1, p-1)); fetchEditableData(); }} className="px-3 py-1 border rounded-md">Anterior</button>
              <span className="text-sm">Página {insPage} de {insTotalPages}</span>
              <button disabled={insPage>=insTotalPages} onClick={() => { setInsPage(p => Math.min(insTotalPages, p+1)); fetchEditableData(); }} className="px-3 py-1 border rounded-md">Próxima</button>
            </div>
          </div>

          {expandedInsurance && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Procedimentos vinculados a {expandedInsurance}</h3>
              <div className="space-y-2">
                {(insuranceProcedures[expandedInsurance] || []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.name}</span>
                    <button onClick={() => unlinkProcedureFromInsurance(expandedInsurance, p.id)} className="px-2 py-1 border rounded-md text-red-600">Desvincular</button>
                  </div>
                ))}
                {(!insuranceProcedures[expandedInsurance] || insuranceProcedures[expandedInsurance].length === 0) && (
                  <p className="text-xs text-gray-600">Nenhum procedimento vinculado</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Convênio</label>
              <select value={linkInsuranceCode} onChange={(e) => setLinkInsuranceCode(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="">Selecione</option>
                {insurances.map((ic) => (
                  <option key={ic.code} value={ic.code}>{ic.displayName || ic.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Procedimento</label>
              <select value={linkProcedureCode} onChange={(e) => setLinkProcedureCode(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="">Selecione</option>
                {procedures.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={linkProcedureToInsurance} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Vincular</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Procedimentos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input type="text" value={newProcedure.code} onChange={(e) => setNewProcedure({ ...newProcedure, code: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" value={newProcedure.name} onChange={(e) => setNewProcedure({ ...newProcedure, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input type="text" value={newProcedure.description} onChange={(e) => setNewProcedure({ ...newProcedure, description: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço Base</label>
              <input type="number" value={newProcedure.basePrice} onChange={(e) => setNewProcedure({ ...newProcedure, basePrice: Number(e.target.value) })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
              <input type="number" value={newProcedure.duration} onChange={(e) => setNewProcedure({ ...newProcedure, duration: Number(e.target.value) })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div className="flex items-center space-x-2 mt-6">
              <input type="checkbox" checked={newProcedure.requiresEvaluation} onChange={(e) => setNewProcedure({ ...newProcedure, requiresEvaluation: e.target.checked })} />
              <span className="text-sm text-gray-700">Requer avaliação</span>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Categorias (separadas por vírgula)</label>
              <input type="text" value={newProcedure.categories} onChange={(e) => setNewProcedure({ ...newProcedure, categories: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={createProcedure} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Adicionar Procedimento</button>
          </div>

          <div className="mt-6">
            <div className="flex items-center space-x-4 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
                <input type="text" value={procSearch} onChange={(e) => setProcSearch(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Nome ou código" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Filtrar por convênio</label>
                <select value={procFilterInsurance} onChange={(e) => applyProcInsuranceFilter(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="">Todos</option>
                  {insurances.map((ic) => (
                    <option key={ic.code} value={ic.code}>{ic.displayName || ic.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2">Código</th>
                  <th className="py-2">Nome</th>
                  <th className="py-2">Preço</th>
                  <th className="py-2">Duração</th>
                  <th className="py-2">Categorias</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {procedures
                  .filter((p) => {
                    const s = procSearch.trim().toLowerCase();
                    const okSearch = !s || p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s);
                    const okFilter = !procFilterInsurance || procFilterCoverageCodes.includes(p.code);
                    return okSearch && okFilter;
                  })
                  .map((p) => (
                  <tr key={p.code} className="border-t">
                    <td className="py-2">{p.code}</td>
                    <td className="py-2">{p.name}</td>
                    <td className="py-2">R$ {p.basePrice}</td>
                    <td className="py-2">{p.duration} min</td>
                    <td className="py-2">{Array.isArray(p.categories) ? p.categories.join(', ') : ''}</td>
                    <td className="py-2 space-x-2">
                      <button onClick={() => setEditingProcedure(p)} className="px-3 py-1 border rounded-md">Editar</button>
                      <button onClick={() => deleteProcedure(p.code)} className="px-3 py-1 border rounded-md text-red-600">Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-end space-x-2 mt-3">
              <button disabled={procPage<=1} onClick={() => { setProcPage(p => Math.max(1, p-1)); fetchEditableData(); }} className="px-3 py-1 border rounded-md">Anterior</button>
              <span className="text-sm">Página {procPage} de {procTotalPages}</span>
              <button disabled={procPage>=procTotalPages} onClick={() => { setProcPage(p => Math.min(procTotalPages, p+1)); fetchEditableData(); }} className="px-3 py-1 border rounded-md">Próxima</button>
            </div>
          </div>
        </div>
      </div>

      {editingInsurance && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Editar Convênio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input value={editingInsurance.code} onChange={(e)=>setEditingInsurance({ ...editingInsurance, code: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input value={editingInsurance.name} onChange={(e)=>setEditingInsurance({ ...editingInsurance, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Exibição</label>
                <input value={editingInsurance.displayName} onChange={(e)=>setEditingInsurance({ ...editingInsurance, displayName: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="flex items-center space-x-2 mt-6">
                <input type="checkbox" checked={editingInsurance.discount} onChange={(e)=>setEditingInsurance({ ...editingInsurance, discount: e.target.checked })} />
                <span className="text-sm text-gray-700">Convênio com desconto</span>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <input value={editingInsurance.notes || ''} onChange={(e)=>setEditingInsurance({ ...editingInsurance, notes: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2">
              <button onClick={()=>setEditingInsurance(null)} className="px-4 py-2 border rounded-md">Cancelar</button>
              <button onClick={()=>{ updateInsurance(editingInsurance.code, editingInsurance); setEditingInsurance(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {editingProcedure && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Editar Procedimento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input value={editingProcedure.code} onChange={(e)=>setEditingProcedure({ ...editingProcedure, code: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input value={editingProcedure.name} onChange={(e)=>setEditingProcedure({ ...editingProcedure, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input value={editingProcedure.description} onChange={(e)=>setEditingProcedure({ ...editingProcedure, description: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço Base</label>
                <input type="number" value={editingProcedure.basePrice} onChange={(e)=>setEditingProcedure({ ...editingProcedure, basePrice: Number(e.target.value) })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
                <input type="number" value={editingProcedure.duration} onChange={(e)=>setEditingProcedure({ ...editingProcedure, duration: Number(e.target.value) })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="flex items-center space-x-2 mt-6">
                <input type="checkbox" checked={editingProcedure.requiresEvaluation} onChange={(e)=>setEditingProcedure({ ...editingProcedure, requiresEvaluation: e.target.checked })} />
                <span className="text-sm text-gray-700">Requer avaliação</span>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorias (separadas por vírgula)</label>
                <input value={Array.isArray(editingProcedure.categories) ? editingProcedure.categories.join(', ') : ''} onChange={(e)=>setEditingProcedure({ ...editingProcedure, categories: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2">
              <button onClick={()=>setEditingProcedure(null)} className="px-4 py-2 border rounded-md">Cancelar</button>
              <button onClick={()=>{ updateProcedure(editingProcedure.code, editingProcedure); setEditingProcedure(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {editingClinic && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Editar Clínica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  value={editingClinic.code}
                  onChange={(e) => setEditingClinic({ ...editingClinic, code: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  value={editingClinic.name}
                  onChange={(e) => setEditingClinic({ ...editingClinic, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Exibição</label>
                <input
                  value={editingClinic.displayName}
                  onChange={(e) => setEditingClinic({ ...editingClinic, displayName: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input
                  value={editingClinic.address}
                  onChange={(e) => setEditingClinic({ ...editingClinic, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input
                  value={editingClinic.neighborhood}
                  onChange={(e) => setEditingClinic({ ...editingClinic, neighborhood: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input
                  value={editingClinic.city}
                  onChange={(e) => setEditingClinic({ ...editingClinic, city: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <input
                  value={editingClinic.state}
                  onChange={(e) => setEditingClinic({ ...editingClinic, state: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <input
                  value={editingClinic.zipCode}
                  onChange={(e) => setEditingClinic({ ...editingClinic, zipCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  value={editingClinic.phone}
                  onChange={(e) => setEditingClinic({ ...editingClinic, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingClinic.email}
                  onChange={(e) => setEditingClinic({ ...editingClinic, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Funcionamento</label>
                <input
                  value={editingClinic.openingHours}
                  onChange={(e) => setEditingClinic({ ...editingClinic, openingHours: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidades (separadas por vírgula)</label>
                <input
                  value={Array.isArray(editingClinic.specialties) ? editingClinic.specialties.join(', ') : editingClinic.specialties || ''}
                  onChange={(e) => setEditingClinic({ ...editingClinic, specialties: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Acessibilidade (separadas por vírgula)</label>
                <input
                  value={Array.isArray(editingClinic.accessibility) ? editingClinic.accessibility.join(', ') : editingClinic.accessibility || ''}
                  onChange={(e) => setEditingClinic({ ...editingClinic, accessibility: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editingClinic.parkingAvailable}
                  onChange={(e) => setEditingClinic({ ...editingClinic, parkingAvailable: e.target.checked })}
                />
                <span className="text-sm text-gray-700">Estacionamento disponível</span>
              </div>
              {Array.isArray(editingClinic?.clinicProcedures) && editingClinic.clinicProcedures.length > 0 && (
                <div className="md:col-span-2 mt-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Disponibilidade por Procedimento</h3>
                  <div className="space-y-4">
                    {editingClinic.clinicProcedures.map((cp: any) => (
                      <div key={cp.procedureCode} className="border rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-800">{cp.procedure?.name || cp.procedureCode}</div>
                          <button
                            onClick={async () => {
                              const next = expandedProcedure === cp.procedureCode ? null : cp.procedureCode;
                              setExpandedProcedure(next);
                              if (next) await fetchProcedureAvailability(editingClinic.code, cp.procedureCode);
                            }}
                            className="text-xs px-2 py-1 border rounded-md"
                          >{expandedProcedure === cp.procedureCode ? 'Ocultar' : 'Editar disponibilidade'}</button>
                        </div>
                        {expandedProcedure === cp.procedureCode && (
                          <div className="mt-3">
                            {['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map((day) => {
                              const key = `${editingClinic.code}:${cp.procedureCode}`;
                              const dayValue = (procedureAvailability[key] || {})[day] || '';
                              return (
                                <div key={day} className="grid grid-cols-3 gap-2 items-center mb-2">
                                  <div className="text-xs text-gray-700">{day}</div>
                                  <input
                                    placeholder="HH:MM - HH:MM"
                                    value={dayValue}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setProcedureAvailability(prev => ({
                                        ...prev,
                                        [key]: { ...(prev[key] || {}), [day]: val }
                                      }));
                                    }}
                                    className="col-span-2 border border-gray-300 rounded-md px-2 py-1 text-xs"
                                  />
                                </div>
                              );
                            })}
                            <div className="flex justify-end mt-3">
                              <button
                                onClick={() => saveProcedureAvailability(editingClinic.code, cp.procedureCode)}
                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded"
                              >Salvar disponibilidade</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end space-x-2">
              <button onClick={() => setEditingClinic(null)} className="px-4 py-2 border rounded-md">Cancelar</button>
              <button
                onClick={() => {
                  const payload = {
                    ...editingClinic,
                    specialties: Array.isArray(editingClinic.specialties) ? editingClinic.specialties : editingClinic.specialties?.split(',').map(s => s.trim()).filter(Boolean) || [],
                    accessibility: Array.isArray(editingClinic.accessibility) ? editingClinic.accessibility : editingClinic.accessibility?.split(',').map(s => s.trim()).filter(Boolean) || []
                  };
                  updateClinic(editingClinic.code, payload);
                  setEditingClinic(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Settings };
