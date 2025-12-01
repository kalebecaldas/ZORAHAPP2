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
  Phone
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
      setUsers(response.data?.users || response.data || []);
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
    </div>
  );
};

export { Users };
