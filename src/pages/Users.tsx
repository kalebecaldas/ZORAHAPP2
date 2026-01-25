import React, { useState, useEffect } from 'react';
import { 
  User, 
  Plus, 
  Edit, 
  Trash2, 
  Shield,
  UserPlus,
  Key,
  Mail,
  Phone,
  Settings as SettingsIcon
} from 'lucide-react';
import { api } from '../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'MASTER' | 'ADMIN' | 'SUPERVISOR' | 'ATENDENTE';
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  conversationsHandled: number;
  avgResponseTime: number;
  satisfactionRate: number;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'ATENDENTE' as 'MASTER' | 'ADMIN' | 'SUPERVISOR' | 'ATENDENTE',
    password: '',
    isActive: true
  });
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      const usersData = response.data?.users || response.data || [];
      // Ordenar usuários por ordem alfabética (nome)
      const sortedUsers = usersData.sort((a: User, b: User) => 
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      );
      setUsers(sortedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        const updateData: any = { name: formData.name, role: formData.role };
        if (formData.password) updateData.password = formData.password;
        await api.put(`/api/users/${editingUser.id}`, updateData);
        toast.success('Usuário atualizado com sucesso');
      } else {
        await api.post('/api/users', { name: formData.name, email: formData.email, password: formData.password, role: formData.role });
        toast.success('Usuário criado com sucesso');
      }
      
      setShowModal(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'ATENDENTE',
        password: '',
        isActive: true
      });
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Erro ao salvar usuário');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      password: '',
      isActive: user.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await api.delete(`/api/users/${userId}`);
        toast.success('Usuário excluído com sucesso');
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Erro ao excluir usuário');
      }
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await api.patch(`/api/users/${user.id}/toggle`);
      toast.success(`Usuário ${user.isActive ? 'desativado' : 'ativado'} com sucesso`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Erro ao alternar status do usuário');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getRoleColor = (role: string) => {
    return role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="flex-1 p-8 bg-gray-50">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
            <p className="text-gray-600 mt-2">Gerencie os usuários do sistema</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPermissionsModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
            >
              <Shield className="h-4 w-4" />
              <span>Configurar Hierarquia</span>
            </button>
            <button
              onClick={() => {
                setEditingUser(null);
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  role: 'ATENDENTE',
                  password: '',
                  isActive: true
                });
                setShowModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Usuário</span>
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Carregando usuários...</p>
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
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="bg-gray-200 p-2 rounded-full mr-3">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    {/* telefone não persistido no backend */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${getRoleColor(user.role)}`}>
                        {String(user.role) === 'MASTER' ? 'Master' : String(user.role) === 'ADMIN' ? 'Administrador' : String(user.role) === 'SUPERVISOR' ? 'Supervisor' : 'Atendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.createdAt ? formatDate(user.createdAt) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => (String(user.role) === 'MASTER' && String(currentUser?.role) !== 'MASTER') ? null : handleEdit(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => (String(user.role) === 'MASTER' && String(currentUser?.role) !== 'MASTER') ? null : handleDelete(user.id)}
                          className="text-red-600 hover:text-red-900"
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
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
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Função *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'MASTER' | 'ADMIN' | 'SUPERVISOR' | 'ATENDENTE' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ATENDENTE">Atendente</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="MASTER" disabled={String(currentUser?.role) !== 'MASTER'}>Master</option>
                  </select>
                </div>
                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Senha *</label>
                    <input
                      type="password"
                      required={!editingUser}
                      autoComplete={editingUser ? "new-password" : "new-password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                {/* status desativado pois não há campo no backend */}
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
                    {editingUser ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Hierarquia */}
      {showPermissionsModal && <PermissionsModal onClose={() => setShowPermissionsModal(false)} />}
    </div>
  );
};

// Componente Modal de Permissões
interface PermissionsModalProps {
  onClose: () => void;
}

const PermissionsModal: React.FC<PermissionsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'MASTER' | 'ADMIN' | 'SUPERVISOR' | 'ATENDENTE'>('MASTER');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({
    MASTER: { users: true, settings: true, workflows: true, patients: true, conversations: true, stats: true, aiConfig: true, test: true },
    ADMIN: { users: true, settings: true, workflows: true, patients: true, conversations: true, stats: true, aiConfig: true, test: true },
    SUPERVISOR: { users: false, settings: false, workflows: false, patients: true, conversations: true, stats: true, aiConfig: false, test: false },
    ATENDENTE: { users: false, settings: false, workflows: false, patients: false, conversations: true, stats: false, aiConfig: false, test: false }
  });

  // Mapeamento de funcionalidades do sistema
  const features = [
    { key: 'conversations', label: 'Conversas', description: 'Acessar e gerenciar conversas com pacientes' },
    { key: 'patients', label: 'Pacientes', description: 'Visualizar e gerenciar dados de pacientes' },
    { key: 'users', label: 'Usuários', description: 'Gerenciar usuários e hierarquia do sistema' },
    { key: 'settings', label: 'Configurações', description: 'Acessar configurações da clínica e procedimentos' },
    { key: 'workflows', label: 'Workflows', description: 'Gerenciar e editar fluxos de conversa automáticos' },
    { key: 'stats', label: 'Estatísticas', description: 'Visualizar relatórios e estatísticas do sistema' },
    { key: 'aiConfig', label: 'Configuração da IA', description: 'Configurar comportamento e respostas da IA' },
    { key: 'test', label: 'Teste do Bot', description: 'Testar o bot antes do deploy' }
  ];

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/api/permissions');
      setPermissions(response.data.permissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (role: string, feature: string) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [feature]: !prev[role]?.[feature]
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/permissions', permissions);
      toast.success('Permissões atualizadas com sucesso');
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Erro ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  const roles = [
    { key: 'MASTER', label: 'Master', color: 'purple' },
    { key: 'ADMIN', label: 'Administrador', color: 'red' },
    { key: 'SUPERVISOR', label: 'Supervisor', color: 'blue' },
    { key: 'ATENDENTE', label: 'Atendente', color: 'green' }
  ] as const;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-lg bg-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Configurar Hierarquia de Usuários</h3>
            <p className="text-gray-600 mt-1">Defina as permissões e funcionalidades para cada tipo de usuário</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-500">Carregando permissões...</p>
          </div>
        ) : (
          <>
            {/* Abas */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-4">
                {roles.map((role) => (
                  <button
                    key={role.key}
                    onClick={() => setActiveTab(role.key)}
                    className={`px-4 py-2 font-medium text-sm transition-colors relative ${
                      activeTab === role.key
                        ? `text-${role.color}-600 border-b-2 border-${role.color}-600`
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {role.label}
                    {activeTab === role.key && (
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${role.color}-600`}></div>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Conteúdo das Abas */}
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      {roles.find(r => r.key === activeTab)?.label}
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {activeTab === 'MASTER' && 'Acesso total ao sistema, não pode ser restringido.'}
                      {activeTab === 'ADMIN' && 'Gerencia usuários e configurações do sistema.'}
                      {activeTab === 'SUPERVISOR' && 'Supervisiona pacientes e conversas, gera relatórios.'}
                      {activeTab === 'ATENDENTE' && 'Atende conversas e interage com pacientes.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                {features.map((feature) => {
                  const isEnabled = permissions[activeTab]?.[feature.key] || false;
                  const isMaster = activeTab === 'MASTER';
                  
                  return (
                    <div key={feature.key} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h5 className="text-sm font-medium text-gray-900">{feature.label}</h5>
                            {isMaster && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                Sempre ativo
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => !isMaster && handleTogglePermission(activeTab, feature.key)}
                            disabled={isMaster}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                            isEnabled ? 'peer-checked:bg-blue-600' : ''
                          } ${isMaster ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}></div>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    <span>Salvar Permissões</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export { Users };
