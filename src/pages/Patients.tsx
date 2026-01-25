import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  Search, 
  Plus,
  Edit,
  Trash2,
  Filter,
  Download,
  Upload,
  History,
  X
} from 'lucide-react';
import { api } from '../lib/utils';
import { toast } from 'sonner';
import ConversationHistoryModal from '../components/ConversationHistoryModal';
import { PatientTableSkeleton } from '../components/PatientTableSkeleton';

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  insuranceCompany?: string;
  insuranceNumber?: string;
  birthDate?: string;
  address?: string;
  preferences?: any;
  createdAt: string;
  updatedAt: string;
  interactionsCount: number;
  lastInteractionAt?: string;
}

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<Patient | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    insuranceCompany: '',
    insuranceNumber: '',
    birthDate: '',
    address: ''
  });
  
  // Estados dos filtros
  const [filters, setFilters] = useState({
    insuranceCompany: '',
    hasEmail: '',
    hasBirthDate: '',
    minInteractions: '',
    sortBy: 'name' // 'name', 'createdAt', 'interactionsCount'
  });
  
  // Convênios únicos para o filtro
  const [availableInsurances, setAvailableInsurances] = useState<string[]>([]);

  const fetchPatients = async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(search && { search })
      });
      
      console.log(`🔍 fetchPatients - Fetching page ${page}, search: "${search}"`);
      const response = await api.get(`/api/patients?${params.toString()}`);
      
      console.log(`🔍 fetchPatients - Response:`, {
        patientsCount: response.data?.patients?.length || 0,
        total: response.data?.pagination?.total || 0,
        page: response.data?.pagination?.page || 1
      });
      
      const list = (response.data?.patients || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        email: p.email || '',
        cpf: p.cpf || '',
        insuranceCompany: p.insuranceCompany || '',
        insuranceNumber: p.insuranceNumber || '',
        birthDate: p.birthDate || '',
        address: p.address || '',
        preferences: p.preferences || {},
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        interactionsCount: (p.interactionsCount ?? (p.conversations ? p.conversations.length : 0)) || 0,
        lastInteractionAt: p.conversations && p.conversations[0]?.lastTimestamp ? p.conversations[0].lastTimestamp : null,
      }));
      
      console.log(`🔍 fetchPatients - Mapped patients:`, list.map(p => ({ name: p.name, phone: p.phone, insurance: p.insuranceCompany })));
      
      // Ordenar por nome alfabeticamente
      const sortedList = list.sort((a, b) => 
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      );
      
      setPatients(sortedList);
      
      // Extrair convênios únicos para o filtro (apenas se não houver pesquisa)
      // Durante pesquisa, não atualizamos a lista de convênios para não perder contexto
      if (!search) {
        const insurances = [...new Set(list.map(p => p.insuranceCompany).filter(Boolean))] as string[];
        setAvailableInsurances(insurances.sort());
      }
      
      // Update pagination info
      if (response.data?.pagination) {
        setTotalPages(response.data.pagination.pages || 1);
        setTotalPatients(response.data.pagination.total || 0);
        console.log(`🔍 fetchPatients - Pagination: page ${response.data.pagination.page}, total: ${response.data.pagination.total}, pages: ${response.data.pagination.pages}`);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search - sempre reseta para página 1 quando pesquisa muda
  useEffect(() => {
    // Se pesquisa foi limpa, desativar loading imediatamente
    if (!searchTerm.trim()) {
      setIsSearching(false);
      return;
    }

    // Ativar loading imediatamente quando há mudança na pesquisa
    setIsSearching(true);

    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchPatients(1, searchTerm).finally(() => {
          setIsSearching(false);
        });
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Quando mudar de página, manter a pesquisa ativa
  useEffect(() => {
    fetchPatients(currentPage, searchTerm);
  }, [currentPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPatient) {
        await api.patch(`/api/patients/${editingPatient.id}`, formData);
        toast.success('Paciente atualizado com sucesso');
      } else {
        await api.post('/api/patients', formData);
        toast.success('Paciente cadastrado com sucesso');
      }
      
      setShowModal(false);
      setEditingPatient(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        cpf: '',
        insuranceCompany: '',
        insuranceNumber: '',
        birthDate: '',
        address: ''
      });
      fetchPatients(currentPage, searchTerm);
    } catch (error) {
      console.error('Error saving patient:', error);
      toast.error('Erro ao salvar paciente');
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      phone: patient.phone,
      email: patient.email || '',
      cpf: patient.cpf || '',
      insuranceCompany: patient.insuranceCompany || '',
      insuranceNumber: patient.insuranceNumber || '',
      birthDate: patient.birthDate || '',
      address: patient.address || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (patientId: string) => {
    if (confirm('Tem certeza que deseja excluir este paciente?')) {
      try {
        await api.delete(`/api/patients/${patientId}`);
        toast.success('Paciente excluído com sucesso');
        fetchPatients(currentPage, searchTerm);
      } catch (error) {
        console.error('Error deleting patient:', error);
        toast.error('Erro ao excluir paciente');
      }
    }
  };

  // Aplicar filtros localmente
  const filteredPatients = patients.filter(patient => {
    // Filtro por convênio
    if (filters.insuranceCompany && patient.insuranceCompany !== filters.insuranceCompany) {
      return false;
    }
    
    // Filtro por ter email
    if (filters.hasEmail === 'yes' && !patient.email) {
      return false;
    }
    if (filters.hasEmail === 'no' && patient.email) {
      return false;
    }
    
    // Filtro por ter data de nascimento
    if (filters.hasBirthDate === 'yes' && !patient.birthDate) {
      return false;
    }
    if (filters.hasBirthDate === 'no' && patient.birthDate) {
      return false;
    }
    
    // Filtro por número mínimo de interações
    if (filters.minInteractions && patient.interactionsCount < parseInt(filters.minInteractions)) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Ordenação
    switch (filters.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      case 'createdAt':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'interactionsCount':
        return b.interactionsCount - a.interactionsCount;
      default:
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    }
  });
  
  const activeFiltersCount = [
    filters.insuranceCompany,
    filters.hasEmail,
    filters.hasBirthDate,
    filters.minInteractions
  ].filter(Boolean).length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pacientes</h1>
            <p className="text-gray-600 mt-2">Gerencie os pacientes da clínica</p>
          </div>
          <button
            onClick={() => {
              setEditingPatient(null);
              setFormData({
                name: '',
                phone: '',
                email: '',
                cpf: '',
                insuranceCompany: '',
                insuranceNumber: '',
                birthDate: '',
                address: ''
              });
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Paciente</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar pacientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button 
            onClick={() => setShowFilterModal(true)}
            className={`flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 relative ${
              activeFiltersCount > 0 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filtrar</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Upload className="h-4 w-4" />
            <span>Importar</span>
          </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading || isSearching ? (
          <PatientTableSkeleton rows={15} />
        ) : filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              {searchTerm 
                ? `Nenhum paciente encontrado para "${searchTerm}"`
                : 'Nenhum paciente cadastrado'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nascimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Convênio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interações
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Interação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="bg-gray-200 p-2 rounded-full mr-3">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                          <div className="text-sm text-gray-500">{patient.cpf}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPhone(patient.phone)}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.birthDate ? formatDate(patient.birthDate) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.insuranceCompany || '-'}
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {patient.interactionsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {patient.lastInteractionAt ? formatDate(patient.lastInteractionAt) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedPatientForHistory(patient);
                            setShowHistoryModal(true);
                          }}
                          className="text-purple-600 hover:text-purple-900"
                          title="Ver histórico"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(patient)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(patient.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && !isSearching && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {((currentPage - 1) * 15) + 1} a {Math.min(currentPage * 15, totalPatients)} de {totalPatients} paciente{totalPatients !== 1 ? 's' : ''}
              {searchTerm && (
                <span className="text-gray-500 ml-2">
                  (filtrado por: "{searchTerm}")
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 border rounded-md text-sm font-medium ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPatient ? 'Editar Paciente' : 'Novo Paciente'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CPF</label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Convênio</label>
                  <input
                    type="text"
                    value={formData.insuranceCompany}
                    onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número do Convênio</label>
                  <input
                    type="text"
                    value={formData.insuranceNumber}
                    onChange={(e) => setFormData({ ...formData, insuranceNumber: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.birthDate ? new Date(formData.birthDate).toISOString().slice(0,10) : ''}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingPatient ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Filtros Avançados</h3>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Ordenação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordenar por
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="name">Nome (A-Z)</option>
                  <option value="createdAt">Mais Recentes</option>
                  <option value="interactionsCount">Mais Interações</option>
                </select>
              </div>

              {/* Filtro por Convênio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Convênio
                </label>
                <select
                  value={filters.insuranceCompany}
                  onChange={(e) => setFilters({ ...filters, insuranceCompany: e.target.value })}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos os convênios</option>
                  <option value="Particular">Particular</option>
                  {availableInsurances.filter(ins => ins !== 'Particular').map(insurance => (
                    <option key={insurance} value={insurance}>{insurance}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Possui Email?
                </label>
                <select
                  value={filters.hasEmail}
                  onChange={(e) => setFilters({ ...filters, hasEmail: e.target.value })}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="yes">Sim, tem email</option>
                  <option value="no">Não tem email</option>
                </select>
              </div>

              {/* Filtro por Data de Nascimento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Possui Data de Nascimento?
                </label>
                <select
                  value={filters.hasBirthDate}
                  onChange={(e) => setFilters({ ...filters, hasBirthDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="yes">Sim, tem data</option>
                  <option value="no">Não tem data</option>
                </select>
              </div>

              {/* Filtro por Número Mínimo de Interações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número Mínimo de Interações
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Ex: 5"
                  value={filters.minInteractions}
                  onChange={(e) => setFilters({ ...filters, minInteractions: e.target.value })}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Resumo dos filtros ativos */}
              {activeFiltersCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800 font-medium mb-2">
                    {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}:
                  </p>
                  <div className="space-y-1">
                    {filters.insuranceCompany && (
                      <p className="text-xs text-blue-700">• Convênio: {filters.insuranceCompany}</p>
                    )}
                    {filters.hasEmail && (
                      <p className="text-xs text-blue-700">• Email: {filters.hasEmail === 'yes' ? 'Com email' : 'Sem email'}</p>
                    )}
                    {filters.hasBirthDate && (
                      <p className="text-xs text-blue-700">• Data de Nascimento: {filters.hasBirthDate === 'yes' ? 'Com data' : 'Sem data'}</p>
                    )}
                    {filters.minInteractions && (
                      <p className="text-xs text-blue-700">• Mínimo de {filters.minInteractions} interações</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setFilters({
                    insuranceCompany: '',
                    hasEmail: '',
                    hasBirthDate: '',
                    minInteractions: '',
                    sortBy: 'name'
                  });
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Limpar Filtros
              </button>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Fechar
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal - Lazy Loaded */}
      {showHistoryModal && selectedPatientForHistory && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Carregando histórico...</p>
            </div>
          </div>
        }>
          <ConversationHistoryModal
            patientId={selectedPatientForHistory.id}
            patientPhone={selectedPatientForHistory.phone}
            patientName={selectedPatientForHistory.name}
            onClose={() => {
              setShowHistoryModal(false);
              setSelectedPatientForHistory(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export { Patients };
