import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Settings as SettingsIcon,
  Save,
  TestTube,
  Bot,
  Phone,
  Check,
  Key,
  AlertCircle,
  CheckCircle,
  Search,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { api } from '../lib/utils';
import { toast } from 'sonner';
import { TemplateManager } from '../components/TemplateManager';

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
  const [newInsurance, setNewInsurance] = useState({ code: '', name: '', displayName: '', notes: '' });
  const [newProcedure, setNewProcedure] = useState({ code: '', name: '', description: '', basePrice: 0, requiresEvaluation: false, duration: 30, categories: '' });
  const [linkInsuranceCode, setLinkInsuranceCode] = useState('');
  const [linkProcedureCode, setLinkProcedureCode] = useState('');
  const [expandedInsurance, setExpandedInsurance] = useState<string | null>(null);
  const [insuranceProcedures, setInsuranceProcedures] = useState<Record<string, any[]>>({});
  const [procSearch, setProcSearch] = useState('');
  const [procFilterInsurance, setProcFilterInsurance] = useState('');
  const [procFilterCoverageCodes, setProcFilterCoverageCodes] = useState<string[]>([]);
  const [insPage, setInsPage] = useState(1);
  const [insLimit, setInsLimit] = useState(1000);
  const [insTotalPages, setInsTotalPages] = useState(1);
  const [insSearch, setInsSearch] = useState('');
  const [procPage, setProcPage] = useState(1);
  const [procLimit, setProcLimit] = useState(10);
  const [botTemplates, setBotTemplates] = useState<Array<{ key: string; title: string; content: string }>>([
    { key: 'welcome', title: 'Boas-vindas', content: 'Bem-vindo à ${clinica_nome}! Como posso ajudar?' },
    { key: 'procedure_info', title: 'Informações de Procedimento', content: '${procedimento_nome}: ${procedimento_descricao}\nDuração: ${procedimento_duracao} min' },
    { key: 'pricing', title: 'Valores por Convênio', content: 'Valores de ${procedimento_nome}:\nParticular: R$ ${preco_particular}\n${convenio_nome}: R$ ${preco_convenio}' },
    { key: 'unit_info', title: 'Informações da Unidade', content: '${unidade_nome}\nEndereço: ${endereco}\nHorário: ${horario_atendimento}\nTelefone: ${telefone}' }
  ]);
  const [previewClinic, setPreviewClinic] = useState('');
  const [previewProcedure, setPreviewProcedure] = useState('');
  const [previewInsurance, setPreviewInsurance] = useState('');
  const [previewPriceParticular, setPreviewPriceParticular] = useState(0);
  const [previewPriceConvenio, setPreviewPriceConvenio] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!previewClinic || !previewProcedure) { setPreviewPriceParticular(0); setPreviewPriceConvenio(null); return; }
        const r = await api.get(`/api/clinic/clinics/${previewClinic}/procedures/${previewProcedure}/price`)
        const data = r.data || {}
        setPreviewPriceParticular(Number(data.particular || 0))
        if (previewInsurance) {
          const byIns = data.byInsurance || {}
          const v = byIns[previewInsurance]
          setPreviewPriceConvenio(typeof v === 'number' ? v : null)
        } else {
          setPreviewPriceConvenio(null)
        }
      } catch {
        setPreviewPriceParticular(0); setPreviewPriceConvenio(null)
      }
    })()
  }, [previewClinic, previewProcedure, previewInsurance])
  const [procTotalPages, setProcTotalPages] = useState(1);
  const [insSortCoverage, setInsSortCoverage] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<any | null>(null);
  const [editingProcedure, setEditingProcedure] = useState<any | null>(null);
  const [expandedProcedure, setExpandedProcedure] = useState<string | null>(null);
  const [procedureAvailability, setProcedureAvailability] = useState<Record<string, any>>({});
  const [procSortBy, setProcSortBy] = useState<'name' | 'duration'>('name');
  const [procSortAsc, setProcSortAsc] = useState(true);

  const [insStatusFilter, setInsStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [insDateStart, setInsDateStart] = useState('');
  const [insDateEnd, setInsDateEnd] = useState('');
  const [insSortBy, setInsSortBy] = useState<'name_asc' | 'name_desc' | 'coverage' | 'created_desc'>('name_asc');
  const [insuranceCreateOpen, setInsuranceCreateOpen] = useState(false);
  const [insuranceForm, setInsuranceForm] = useState({ code: '', name: '', displayName: '', sessionPrice: 0, packagePrice: 0, packageSessions: 0, packageSessionsStr: '', isActive: true, notes: '', discountPercentage: 0, discount: false, isParticular: false });
  const createNameRef = useRef<HTMLInputElement | null>(null);
  const [insuranceEditHistory, setInsuranceEditHistory] = useState<any[]>([]);
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [insuranceToToggle, setInsuranceToToggle] = useState<any | null>(null);
  const [cipClinicSelection, setCipClinicSelection] = useState('');
  const [cipLoading, setCipLoading] = useState(false);
  const [cipSortBy, setCipSortBy] = useState<'name' | 'price'>('name');
  const [cipSortAsc, setCipSortAsc] = useState(true);

  useEffect(() => {
    (async () => {
      if (!editingInsurance || !cipClinicSelection) return;
      try {
        setCipLoading(true);
        await fetchClinicInsuranceProcedures(cipClinicSelection, editingInsurance.code);
      } catch { }
      finally { setCipLoading(false); }
    })();
  }, [cipClinicSelection, editingInsurance?.code]);

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
  const [clinicModalOpen, setClinicModalOpen] = useState(false);
  const [clinicFormMode, setClinicFormMode] = useState<'create' | 'edit'>('create');
  const [clinicForm, setClinicForm] = useState({
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
  const [clinicPage, setClinicPage] = useState(1);
  const [clinicLimit, setClinicLimit] = useState(10);
  const [clinicTotalPages, setClinicTotalPages] = useState(1);
  const [clinicSearch, setClinicSearch] = useState('');
  const [addClinicProcedureCode, setAddClinicProcedureCode] = useState('');
  const [activeTab, setActiveTab] = useState<'geral' | 'chatbot' | 'clinicas' | 'convenioProc' | 'templates'>('geral');
  const [insuranceModalOpen, setInsuranceModalOpen] = useState(false);
  const [insuranceModal, setInsuranceModal] = useState<any | null>(null);
  const [insuranceModalProcedures, setInsuranceModalProcedures] = useState<any[]>([]);
  const [newInsProcName, setNewInsProcName] = useState('');
  const [newInsProcPrice, setNewInsProcPrice] = useState('');
  const [newInsProcPackage, setNewInsProcPackage] = useState('');
  const [editingInsProc, setEditingInsProc] = useState<any | null>(null);
  const [clinicInsurances, setClinicInsurances] = useState<Record<string, any[]>>({});
  const [linkClinicInsuranceCodes, setLinkClinicInsuranceCodes] = useState<string[]>([]);
  const [insMultiQuery, setInsMultiQuery] = useState('');

  const [editingClinicInsurance, setEditingClinicInsurance] = useState<any | null>(null);
  const [clinicInsuranceProcedures, setClinicInsuranceProcedures] = useState<any[]>([]);
  const [newClinicInsuranceProcedure, setNewClinicInsuranceProcedure] = useState({ procedureCode: '', price: 0, isActive: true, hasPackage: false, packageInfo: '', packageSessions: 0, packagePrice: 0 });
  const [newInsuranceClinicSelection, setNewInsuranceClinicSelection] = useState('');
  const [newInsuranceProcedure, setNewInsuranceProcedure] = useState({ procedureCode: '', price: 0, isActive: true, hasPackage: false, packageSessions: 0, packagePrice: 0 });
  const [newInsuranceProcedureList, setNewInsuranceProcedureList] = useState<any[]>([]);
  const [selectedClinicsForNewProc, setSelectedClinicsForNewProc] = useState<string[]>([]);

  // New states for insurance modal improvements
  const [initialInsuranceData, setInitialInsuranceData] = useState<any>(null);
  const [insuranceHasChanges, setInsuranceHasChanges] = useState(false);
  const [showInsuranceDropdown, setShowInsuranceDropdown] = useState(false);
  const [showAddProcedure, setShowAddProcedure] = useState(false);

  // New states for Clinic Offered Procedures
  const [clinicOfferedProcedures, setClinicOfferedProcedures] = useState<any[]>([]);
  const [showOfferedProcDropdown, setShowOfferedProcDropdown] = useState(false);
  const [offeredProcQuery, setOfferedProcQuery] = useState('');
  const [selectedOfferedProcs, setSelectedOfferedProcs] = useState<string[]>([]);


  const addProcedureToClinic = async (clinicCode: string) => {
    try {
      if (!clinicCode) { toast.error('Selecione uma clínica'); return; }
      if (!addClinicProcedureCode) { toast.error('Selecione um procedimento'); return; }
      toast.info('Para vincular procedimentos, utilize o modal de convênios da clínica.');
    } catch (error) {
      toast.error('Ação indisponível no momento');
    }
  };

  const fetchClinicOfferedProcedures = async (clinicCode: string) => {
    try {
      const res = await api.get(`/api/clinic/clinics/${clinicCode}/offered-procedures`);
      setClinicOfferedProcedures(res.data.procedures || []);
    } catch (error) {
      console.error('Error fetching offered procedures:', error);
      toast.error('Erro ao buscar procedimentos da clínica');
    }
  };

  const handleAddOfferedProcedures = async () => {
    if (selectedOfferedProcs.length === 0) return;

    try {
      for (const procCode of selectedOfferedProcs) {
        await api.post(`/api/clinic/clinics/${editingClinic.code}/offered-procedures/${procCode}`, {
          defaultPrice: 0 // Default price can be updated later
        });
      }

      await fetchClinicOfferedProcedures(editingClinic.code);
      setSelectedOfferedProcs([]);
      setShowOfferedProcDropdown(false);
      toast.success('Procedimentos adicionados com sucesso');
    } catch (error) {
      console.error('Error adding offered procedures:', error);
      toast.error('Erro ao adicionar procedimentos');
    }
  };

  const handleRemoveOfferedProcedure = async (procCode: string) => {
    if (!confirm('Tem certeza? Isso removerá o procedimento desta clínica.')) return;

    try {
      await api.delete(`/api/clinic/clinics/${editingClinic.code}/offered-procedures/${procCode}`);
      await fetchClinicOfferedProcedures(editingClinic.code);
      toast.success('Procedimento removido');
    } catch (error: any) {
      console.error('Error removing offered procedure:', error);
      if (error.response?.data?.usedInInsurances) {
        toast.error(`Não é possível remover: usado em ${error.response.data.usedInInsurances} convênios`);
      } else {
        toast.error('Erro ao remover procedimento');
      }
    }
  };

  const fetchInsuranceProcedures = async (insuranceCode: string) => {
    try {
      setInsuranceModalProcedures([]);
      toast.info('Visualização de procedimentos por convênio requer seleção de clínica.');
    } catch (error) {
      toast.error('Erro ao buscar procedimentos');
    }
  };

  const unlinkProcedureFromInsurance = async (insuranceCode: string, procedureId: string) => {
    try {
      toast.info('Desvinculação pelo convênio está descontinuada. Use o vínculo por clínica + convênio.');
    } catch (error) {
      toast.error('Erro ao desvincular procedimento');
    }
  };

  const linkProcedureToInsurance = async () => {
    try {
      if (!linkInsuranceCode || !linkProcedureCode) { toast.error('Selecione convênio e procedimento'); return; }
      toast.info('Para vincular, selecione uma clínica e use o vínculo por clínica + convênio.');
    } catch (error) {
      toast.error('Erro ao vincular procedimento');
    }
  };

  const applyProcInsuranceFilter = (code: string) => {
    setProcFilterInsurance(code);
  };

  const fetchProcedureAvailability = async (clinicCode: string, procedureCode: string) => {
    try {
      const key = `${clinicCode}:${procedureCode}`;
      const res = await api.get(`/api/clinic/clinics/${clinicCode}/procedures/${procedureCode}/availability`);
      setProcedureAvailability(prev => ({ ...prev, [key]: res.data?.availability || {} }));
    } catch (error) {
      toast.error('Erro ao carregar disponibilidade');
    }
  };

  const saveClinicProcedureConfig = async (clinicCode: string, procedureCode: string) => {
    try {
      toast.success('Configuração salva');
    } catch (error) {
      toast.error('Erro ao salvar configuração');
    }
  };

  const saveProcedureAvailability = async (clinicCode: string, procedureCode: string) => {
    try {
      const key = `${clinicCode}:${procedureCode}`;
      const availability = procedureAvailability[key] || {};
      await api.put(`/api/clinic/clinics/${clinicCode}/procedures/${procedureCode}/availability`, { availability });
      toast.success('Disponibilidade salva');
    } catch (error) {
      toast.error('Erro ao salvar disponibilidade');
    }
  };

  const fetchClinicInsuranceProcedures = async (clinicCode: string, insuranceCode: string) => {
    try {
      const res = await api.get(`/api/clinic/clinics/${clinicCode}/insurances/${insuranceCode}/procedures`);
      const list = Array.isArray(res.data) ? res.data : (res.data || []);
      const mapped = list.map((p: any) => {
        const pkg = parsePackageInfo(p.packageInfo || '');
        return { ...p, _packageSessions: pkg.sessions, _packagePrice: pkg.price };
      });
      setClinicInsuranceProcedures(mapped);
    } catch (error) {
      toast.error('Erro ao buscar procedimentos do convênio');
    }
  };

  const saveClinicInsuranceProcedure = async (clinicCode: string, insuranceCode: string, procedure: any) => {
    try {
      const base = `/api/clinic/clinics/${clinicCode}/insurances/${insuranceCode}/procedures/${procedure.procedureCode}`;
      const packageSessions = Number((procedure.packageSessions ?? procedure._packageSessions) || 0);
      const packagePrice = Number((procedure.packagePrice ?? procedure._packagePrice) || 0);
      const hasPackage = !!procedure.hasPackage && packageSessions > 1;
      const payload = { price: Number(procedure.price || 0), isActive: !!procedure.isActive, hasPackage, packageInfo: hasPackage ? serializePackageInfo(packageSessions, packagePrice) : '' };
      const exists = clinicInsuranceProcedures.some(p => p.procedureCode === procedure.procedureCode);
      if (exists) {
        await api.put(base, payload);
      } else {
        await api.post(base, payload);
      }
      toast.success('Procedimento do convênio salvo');
      await fetchClinicInsuranceProcedures(clinicCode, insuranceCode);
    } catch (error) {
      toast.error('Erro ao salvar procedimento do convênio');
    }
  };

  const deleteClinicInsuranceProcedure = async (clinicCode: string, insuranceCode: string, procedureCode: string) => {
    try {
      await api.delete(`/api/clinic/clinics/${clinicCode}/insurances/${insuranceCode}/procedures/${procedureCode}`);
      toast.success('Procedimento do convênio removido');
      await fetchClinicInsuranceProcedures(clinicCode, insuranceCode);
    } catch (error) {
      toast.error('Erro ao remover procedimento do convênio');
    }
  };

  const saveClinicInsuranceProcedureMulti = async (clinicCodes: string[], insuranceCode: string, procedure: any) => {
    const targets = clinicCodes && clinicCodes.length > 0 ? clinicCodes : clinics.map(c => c.code);
    for (const code of targets) {
      await saveClinicInsuranceProcedure(code, insuranceCode, procedure);
    }
    if (cipClinicSelection) {
      await fetchClinicInsuranceProcedures(cipClinicSelection, insuranceCode);
    }
  };

  // Insurance modal control functions
  const handleProcedureChange = (procedureCode: string, field: string, value: any) => {
    setClinicInsuranceProcedures(prev =>
      prev.map(p => p.procedureCode === procedureCode ? { ...p, [field]: value } : p)
    );
    setInsuranceHasChanges(true);
  };

  const handleAddProcedure = async () => {
    if (!newClinicInsuranceProcedure.procedureCode || !cipClinicSelection || !editingInsurance) {
      toast.error('Selecione um procedimento');
      return;
    }

    await saveClinicInsuranceProcedureMulti(
      selectedClinicsForNewProc.length > 0 ? selectedClinicsForNewProc : [cipClinicSelection],
      editingInsurance.code,
      newClinicInsuranceProcedure
    );

    setNewClinicInsuranceProcedure({ procedureCode: '', price: 0, isActive: true, hasPackage: false, packageInfo: '', packageSessions: 0, packagePrice: 0 });
    setSelectedClinicsForNewProc([]);
    setShowAddProcedure(false);
    setInsuranceHasChanges(false);
  };

  const handleRemoveProcedure = async (procedureCode: string) => {
    if (!cipClinicSelection || !editingInsurance) return;
    if (confirm('Deseja remover este procedimento?')) {
      await deleteClinicInsuranceProcedure(cipClinicSelection, editingInsurance.code, procedureCode);
      setInsuranceHasChanges(false);
    }
  };

  const handleSaveInsurance = async () => {
    if (!editingInsurance || !cipClinicSelection) return;

    try {
      // Save all modified procedures
      for (const proc of clinicInsuranceProcedures) {
        await saveClinicInsuranceProcedure(cipClinicSelection, editingInsurance.code, proc);
      }

      // Save basic insurance data
      await updateInsurance(editingInsurance.code, {
        code: editingInsurance.code,
        name: editingInsurance.name,
        displayName: editingInsurance.displayName
      });

      toast.success('Convênio salvo com sucesso');
      setInsuranceHasChanges(false);
      setInitialInsuranceData(JSON.stringify(clinicInsuranceProcedures));
    } catch (error) {
      toast.error('Erro ao salvar convênio');
    }
  };

  const handleCloseInsuranceModal = () => {
    if (insuranceHasChanges) {
      if (confirm('Existem alterações não salvas. Deseja sair mesmo assim?')) {
        setEditingInsurance(null);
        setInsuranceHasChanges(false);
        setShowAddProcedure(false);
        setCipClinicSelection('');
      }
    } else {
      setEditingInsurance(null);
      setShowAddProcedure(false);
      setCipClinicSelection('');
    }
  };


  const formatBRL = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0));
  const parseBRLInput = (s: string) => {
    const digits = String(s || '').replace(/\D/g, '');
    return Number(digits || 0) / 100;
  };

  const parsePackageInfo = (s: string) => {
    try {
      const j = JSON.parse(String(s || ''));
      return { sessions: Number(j.sessions || 0), price: Number(j.price || 0) };
    } catch {
      const txt = String(s || '');
      const sessMatch = txt.match(/(\d+)\s*(sess|sessões|sessoes)/i);
      const priceMatch = txt.match(/R\$\s*([\d\.\,]+)/i);
      const sessions = sessMatch ? Number(sessMatch[1]) : 0;
      const price = priceMatch ? Number(priceMatch[1].replace(/\./g, '').replace(/\,/g, '.')) : 0;
      return { sessions, price };
    }
  };

  const serializePackageInfo = (sessions: number, price: number) => {
    const s = Number(sessions || 0);
    const p = Number(price || 0);
    if (s > 1) return JSON.stringify({ sessions: s, price: p });
    return '';
  };

  const curatedProceduresCatalog = [
    { name: 'Consulta com Ortopedista', category: 'Consultas' },
    { name: 'Consulta Clínico Geral (somente unidade São José)', category: 'Consultas' },
    { name: 'Avaliação de Acupuntura', category: 'Avaliações' },
    { name: 'Avaliação de Fisioterapia Pélvica', category: 'Avaliações' },
    { name: 'Fisioterapia Ortopédica', category: 'Fisioterapia' },
    { name: 'Fisioterapia Neurológica', category: 'Fisioterapia' },
    { name: 'Fisioterapia Pélvica', category: 'Fisioterapia' },
    { name: 'Fisioterapia Respiratória', category: 'Fisioterapia' },
    { name: 'Fisioterapia Pós-operatória (unidade São José)', category: 'Fisioterapia' },
    { name: 'Acupuntura', category: 'Procedimentos Especiais' },
    { name: 'Estimulação Elétrica Transcutânea (TENS)', category: 'Procedimentos Especiais' },
    { name: 'Infiltração de ponto gatilho', category: 'Procedimentos Especiais' },
    { name: 'Agulhamento a Seco', category: 'Procedimentos Especiais' },
    { name: 'Quiropraxia', category: 'Procedimentos Especiais' },
    { name: 'Terapias por Ondas de Choque', category: 'Procedimentos Especiais' },
    { name: 'RPG – Reeducação Postural Global', category: 'Procedimentos Especiais' },
    { name: 'Pilates (2x/semana)', category: 'Procedimentos Especiais' },
    { name: 'Pilates (3x/semana)', category: 'Procedimentos Especiais' },
    { name: 'Pilates (avulso)', category: 'Procedimentos Especiais' }
  ];
  const curatedCategoryByName: Record<string, string> = Object.fromEntries(curatedProceduresCatalog.map(c => [c.name, c.category]));
  const curatedNamesSet = new Set(curatedProceduresCatalog.map(c => c.name));

  const parseInsuranceNotes = (notes: string) => {
    try {
      const j = JSON.parse(notes || '{}');
      return { sessionPrice: Number(j.sessionPrice || 0), packageSessions: Number(j.packageSessions || 0), packagePrice: Number(j.packagePrice || 0) };
    } catch {
      return { sessionPrice: 0, packageSessions: 0, packagePrice: 0 };
    }
  };

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
    } catch (error) { }
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
        api.get(`/api/clinic/clinics?q=${encodeURIComponent(clinicSearch)}&page=${clinicPage}&limit=${clinicLimit}`)
      ]);
      setInsurances(insRes.data?.insurances || []);
      setInsTotalPages(1);
      setProcedures(procRes.data?.procedures || []);
      setProcTotalPages(procRes.data?.pagination?.pages || 1);
      const clinicsData = clinicRes.data?.clinics || [];
      setClinics(clinicsData);
      setClinicTotalPages(clinicRes.data?.pagination?.pages || 1);
      const mapByClinic: Record<string, any[]> = {};
      clinicsData.forEach((c: any) => {
        mapByClinic[c.code] = Array.isArray(c.insurances) ? c.insurances : [];
      });
      setClinicInsurances(mapByClinic);
    } catch (error) {
      console.error('Error fetching clinic editable data:', error);
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
      payload.whatsapp = {
        token: settings.whatsappToken,
        appId: settings.metaAppId,
        appSecret: settings.metaAppSecret,
        phoneNumberId: settings.metaPhoneNumberId,
        businessAccountId: settings.metaBusinessAccountId,
        webhookUrl: settings.webhookUrl
      };
      payload.templates = botTemplates.map(t => ({ key: t.key, title: t.title, content: t.content }));
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
      setNewInsurance({ code: '', name: '', displayName: '', notes: '' });
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
        code: newProcedure.code,
        name: newProcedure.name,
        description: newProcedure.description,
        basePrice: 0,
        requiresEvaluation: false,
        duration: Number(newProcedure.duration),
        categories: curatedCategoryByName[newProcedure.name] ? [curatedCategoryByName[newProcedure.name]] : []
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

  const openCreateClinicModal = () => {
    setClinicFormMode('create');
    setClinicForm({
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
    setEditingClinic(null);
    setInsuranceCreateOpen(false);
    setEditingClinicInsurance(null);
    setClinicModalOpen(true);
  };

  const openEditClinicModal = (clinic: any) => {
    setClinicFormMode('edit');
    setClinicModalOpen(true);
    setLinkClinicInsuranceCodes([]); // Reset selection
    fetchClinicOfferedProcedures(clinic.code);
    setClinicForm({
      code: clinic.code || '',
      name: clinic.name || '',
      displayName: clinic.displayName || clinic.name || '',
      address: clinic.address || '',
      neighborhood: clinic.neighborhood || '',
      city: clinic.city || '',
      state: clinic.state || '',
      zipCode: clinic.zipCode || '',
      phone: clinic.phone || '',
      email: clinic.email || '',
      openingHours: typeof clinic.openingHours === 'string' ? clinic.openingHours : '',
      specialties: Array.isArray(clinic.specialties) ? clinic.specialties.join(', ') : (clinic.specialties || ''),
      parkingAvailable: !!clinic.parkingAvailable,
      accessibility: Array.isArray(clinic.accessibility) ? clinic.accessibility.join(', ') : (clinic.accessibility || '')
    });
    setEditingClinic(clinic);
    setInsuranceCreateOpen(false);
    setEditingClinicInsurance(null);
    setClinicModalOpen(true);
  };

  const saveClinicForm = async () => {
    try {
      if (!clinicForm.code || !clinicForm.name || !clinicForm.displayName) {
        toast.error('Preencha código, nome e nome de exibição da clínica');
        return;
      }
      const payload = {
        ...clinicForm,
        specialties: clinicForm.specialties.split(',').map(s => s.trim()).filter(Boolean),
        accessibility: clinicForm.accessibility.split(',').map(s => s.trim()).filter(Boolean)
      } as any;
      if (clinicFormMode === 'create') {
        await api.post('/api/clinics', payload);
        toast.success('Clínica criada');
      } else {
        await api.put(`/api/clinics/${clinicForm.code}`, payload);
        toast.success('Clínica atualizada');
      }
      setClinicModalOpen(false);
      fetchEditableData();
    } catch (error) {
      toast.error('Erro ao salvar clínica');
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

      {editingClinicInsurance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Gerenciar Procedimentos do Convênio: {editingClinicInsurance.displayName}</h3>
            <div className="mb-4">
              <select
                value={newClinicInsuranceProcedure.procedureCode}
                onChange={e => setNewClinicInsuranceProcedure({ ...newClinicInsuranceProcedure, procedureCode: e.target.value })}
                className="border p-2 rounded-md"
              >
                <option value="">Selecione um Procedimento</option>
                {procedures.map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Preço"
                value={newClinicInsuranceProcedure.price}
                onChange={e => setNewClinicInsuranceProcedure({ ...newClinicInsuranceProcedure, price: Number(e.target.value) })}
                className="border p-2 rounded-md mx-2"
              />
              <button
                onClick={() => saveClinicInsuranceProcedure(editingClinic.code, editingClinicInsurance.code, newClinicInsuranceProcedure)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Adicionar
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {clinicInsuranceProcedures.map(p => (
                <div key={p.procedureCode} className="flex items-center justify-between p-2 border-b">
                  <span>{p.name}</span>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={p.price}
                      onChange={e => {
                        const updated = clinicInsuranceProcedures.map(ip => ip.procedureCode === p.procedureCode ? { ...ip, price: Number(e.target.value) } : ip);
                        setClinicInsuranceProcedures(updated);
                      }}
                      className="border p-1 rounded-md w-24"
                    />
                    <input
                      type="checkbox"
                      checked={p.isActive}
                      onChange={e => {
                        const updated = clinicInsuranceProcedures.map(ip => ip.procedureCode === p.procedureCode ? { ...ip, isActive: e.target.checked } : ip);
                        setClinicInsuranceProcedures(updated);
                      }}
                      className="mx-2"
                    />
                    <button onClick={() => saveClinicInsuranceProcedure(editingClinic.code, editingClinicInsurance.code, p)} className="text-blue-600">Salvar</button>
                    <button onClick={() => deleteClinicInsuranceProcedure(editingClinic.code, editingClinicInsurance.code, p.procedureCode)} className="text-red-600 ml-2">Remover</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setEditingClinicInsurance(null)} className="mt-4 bg-gray-300 text-black px-4 py-2 rounded-md">Fechar</button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex space-x-2">
            {[
              { key: 'geral', label: 'Geral' },
              { key: 'chatbot', label: 'Chat+Bot' },
              { key: 'clinicas', label: 'Clínicas' },
              { key: 'convenioProc', label: 'Convênios e Procedimentos' },
              { key: 'templates', label: 'Templates do Bot' }
            ].map((t: any) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 rounded-md border ${activeTab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800'}`}>{t.label}</button>
            ))}
          </div>
        </div>
        {activeTab === 'geral' && (
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
        )}

        {activeTab === 'clinicas' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Phone className="h-5 w-5 mr-2 text-blue-600" />
              Gerenciamento de Clínicas
            </h2>

            <AnimatePresence>{confirmDeactivateOpen && insuranceToToggle && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" role="dialog" aria-modal="true">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                  <h3 className="text-lg font-semibold mb-2">Confirmar {insuranceToToggle.isActive ? 'desativação' : 'ativação'}</h3>
                  <p className="text-sm text-gray-600 mb-4">Tem certeza que deseja {insuranceToToggle.isActive ? 'desativar' : 'ativar'} o convênio {insuranceToToggle.displayName || insuranceToToggle.name}?</p>
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => { setConfirmDeactivateOpen(false); setInsuranceToToggle(null); }} className="px-4 py-2 border rounded-md">Cancelar</button>
                    <button onClick={async () => {
                      try {
                        await updateInsurance(insuranceToToggle.code, { ...insuranceToToggle, isActive: !insuranceToToggle.isActive });
                        setInsuranceEditHistory(prev => ([...prev, { action: insuranceToToggle.isActive ? 'desativar' : 'ativar', at: new Date().toISOString() }]));
                        toast.success(insuranceToToggle.isActive ? 'Convênio desativado' : 'Convênio ativado');
                      } catch { toast.error('Erro ao alternar ativo'); }
                      setConfirmDeactivateOpen(false); setInsuranceToToggle(null); fetchEditableData();
                    }} className="px-4 py-2 bg-blue-600 text-white rounded-md">Confirmar</button>
                  </div>
                </motion.div>
              </div>
            )}</AnimatePresence>


            {/* Clinics List */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-gray-900">Clínicas Cadastradas</h3>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={clinicSearch}
                    onChange={(e) => setClinicSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setClinicPage(1); fetchEditableData(); } }}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Buscar por nome, código, cidade ou convênio"
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
                  <button
                    onClick={openCreateClinicModal}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm"
                  >
                    Nova Clínica
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
                              const order = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
                              const entries = Object.entries(oh as Record<string, string>).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
                              return entries.map(([d, v]) => `${d}: ${v}`).join(', ');
                            } catch { }
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
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">Convênios vinculados:</p>
                      {(!clinicInsurances[clinic.code] || clinicInsurances[clinic.code].length === 0) ? (
                        <p className="text-xs text-gray-400 italic">Nenhum convênio vinculado</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {clinicInsurances[clinic.code].slice(0, 3).map((ci: any, index: number) => (
                            <span key={index} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                              {ci?.displayName || ci?.name || ci?.insuranceCode || ci?.code}
                            </span>
                          ))}
                          {clinicInsurances[clinic.code].length > 3 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +{clinicInsurances[clinic.code].length - 3} {clinicInsurances[clinic.code].length - 3 === 1 ? 'outro' : 'outros'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditClinicModal(clinic); }}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >Editar</button>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteClinic(clinic.code); }}
                        className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        Remover
                      </button>
                      <button
                        type="button"
                        onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await api.post('/api/clinic/import/infor-text'); fetchEditableData(); }}
                        className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                      >
                        Importar do arquivo
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {clinics.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhuma clínica cadastrada</p>
                  <p className="text-sm">Adicione sua primeira clínica usando o botão Nova Clínica</p>
                  <div className="mt-4">
                    <button
                      onClick={async () => { await api.post('/api/clinic/seed'); fetchEditableData(); }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md"
                    >Carregar do catálogo</button>
                    <button
                      onClick={async () => { await api.post('/api/clinic/import/infor-text'); fetchEditableData(); }}
                      className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-md"
                    >Importar do arquivo</button>
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
        )}

        {activeTab === 'chatbot' && (
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
        )}

        {activeTab === 'chatbot' && (
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
        )}

        {activeTab === 'chatbot' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Templates do Chat+Bot</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {botTemplates.map((t, idx) => (
                <div key={t.key} className="border rounded-md p-4">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                    <input type="text" value={t.title} onChange={(e) => {
                      const v = e.target.value; setBotTemplates(prev => prev.map((x, i) => i === idx ? { ...x, title: v } : x))
                    }} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
                    <textarea value={t.content} onChange={(e) => {
                      const v = e.target.value; setBotTemplates(prev => prev.map((x, i) => i === idx ? { ...x, content: v } : x))
                    }} className="w-full border border-gray-300 rounded-md px-3 py-2 h-32" placeholder="Use placeholders: ${procedimento_nome}, ${preco_particular}, ${unidade_nome}" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2">Pré-visualização</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <select value={previewClinic} onChange={(e) => setPreviewClinic(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                  <option value="">Selecione a unidade</option>
                  {clinics.map(c => (<option key={c.code} value={c.code}>{c.displayName || c.name}</option>))}
                </select>
                <select value={previewProcedure} onChange={(e) => setPreviewProcedure(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                  <option value="">Selecione o procedimento</option>
                  {procedures.map(p => (<option key={p.code} value={p.code}>{p.name}</option>))}
                </select>
                <select value={previewInsurance} onChange={(e) => setPreviewInsurance(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                  <option value="">Selecione o convênio</option>
                  {insurances.map(i => (<option key={i.code} value={i.code}>{i.displayName || i.name}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {botTemplates.map((t) => {
                  const clinic = clinics.find(c => c.code === previewClinic) || {} as any
                  const proc = procedures.find(p => p.code === previewProcedure) || {} as any
                  const ins = insurances.find(i => i.code === previewInsurance) || {} as any
                  const part = Number(previewPriceParticular || 0)
                  const conv = previewInsurance ? Number(previewPriceConvenio ?? 0) : part
                  const content = String(t.content || '')
                    .replace('${clinica_nome}', settings.clinicName || 'Clínica')
                    .replace('${procedimento_nome}', proc.name || '')
                    .replace('${procedimento_descricao}', proc.description || '')
                    .replace('${procedimento_duracao}', String(proc.duration || ''))
                    .replace('${unidade_nome}', clinic.displayName || clinic.name || '')
                    .replace('${endereco}', clinic.address || '')
                    .replace('${horario_atendimento}', (clinic.openingHours ? Object.entries(clinic.openingHours).map(([d, h]: any) => `${d}: ${h}`).join(', ') : ''))
                    .replace('${telefone}', settings.phoneNumber || '')
                    .replace('${preco_particular}', part.toFixed(2))
                    .replace('${convenio_nome}', ins.displayName || ins.name || '')
                    .replace('${preco_convenio}', conv.toFixed(2))
                  return (
                    <div key={t.key} className="border rounded-md p-4 bg-gray-50">
                      <div className="text-xs text-gray-500 mb-2">{t.title}</div>
                      <pre className="whitespace-pre-wrap text-sm">{content}</pre>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chatbot' && (
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
        )}

        {activeTab === 'geral' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissões por Nível</h2>
            <div className="overflow-x-auto">
              {['MASTER', 'ADMIN', 'SUPERVISOR', 'ATENDENTE'].map((role) => (
                <div key={role} className="mb-4">
                  <h3 className="text-sm font-medium text-gray-800 mb-2">{role}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['users', 'settings', 'workflows', 'patients', 'conversations', 'stats'].map((perm) => (
                      <label key={`${role}-${perm}`} className="flex items-center space-x-2">
                        <input type="checkbox" checked={!!rolePermissions?.[role]?.[perm]} onChange={(e) => setRolePermissions((prev: any) => ({ ...prev, [role]: { ...(prev?.[role] || {}), [perm]: e.target.checked } }))} />
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
        )}

        {activeTab === 'convenioProc' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Convênios</h2>
              <button type="button"
                onClick={() => { setInsuranceCreateOpen(true); setTimeout(() => createNameRef.current?.focus(), 50); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Convênio</span>
              </button>
              <button type="button"
                onClick={async () => { try { await api.post('/api/clinic/import/infor-text'); fetchEditableData(); toast.success('Dados importados de infor_clinic.txt'); } catch { toast.error('Falha ao importar infor_clinic.txt'); } }}
                className="ml-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 border"
              >
                Importar infor_clinic.txt
              </button>
            </div>
            <div className="flex items-center flex-wrap gap-2 mb-4">
              <div className="flex items-center border rounded-md overflow-hidden">
                <div className="pl-2 text-gray-500"><Search className="h-4 w-4" /></div>
                <input type="text" value={insSearch} onChange={(e) => setInsSearch(e.target.value)} placeholder="Buscar por nome" className="px-3 py-2 text-sm outline-none" />
              </div>
              <select value={insStatusFilter} onChange={(e) => setInsStatusFilter(e.target.value as any)} className="border rounded-md px-3 py-2 text-sm">
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
              <input type="date" value={insDateStart} onChange={(e) => setInsDateStart(e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
              <input type="date" value={insDateEnd} onChange={(e) => setInsDateEnd(e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
              <select value={insSortBy} onChange={(e) => setInsSortBy(e.target.value as any)} className="border rounded-md px-3 py-2 text-sm">
                <option value="name_asc">Nome (A-Z)</option>
                <option value="name_desc">Nome (Z-A)</option>
                <option value="coverage">Cobertura (maior primeiro)</option>
                <option value="created_desc">Criado (recentes primeiro)</option>
              </select>
              <button onClick={() => { setInsPage(1); fetchEditableData(); }} className="px-3 py-2 border rounded-md">Aplicar</button>
            </div>

            <div className="mt-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2">Nome</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Data de cadastro</th>
                    <th className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {([...insurances]
                    .sort((a: any, b: any) => {
                      if (insSortBy === 'coverage') return (b.procedureCount || 0) - (a.procedureCount || 0)
                      if (insSortBy === 'created_desc') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                      if (insSortBy === 'name_desc') return String(b.displayName || b.name || '').localeCompare(String(a.displayName || a.name || ''), 'pt-BR')
                      return String(a.displayName || a.name || '').localeCompare(String(b.displayName || b.name || ''), 'pt-BR')
                    }))
                    .filter((ic: any) => insStatusFilter === 'all' ? true : (insStatusFilter === 'active' ? Boolean(ic.isActive) : !Boolean(ic.isActive)))
                    .filter((ic: any) => {
                      const hasDate = !!ic.createdAt
                      const startOk = !insDateStart || (hasDate && new Date(ic.createdAt) >= new Date(insDateStart))
                      const endOk = !insDateEnd || (hasDate && new Date(ic.createdAt) <= new Date(insDateEnd))
                      return startOk && endOk
                    })
                    .map((ic) => (
                      <tr key={ic.code} className="border-t">
                        <td className="py-2">{ic.displayName || ic.name}</td>
                        <td className="py-2">{ic.isActive ? 'Ativo' : 'Inativo'}</td>
                        <td className="py-2">{ic.createdAt ? format(new Date(ic.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
                        <td className="py-2 space-x-2">
                          <button type="button" onClick={() => {
                            setEditingInsurance({ code: ic.code, name: ic.name, displayName: ic.displayName, isActive: !!ic.isActive });
                            setInsuranceEditHistory([]);
                            setCipClinicSelection('');
                            setClinicInsuranceProcedures([]);
                            setClinicOfferedProcedures([]);
                          }} className="px-3 py-1 border rounded-md">Editar</button>
                          <button onClick={() => { setInsuranceToToggle(ic); setConfirmDeactivateOpen(true); }} className="px-3 py-1 border rounded-md">{ic.isActive ? 'Desativar' : 'Ativar'}</button>
                          <button onClick={() => deleteInsurance(ic.code)} className="px-3 py-1 border rounded-md text-red-600">Remover</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="mt-3 text-right text-xs text-gray-500">Ordenação: {insSortBy}</div>
            </div>



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
        )}

        {activeTab === 'convenioProc' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Procedimentos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input type="text" value={newProcedure.code} onChange={(e) => setNewProcedure({ ...newProcedure, code: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <select value={newProcedure.name} onChange={(e) => {
                  const name = e.target.value;
                  const category = curatedCategoryByName[name] ? [curatedCategoryByName[name]] : [];
                  const autoCode = (newProcedure.code || '').trim() ? newProcedure.code : name.toLowerCase().normalize('NFD').replace(/[^\w\s-]/g, '').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
                  setNewProcedure({ ...newProcedure, name, code: autoCode, categories: category.join(',') })
                }} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="">Selecione</option>
                  {Object.entries(curatedProceduresCatalog.reduce((acc: Record<string, string[]>, item) => {
                    (acc[item.category] ||= []).push(item.name);
                    return acc;
                  }, {})).map(([cat, items]) => (
                    <optgroup key={cat} label={cat}>
                      {items.map((n) => (<option key={n} value={n}>{n}</option>))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input type="text" value={newProcedure.description} onChange={(e) => setNewProcedure({ ...newProcedure, description: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
                <input type="number" value={newProcedure.duration} onChange={(e) => setNewProcedure({ ...newProcedure, duration: Number(e.target.value) })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
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
                    <th className="py-2">Nome</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Informações Importantes</th>
                    <th className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(procSortAsc ? [...procedures] : [...procedures].reverse())
                    .filter((p) => {
                      const s = procSearch.trim().toLowerCase();
                      const okSearch = !s || p.name?.toLowerCase().includes(s) || p.code?.toLowerCase().includes(s);
                      const okFilter = !procFilterInsurance || procFilterCoverageCodes.includes(p.code);
                      return okSearch && okFilter;
                    })
                    .sort((a: any, b: any) => {
                      if (procSortBy === 'name') return String(a.name).localeCompare(String(b.name));
                      return Number(a.duration || 0) - Number(b.duration || 0);
                    })
                    .map((p) => (
                      <tr key={p.code} className="border-t">
                        <td className="py-2">
                          <select value={p.name} onChange={(e) => setProcedures(prev => prev.map(x => x.code === p.code ? { ...x, name: e.target.value, categories: curatedCategoryByName[e.target.value] ? [curatedCategoryByName[e.target.value]] : [] } : x))} className="border rounded-md px-2 py-1">
                            {Object.entries(curatedProceduresCatalog.reduce((acc: Record<string, string[]>, item) => {
                              (acc[item.category] ||= []).push(item.name);
                              return acc;
                            }, {})).map(([cat, items]) => (
                              <optgroup key={cat} label={cat}>
                                {items.map((n) => (<option key={n} value={n}>{n}</option>))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td className="py-2">
                          <input type="number" value={Number(p.duration || 30)} onChange={(e) => setProcedures(prev => prev.map(x => x.code === p.code ? { ...x, duration: Number(e.target.value) } : x))} className="border rounded-md px-2 py-1 w-28" />
                        </td>
                        <td className="py-2">
                          <textarea value={p.importantInfo || ''} onChange={(e) => setProcedures(prev => prev.map(x => x.code === p.code ? { ...x, importantInfo: e.target.value } : x))} className="border rounded-md px-2 py-1 w-64 h-20" placeholder="Informações contextuais para o bot..." />
                        </td>
                        <td className="py-2 space-x-2">
                          <button onClick={() => updateProcedure(p.code, { code: p.code, name: p.name, description: p.description, importantInfo: p.importantInfo, basePrice: 0, requiresEvaluation: false, duration: Number(p.duration || 30), categories: curatedCategoryByName[p.name] ? [curatedCategoryByName[p.name]] : [] })} className="px-3 py-1 border rounded-md">Salvar</button>
                          <button onClick={() => setEditingProcedure(p)} className="px-3 py-1 border rounded-md">Editar</button>
                          <button onClick={() => deleteProcedure(p.code)} className="px-3 py-1 border rounded-md text-red-600">Remover</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="flex items-center justify-end space-x-2 mt-3">
                <button disabled={procPage <= 1} onClick={() => { setProcPage(p => Math.max(1, p - 1)); fetchEditableData(); }} className="px-3 py-1 border rounded-md">Anterior</button>
                <span className="text-sm">Página {procPage} de {procTotalPages}</span>
                <button disabled={procPage >= procTotalPages} onClick={() => { setProcPage(p => Math.min(procTotalPages, p + 1)); fetchEditableData(); }} className="px-3 py-1 border rounded-md">Próxima</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {editingInsurance && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Editar Convênio</h3>
              <button onClick={handleCloseInsuranceModal} className="p-2 text-gray-500 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Basic Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  value={editingInsurance.code}
                  onChange={(e) => { setEditingInsurance({ ...editingInsurance, code: e.target.value }); setInsuranceHasChanges(true); }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  value={editingInsurance.name}
                  onChange={(e) => { setEditingInsurance({ ...editingInsurance, name: e.target.value }); setInsuranceHasChanges(true); }}
                  className={`w-full border rounded-md px-3 py-2 ${!editingInsurance.name ? 'border-red-400' : 'border-gray-300'}`}
                  aria-invalid={!editingInsurance.name}
                  aria-required="true"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Exibição</label>
                <input
                  value={editingInsurance.displayName}
                  onChange={(e) => { setEditingInsurance({ ...editingInsurance, displayName: e.target.value }); setInsuranceHasChanges(true); }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingInsurance.discount || false}
                    onChange={(e) => { setEditingInsurance({ ...editingInsurance, discount: e.target.checked }); setInsuranceHasChanges(true); }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Convênio com Desconto</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingInsurance.isParticular || false}
                    onChange={(e) => { setEditingInsurance({ ...editingInsurance, isParticular: e.target.checked }); setInsuranceHasChanges(true); }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Particular</span>
                </label>
              </div>
              {editingInsurance.discount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={editingInsurance.discountPercentage || 0}
                    onChange={(e) => { setEditingInsurance({ ...editingInsurance, discountPercentage: Number(e.target.value) }); setInsuranceHasChanges(true); }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Ex: 20 para 20% de desconto"
                  />
                </div>
              )}
            </div>

            {/* Procedures Section */}
            <div className="border-t pt-4 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Procedimentos Associados</h4>
                <div className="flex items-center space-x-2">
                  <select
                    value={cipClinicSelection}
                    onChange={(e) => {
                      e.stopPropagation();
                      const v = e.target.value;
                      setCipClinicSelection(v);
                      if (v) fetchClinicOfferedProcedures(v);
                      else setClinicOfferedProcedures([]);
                    }}
                    className="border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Selecione a clínica</option>
                    {clinics.map(c => (<option key={c.code} value={c.code}>{c.displayName || c.name}</option>))}
                  </select>
                  <button
                    onClick={() => { setCipSortBy(b => b === 'name' ? 'price' : 'name'); }}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    Ordenar por {cipSortBy === 'name' ? 'preço' : 'nome'}
                  </button>
                  <button
                    onClick={() => setCipSortAsc(a => !a)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    {cipSortAsc ? 'Asc' : 'Desc'}
                  </button>
                </div>
              </div>

              {cipClinicSelection && (
                <>
                  {cipLoading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    </div>
                  )}

                  {/* Prominent Add Procedure Button */}
                  <button
                    onClick={() => setShowAddProcedure(!showAddProcedure)}
                    className="mb-4 w-full bg-blue-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    {showAddProcedure ? 'Cancelar' : 'Adicionar Procedimento'}
                  </button>

                  {/* Add Procedure Form */}
                  {showAddProcedure && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 gap-3 mb-3">
                        <select
                          value={newClinicInsuranceProcedure.procedureCode}
                          onChange={e => setNewClinicInsuranceProcedure({ ...newClinicInsuranceProcedure, procedureCode: e.target.value })}
                          className="border p-2 rounded-md text-sm"
                        >
                          <option value="">Selecione um procedimento</option>
                          {Object.entries(curatedProceduresCatalog.reduce((acc: Record<string, string[]>, item) => {
                            (acc[item.category] ||= []).push(item.name);
                            return acc;
                          }, {})).map(([cat, items]) => (
                            <optgroup key={cat} label={cat}>
                              {items.map((n) => {
                                const code = procedures.find(p => p.name === n)?.code;
                                const isOffered = clinicOfferedProcedures.some(cp => cp.code === code);
                                return code && isOffered ? (<option key={code} value={code}>{n}</option>) : null;
                              })}
                            </optgroup>
                          ))}
                        </select>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-600">Aplicar a clínicas:</span>
                          {clinics.map(c => (
                            <label key={c.code} className="inline-flex items-center space-x-1 text-xs border rounded px-2 py-1 hover:bg-gray-100 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedClinicsForNewProc.includes(c.code)}
                                onChange={(e) => {
                                  setSelectedClinicsForNewProc(prev => e.target.checked ? Array.from(new Set([...prev, c.code])) : prev.filter(x => x !== c.code))
                                }}
                              />
                              <span>{c.displayName || c.name}</span>
                            </label>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Preço por sessão"
                            value={formatBRL(Number(newClinicInsuranceProcedure.price || 0))}
                            onChange={e => setNewClinicInsuranceProcedure({ ...newClinicInsuranceProcedure, price: parseBRLInput(e.target.value) })}
                            disabled={!editingInsurance?.isParticular}
                            className="border p-2 rounded-md text-sm disabled:opacity-50 disabled:bg-gray-100"
                          />
                          <div className="flex items-center gap-3">
                            <label className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={newClinicInsuranceProcedure.isActive}
                                onChange={e => setNewClinicInsuranceProcedure({ ...newClinicInsuranceProcedure, isActive: e.target.checked })}
                              />
                              <span>Ativo</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={newClinicInsuranceProcedure.hasPackage}
                                onChange={e => setNewClinicInsuranceProcedure({ ...newClinicInsuranceProcedure, hasPackage: e.target.checked })}
                                disabled={!editingInsurance?.isParticular}
                              />
                              <span>Pacote</span>
                            </label>
                          </div>
                        </div>

                        {newClinicInsuranceProcedure.hasPackage && (
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="Qtd. Sessões (Pacote)"
                              value={String(newClinicInsuranceProcedure.packageSessions || 0) === '0' ? '' : String(newClinicInsuranceProcedure.packageSessions)}
                              onChange={e => { const d = e.target.value.replace(/\D/g, ''); setNewClinicInsuranceProcedure({ ...newClinicInsuranceProcedure, packageSessions: Number(d || 0) }) }}
                              disabled={!editingInsurance?.isParticular}
                              className="border p-2 rounded-md text-sm disabled:opacity-50 disabled:bg-gray-100"
                            />
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="Valor do Pacote"
                              value={formatBRL(Number(newClinicInsuranceProcedure.packagePrice || 0))}
                              onChange={e => setNewClinicInsuranceProcedure({ ...newClinicInsuranceProcedure, packagePrice: parseBRLInput(e.target.value) })}
                              disabled={!editingInsurance?.isParticular || Number(newClinicInsuranceProcedure.packageSessions || 0) <= 1}
                              className="border p-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleAddProcedure}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setShowAddProcedure(false)}
                          className="flex-1 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Procedures List with Scroll */}
                  <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                        <tr className="text-left text-gray-700">
                          <th className="py-2 px-3">Nome</th>
                          <th className="py-2 px-3">Tipo</th>
                          <th className="py-2 px-3">Informações Importantes</th>
                          <th className="py-2 px-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(cipSortAsc ? [...clinicInsuranceProcedures] : [...clinicInsuranceProcedures].reverse())
                          .sort((a: any, b: any) => {
                            if (cipSortBy === 'name') return String(a.name || a.procedureCode).localeCompare(String(b.name || b.procedureCode));
                            return Number(a.price || 0) - Number(b.price || 0);
                          })
                          .map((p: any) => (
                            <tr key={p.procedureCode} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 px-3">{p.name || p.procedureCode}</td>
                              <td className="py-2 px-3">Convênio</td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatBRL(Number(p.price || 0))}
                                  onChange={e => handleProcedureChange(p.procedureCode, 'price', parseBRLInput(e.target.value))}
                                  className="border rounded-md px-2 py-1 w-32"
                                />
                              </td>
                              <td className="py-2 px-3 space-x-2">
                                <label className="inline-flex items-center space-x-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={!!p.isActive}
                                    onChange={e => handleProcedureChange(p.procedureCode, 'isActive', e.target.checked)}
                                  />
                                  <span>Ativo</span>
                                </label>
                                <label className="inline-flex items-center space-x-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={!!p.hasPackage}
                                    onChange={e => handleProcedureChange(p.procedureCode, 'hasPackage', e.target.checked)}
                                  />
                                  <span>Pacote</span>
                                </label>
                                {p.hasPackage && (
                                  <span className="inline-flex items-center space-x-2">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={String(p._packageSessions || 0) === '0' ? '' : String(p._packageSessions)}
                                      onChange={e => {
                                        const d = e.target.value.replace(/\D/g, '');
                                        handleProcedureChange(p.procedureCode, '_packageSessions', Number(d || 0));
                                      }}
                                      className="border rounded-md px-2 py-1 text-xs w-20"
                                      placeholder="Qtd."
                                    />
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={formatBRL(Number(p._packagePrice || 0))}
                                      onChange={e => handleProcedureChange(p.procedureCode, '_packagePrice', parseBRLInput(e.target.value))}
                                      disabled={Number(p._packageSessions || 0) <= 1}
                                      className="border rounded-md px-2 py-1 text-xs w-24 disabled:opacity-50 disabled:cursor-not-allowed"
                                      placeholder="R$ 0,00"
                                    />
                                  </span>
                                )}
                                <button
                                  onClick={() => handleRemoveProcedure(p.procedureCode)}
                                  className="px-2 py-1 border border-red-300 rounded-md text-xs text-red-600 hover:bg-red-50"
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))}
                        {clinicInsuranceProcedures.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-500">
                              Nenhum procedimento associado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {!cipClinicSelection && (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                  Selecione uma clínica para gerenciar procedimentos
                </div>
              )}
            </div>

            {/* Footer with Save Button */}
            <div className="border-t pt-4 mt-4 flex justify-end gap-2">
              <button
                onClick={handleCloseInsuranceModal}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveInsurance}
                disabled={!insuranceHasChanges}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>{insuranceCreateOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Adicionar Convênio</h3>
              <button onClick={() => setInsuranceCreateOpen(false)} className="p-2 text-gray-500 hover:text-gray-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input ref={createNameRef} type="text" value={insuranceForm.name} onChange={(e) => setInsuranceForm({ ...insuranceForm, name: e.target.value })} className={`w-full border rounded-md px-3 py-2 ${!insuranceForm.name ? 'border-red-400' : 'border-gray-300'}`} aria-invalid={!insuranceForm.name} aria-required="true" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input type="text" value={insuranceForm.code} onChange={(e) => setInsuranceForm({ ...insuranceForm, code: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="ex: unimed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Exibição</label>
                <input type="text" value={insuranceForm.displayName} onChange={(e) => setInsuranceForm({ ...insuranceForm, displayName: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={insuranceForm.discount || false}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, discount: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Convênio com Desconto</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={insuranceForm.isParticular || false}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, isParticular: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Particular</span>
                </label>
              </div>
              {insuranceForm.discount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={insuranceForm.discountPercentage || 0}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, discountPercentage: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Ex: 20 para 20% de desconto"
                  />
                </div>
              )}
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">Procedimentos Associados</h4>
                  <div className="flex items-center space-x-2">
                    <select value={newInsuranceClinicSelection} onChange={(e) => setNewInsuranceClinicSelection(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                      <option value="">Selecione a clínica</option>
                      {clinics.map(c => (<option key={c.code} value={c.code}>{c.displayName || c.name}</option>))}
                    </select>
                  </div>
                </div>
                {newInsuranceClinicSelection && (
                  <div>
                    <div className="mb-3 flex items-center space-x-2">
                      <select value={newInsuranceProcedure.procedureCode} onChange={e => setNewInsuranceProcedure({ ...newInsuranceProcedure, procedureCode: e.target.value })} className="border p-2 rounded-md text-sm">
                        <option value="">Selecione</option>
                        {Object.entries(curatedProceduresCatalog.reduce((acc: Record<string, string[]>, item) => {
                          (acc[item.category] ||= []).push(item.name);
                          return acc;
                        }, {})).map(([cat, items]) => (
                          <optgroup key={cat} label={cat}>
                            {items.map((n) => {
                              const code = procedures.find(p => p.name === n)?.code;
                              return code ? (<option key={code} value={code}>{n}</option>) : null;
                            })}
                          </optgroup>
                        ))}
                      </select>
                      <input type="text" inputMode="numeric" placeholder="Preço por sessão" value={formatBRL(Number(newInsuranceProcedure.price || 0))} onChange={e => setNewInsuranceProcedure({ ...newInsuranceProcedure, price: parseBRLInput(e.target.value) })} disabled={!insuranceForm.isParticular} className="border p-2 rounded-md text-sm disabled:opacity-50 disabled:bg-gray-100" />
                      <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={newInsuranceProcedure.isActive} onChange={e => setNewInsuranceProcedure({ ...newInsuranceProcedure, isActive: e.target.checked })} /><span>Ativo</span></label>
                      <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={newInsuranceProcedure.hasPackage} onChange={e => setNewInsuranceProcedure({ ...newInsuranceProcedure, hasPackage: e.target.checked })} disabled={!insuranceForm.isParticular} /><span>Pacote</span></label>
                      {newInsuranceProcedure.hasPackage && (
                        <div className="flex items-center space-x-2">
                          <input type="text" inputMode="numeric" placeholder="Qtd. Sessões (Pacote)" value={String(newInsuranceProcedure.packageSessions || 0) === '0' ? '' : String(newInsuranceProcedure.packageSessions)} onChange={e => { const d = e.target.value.replace(/\D/g, ''); setNewInsuranceProcedure({ ...newInsuranceProcedure, packageSessions: Number(d || 0) }) }} disabled={!insuranceForm.isParticular} className="border p-2 rounded-md text-sm disabled:opacity-50 disabled:bg-gray-100" />
                          <input type="text" inputMode="numeric" placeholder="Valor do Pacote" value={formatBRL(Number(newInsuranceProcedure.packagePrice || 0))} onChange={e => setNewInsuranceProcedure({ ...newInsuranceProcedure, packagePrice: parseBRLInput(e.target.value) })} disabled={!insuranceForm.isParticular || Number(newInsuranceProcedure.packageSessions || 0) <= 1} className="border p-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100" />
                        </div>
                      )}
                      <button onClick={() => {
                        if (!newInsuranceProcedure.procedureCode) { toast.error('Selecione um procedimento'); return; }
                        setNewInsuranceProcedureList(prev => {
                          const item = { ...newInsuranceProcedure };
                          const exists = prev.some(x => x.procedureCode === item.procedureCode);
                          return exists ? prev.map(x => x.procedureCode === item.procedureCode ? item : x) : [...prev, item];
                        })
                      }} className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm">Adicionar</button>
                    </div>
                    {newInsuranceProcedureList.length > 0 && (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600">
                            <th className="py-2">Nome</th>
                            <th className="py-2">Informações Importantes</th>
                            <th className="py-2">Pacote</th>
                            <th className="py-2">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {newInsuranceProcedureList.map((p: any) => (
                            <tr key={p.procedureCode} className="border-t">
                              <td className="py-2">{procedures.find(q => q.code === p.procedureCode)?.name || p.procedureCode}</td>
                              <td className="py-2">
                                <input type="text" inputMode="numeric" value={formatBRL(Number(p.price || 0))} onChange={e => {
                                  const v = parseBRLInput(e.target.value);
                                  setNewInsuranceProcedureList(prev => prev.map(x => x.procedureCode === p.procedureCode ? { ...x, price: v } : x));
                                }} className="border rounded-md px-2 py-1 w-32" />
                              </td>
                              <td className="py-2 space-x-2">
                                <label className="inline-flex items-center space-x-1 text-xs"><input type="checkbox" checked={!!p.hasPackage} onChange={e => setNewInsuranceProcedureList(prev => prev.map(x => x.procedureCode === p.procedureCode ? { ...x, hasPackage: e.target.checked } : x))} /><span>Pacote</span></label>
                                {p.hasPackage && (
                                  <span className="inline-flex items-center space-x-2">
                                    <input type="text" inputMode="numeric" value={String(p.packageSessions || 0) === '0' ? '' : String(p.packageSessions)} onChange={e => {
                                      const d = e.target.value.replace(/\D/g, '');
                                      setNewInsuranceProcedureList(prev => prev.map(x => x.procedureCode === p.procedureCode ? { ...x, packageSessions: Number(d || 0) } : x));
                                    }} className="border rounded-md px-2 py-1 text-xs w-24" placeholder="Qtd. sessões" />
                                    <input type="text" inputMode="numeric" value={formatBRL(Number(p.packagePrice || 0))} onChange={e => {
                                      const val = parseBRLInput(e.target.value);
                                      setNewInsuranceProcedureList(prev => prev.map(x => x.procedureCode === p.procedureCode ? { ...x, packagePrice: val } : x));
                                    }} disabled={Number(p.packageSessions || 0) <= 1} className="border rounded-md px-2 py-1 text-xs w-28 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="R$ 0,00" />
                                  </span>
                                )}
                              </td>
                              <td className="py-2 space-x-2">
                                <button onClick={() => setNewInsuranceProcedureList(prev => prev.filter(x => x.procedureCode !== p.procedureCode))} className="px-2 py-1 border rounded-md text-xs text-red-600">Remover</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 mt-6">
              <button onClick={() => setInsuranceCreateOpen(false)} className="px-4 py-2 border rounded-md">Cancelar</button>
              <button onClick={async () => {
                try {
                  const validName = !!insuranceForm.name;
                  if (!validName) { toast.error('Preencha os campos obrigatórios'); return; }
                  const code = insuranceForm.code || insuranceForm.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  const payload = { code, name: insuranceForm.name, displayName: insuranceForm.displayName || insuranceForm.name, isActive: true };
                  await api.post('/api/clinic/insurances', payload);
                  if (newInsuranceClinicSelection && newInsuranceProcedureList.length > 0) {
                    await api.post(`/api/clinic/clinics/${newInsuranceClinicSelection}/insurances/${code}`, { active: true });
                    for (const proc of newInsuranceProcedureList) {
                      await saveClinicInsuranceProcedure(newInsuranceClinicSelection, code, proc);
                    }
                  }
                  setInsuranceCreateOpen(false);
                  setInsuranceForm({ code: '', name: '', displayName: '', sessionPrice: 0, packagePrice: 0, packageSessions: 0, packageSessionsStr: '', isActive: true, notes: '', discountPercentage: 0, discount: false, isParticular: false });
                  setNewInsuranceClinicSelection('');
                  setNewInsuranceProcedure({ procedureCode: '', price: 0, isActive: true, hasPackage: false, packageSessions: 0, packagePrice: 0 });
                  setNewInsuranceProcedureList([]);
                  fetchEditableData();
                  toast.success('Convênio criado');
                } catch { toast.error('Erro ao criar convênio'); }
              }} className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar</button>
            </div>
          </motion.div>
        </div>
      )}</AnimatePresence>

      <AnimatePresence>{clinicModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{clinicFormMode === 'create' ? 'Nova Clínica' : 'Editar Clínica'}</h3>
              <button onClick={() => setClinicModalOpen(false)} className="p-2 text-gray-500 hover:text-gray-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input type="text" value={clinicForm.code} onChange={(e) => setClinicForm({ ...clinicForm, code: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Ex: vieiralves" disabled={clinicFormMode === 'edit'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={clinicForm.name} onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Ex: Clínica Vieiralves" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Exibição</label>
                <input type="text" value={clinicForm.displayName} onChange={(e) => setClinicForm({ ...clinicForm, displayName: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Ex: Unidade Vieiralves" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input type="text" value={clinicForm.address} onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Rua, número, complemento" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input type="text" value={clinicForm.neighborhood} onChange={(e) => setClinicForm({ ...clinicForm, neighborhood: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Ex: Vieiralves" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input type="text" value={clinicForm.city} onChange={(e) => setClinicForm({ ...clinicForm, city: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Ex: Manaus" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <input type="text" value={clinicForm.state} onChange={(e) => setClinicForm({ ...clinicForm, state: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Ex: AM" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <input type="text" value={clinicForm.zipCode} onChange={(e) => setClinicForm({ ...clinicForm, zipCode: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="00000-000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input type="text" value={clinicForm.phone} onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={clinicForm.email} onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="clinica@email.com" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Funcionamento</label>
                <input type="text" value={clinicForm.openingHours} onChange={(e) => setClinicForm({ ...clinicForm, openingHours: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Seg-Sex: 08:00-18:00, Sáb: 08:00-12:00" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidades (separadas por vírgula)</label>
                <input type="text" value={clinicForm.specialties} onChange={(e) => setClinicForm({ ...clinicForm, specialties: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Fisioterapia, Acupuntura, RPG" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Acessibilidade (separadas por vírgula)</label>
                <input type="text" value={clinicForm.accessibility} onChange={(e) => setClinicForm({ ...clinicForm, accessibility: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Estacionamento, Acesso para cadeirantes, Elevador" />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={clinicForm.parkingAvailable} onChange={(e) => setClinicForm({ ...clinicForm, parkingAvailable: e.target.checked })} />
                <span className="text-sm text-gray-700">Estacionamento disponível</span>
              </div>
            </div>
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Procedimentos Oferecidos</h4>

                {/* Add Procedure Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowOfferedProcDropdown(!showOfferedProcDropdown)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar procedimentos
                    {selectedOfferedProcs.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                        {selectedOfferedProcs.length}
                      </span>
                    )}
                  </button>

                  {showOfferedProcDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="p-3 border-b border-gray-200">
                        <input
                          type="text"
                          value={offeredProcQuery}
                          onChange={e => setOfferedProcQuery(e.target.value)}
                          placeholder="Buscar procedimentos..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                        />
                      </div>

                      <div className="max-h-64 overflow-y-auto">
                        {(() => {
                          const alreadyOffered = clinicOfferedProcedures.map(p => p.code);
                          const available = procedures
                            .filter(p => !alreadyOffered.includes(p.code))
                            .filter(p => p.name.toLowerCase().includes(offeredProcQuery.toLowerCase()));

                          return available.length > 0 ? (
                            available.map(p => {
                              const selected = selectedOfferedProcs.includes(p.code);
                              return (
                                <button
                                  key={p.code}
                                  type="button"
                                  onClick={() => setSelectedOfferedProcs(prev =>
                                    selected ? prev.filter(c => c !== p.code) : [...prev, p.code]
                                  )}
                                  className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                                    }`}
                                >
                                  <span>{p.name}</span>
                                  {selected && <Check className="h-4 w-4 text-indigo-600" />}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                              Nenhum procedimento encontrado
                            </div>
                          );
                        })()}
                      </div>

                      <div className="p-3 border-t border-gray-200 flex justify-end gap-2">
                        <button
                          onClick={() => setShowOfferedProcDropdown(false)}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleAddOfferedProcedures}
                          disabled={selectedOfferedProcs.length === 0}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* List of Offered Procedures */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-60 overflow-y-auto">
                {clinicOfferedProcedures.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clinicOfferedProcedures.map(p => (
                      <div key={p.code} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200 shadow-sm">
                        <span className="text-sm truncate mr-2" title={p.name}>{p.name}</span>
                        <button
                          onClick={() => handleRemoveOfferedProcedure(p.code)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remover procedimento"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4 text-sm">
                    Nenhum procedimento oferecido por esta clínica.
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Convênios vinculados</h4>
                {/* Elegant Multi-Select Dropdown */}
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowInsuranceDropdown(!showInsuranceDropdown)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar convênios
                        {linkClinicInsuranceCodes.length > 0 && (
                          <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                            {linkClinicInsuranceCodes.length}
                          </span>
                        )}
                      </button>

                      {/* Dropdown */}
                      {showInsuranceDropdown && (
                        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          {/* Search Input */}
                          <div className="p-3 border-b border-gray-200">
                            <input
                              type="text"
                              value={insMultiQuery}
                              onChange={e => setInsMultiQuery(e.target.value)}
                              placeholder="Buscar convênios..."
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              autoFocus
                            />
                          </div>

                          {/* Selected Pills */}
                          {linkClinicInsuranceCodes.length > 0 && (
                            <div className="p-3 border-b border-gray-100 bg-gray-50">
                              <div className="flex flex-wrap gap-1">
                                {linkClinicInsuranceCodes.map(code => {
                                  const ic = insurances.find(i => i.code === code);
                                  return (
                                    <span key={code} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
                                      {ic?.displayName || ic?.name || code}
                                      <button
                                        type="button"
                                        onClick={() => setLinkClinicInsuranceCodes(prev => prev.filter(c => c !== code))}
                                        className="hover:text-indigo-900"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Insurance List */}
                          <div className="max-h-64 overflow-y-auto">
                            {(() => {
                              // Get already linked insurance codes for this clinic
                              const alreadyLinked = editingClinic
                                ? (clinicInsurances[editingClinic.code] || []).map((ci: any) => ci.code)
                                : [];

                              const sorted = [...insurances].sort((a, b) => {
                                const an = (a.displayName || a.name || '').toLowerCase();
                                const bn = (b.displayName || b.name || '').toLowerCase();
                                return an.localeCompare(bn);
                              });

                              // Filter out already linked insurances
                              const filtered = sorted.filter(ic =>
                                !alreadyLinked.includes(ic.code) &&
                                (ic.displayName || ic.name || '').toLowerCase().includes(insMultiQuery.toLowerCase())
                              );

                              return filtered.length > 0 ? (
                                filtered.map(ic => {
                                  const selected = linkClinicInsuranceCodes.includes(ic.code);
                                  return (
                                    <button
                                      key={ic.code}
                                      type="button"
                                      onClick={() => setLinkClinicInsuranceCodes(prev =>
                                        selected ? prev.filter(c => c !== ic.code) : [...prev, ic.code]
                                      )}
                                      className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                                        }`}
                                    >
                                      <span>{ic.displayName || ic.name}</span>
                                      {selected && <Check className="h-4 w-4 text-indigo-600" />}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-4 py-8 text-center text-sm text-gray-500">
                                  Nenhum convênio encontrado
                                </div>
                              );
                            })()}
                          </div>

                          {/* Footer Actions */}
                          <div className="p-3 border-t border-gray-200 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                // Get already linked insurance codes for this clinic
                                const alreadyLinked = editingClinic
                                  ? (clinicInsurances[editingClinic.code] || []).map((ci: any) => ci.code)
                                  : [];

                                const sorted = [...insurances].sort((a, b) => {
                                  const an = (a.displayName || a.name || '').toLowerCase();
                                  const bn = (b.displayName || b.name || '').toLowerCase();
                                  return an.localeCompare(bn);
                                });

                                // Filter out already linked insurances
                                const filtered = sorted.filter(ic =>
                                  !alreadyLinked.includes(ic.code) &&
                                  (ic.displayName || ic.name || '').toLowerCase().includes(insMultiQuery.toLowerCase())
                                );
                                const allCodes = filtered.map(i => i.code);
                                setLinkClinicInsuranceCodes(Array.from(new Set([...linkClinicInsuranceCodes, ...allCodes])));
                              }}
                              className="text-xs text-indigo-600 hover:text-indigo-700"
                            >
                              Selecionar todos
                            </button>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowInsuranceDropdown(false);
                                  setLinkClinicInsuranceCodes([]);
                                  setInsMultiQuery('');
                                }}
                                className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    if (!editingClinic || !editingClinic.code) {
                                      toast.error('Selecione a clínica');
                                      return;
                                    }
                                    const codes = linkClinicInsuranceCodes.filter(Boolean);
                                    if (codes.length === 0) {
                                      toast.error('Selecione ao menos um convênio');
                                      return;
                                    }
                                    for (const code of codes) {
                                      await api.post(`/api/clinic/clinics/${editingClinic.code}/insurances/${code}`, { isActive: true });
                                    }
                                    const res = await api.get(`/api/clinic/clinics/${editingClinic.code}/insurances`);
                                    setClinicInsurances(prev => ({ ...prev, [editingClinic.code]: res.data?.insurances || [] }));
                                    setLinkClinicInsuranceCodes([]);
                                    setInsMultiQuery('');
                                    setShowInsuranceDropdown(false);
                                    toast.success(`${codes.length} convênio(s) vinculado(s)`);
                                  } catch (error) {
                                    console.error('Error linking insurances:', error);
                                    toast.error('Erro ao vincular convênios');
                                  }
                                }}
                                disabled={linkClinicInsuranceCodes.length === 0}
                                className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Adicionar ({linkClinicInsuranceCodes.length})
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {editingClinic && (clinicInsurances[editingClinic.code] || []).map((ci: any) => (
                  <div key={ci.code} className="flex items-center justify-between p-2 bg-gray-50 border rounded">
                    <div className="text-sm">{ci.displayName || ci.name}</div>
                    <div className="flex items-center space-x-2">
                      <button onClick={async () => { setEditingClinicInsurance(ci); await fetchClinicInsuranceProcedures(editingClinic.code, ci.code); }} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded">Ver procedimentos</button>
                      <button onClick={async () => { try { await api.delete(`/api/clinic/clinics/${editingClinic.code}/insurances/${ci.code}`); const res = await api.get(`/api/clinic/clinics/${editingClinic.code}/insurances`); setClinicInsurances(prev => ({ ...prev, [editingClinic.code]: res.data?.insurances || [] })); toast.success('Convênio desvinculado'); } catch { toast.error('Erro ao desvincular'); } }} className="text-xs px-2 py-1 bg-red-600 text-white rounded">Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 mt-6">
              <button onClick={() => setClinicModalOpen(false)} className="px-4 py-2 border rounded-md">Cancelar</button>
              <button onClick={saveClinicForm} className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar</button>
            </div>
          </motion.div>
        </div>
      )}</AnimatePresence>

        {activeTab === 'templates' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <TemplateManager />
          </div>
        )}

    </div >
  );
};

export { Settings };
