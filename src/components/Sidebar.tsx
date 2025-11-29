import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  UserCog,
  UserPlus,
  BarChart3,
  Settings,
  Workflow,
  LogOut,
  Bot,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/utils';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  // Verificar se é a primeira vez acessando conversas nesta sessão
  const getInitialCollapsedState = () => {
    const hasVisitedConversations = sessionStorage.getItem('hasVisitedConversations');
    const isConversationsPage = location.pathname.startsWith('/conversations');
    
    // Se é a primeira vez acessando conversas OU já está na página de conversas, recolher
    if (isConversationsPage && !hasVisitedConversations) {
      sessionStorage.setItem('hasVisitedConversations', 'true');
      return true;
    }
    
    // Se já visitou antes, usar preferência salva ou padrão expandido
    const savedState = sessionStorage.getItem('sidebarCollapsed');
    return savedState === 'true';
  };

  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsedState);

  // Salvar estado do menu quando mudar
  useEffect(() => {
    sessionStorage.setItem('sidebarCollapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Buscar número de conversas aguardando
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await api.get('/api/conversations');
        const conversations = response.data.conversations || [];
        const pending = conversations.filter((c: any) => c.status === 'PRINCIPAL' && !c.assignedToId);
        setPendingCount(pending.length);
      } catch (error) {
        console.error('Erro ao buscar conversas aguardando:', error);
      }
    };

    fetchPendingCount();
    // Atualizar a cada 10 segundos
    const interval = setInterval(fetchPendingCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/conversations', icon: MessageSquare, label: 'Conversas' },
    { path: '/patients', icon: Users, label: 'Pacientes' },
    { path: '/workflows', icon: Workflow, label: 'Workflows' },
    { path: '/stats', icon: BarChart3, label: 'Estatísticas' },
    ...(user && (String(user.role) === 'MASTER' || String(user.role) === 'ADMIN') ? [{ path: '/users', icon: UserCog, label: 'Usuários' }] : []),
    { path: '/settings', icon: Settings, label: 'Configurações' },
    { path: '/test', icon: Bot, label: 'Teste' },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <>
      {/* Glassmorphism Styles */}
      <style>{`
        .sidebar-glass {
          /* Liquid Glass Effect - Gradiente Azul/Roxo */
          background: linear-gradient(
            135deg,
            rgba(59, 130, 246, 0.15) 0%,
            rgba(99, 102, 241, 0.1) 50%,
            rgba(139, 92, 246, 0.05) 100%
          );
          backdrop-filter: blur(30px) saturate(200%);
          -webkit-backdrop-filter: blur(30px) saturate(200%);
          
          /* Liquid Borders with Shimmer */
          border-top: 1px solid rgba(59, 130, 246, 0.3);
          border-left: 1px solid rgba(99, 102, 241, 0.25);
          border-right: 1px solid rgba(139, 92, 246, 0.15);
          border-bottom: 1px solid rgba(139, 92, 246, 0.15);
          
          /* Liquid Glow */
          box-shadow: 
            0 8px 32px rgba(59, 130, 246, 0.15),
            inset 0 0 30px rgba(99, 102, 241, 0.08),
            inset -2px -2px 10px rgba(139, 92, 246, 0.1);
          
          /* Z-index para ficar acima do conteúdo */
          position: relative;
          z-index: 50;
        }
        
        /* Separator Line Enhancement */
        .glass-separator {
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
        }

        .menu-item-glass {
          position: relative;
          overflow: hidden;
        }
        .menu-item-glass::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .menu-item-glass:hover::before {
          opacity: 1;
        }
        .menu-item-active {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(99, 102, 241, 0.2) 100%);
          border-left: 3px solid #3b82f6;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
        }
        .menu-item-active::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.1), transparent);
          pointer-events: none;
        }
        .logo-glow {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.6),
                      0 0 40px rgba(59, 130, 246, 0.4),
                      0 0 60px rgba(59, 130, 246, 0.2);
        }
      `}</style>

      <div
        className={`sidebar-glass h-screen flex flex-col transition-all duration-300 ease-in-out relative ${isCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-1.5 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {/* Header/Logo */}
        <div className={`p-6 glass-separator ${isCollapsed ? 'px-3' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl logo-glow shadow-lg border border-white/20 flex-shrink-0">
              <img src={branding.logoUrl} alt={`${branding.systemName} Logo`} className="h-6 w-6" onError={(e) => { (e.target as HTMLImageElement).src = '/favicon.svg'; }} />
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <h1 className="text-xl font-bold text-gray-400 whitespace-nowrap">{branding.systemName}</h1>
              <p className="text-xs text-gray-500 whitespace-nowrap">WhatsApp + IA</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto custom-scrollbar">
          <ul className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const isConversationsItem = item.path === '/conversations';
              const showBadge = isConversationsItem && pendingCount > 0;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`menu-item-glass flex items-center px-3 py-3 rounded-xl transition-all duration-300 group relative ${active
                      ? 'menu-item-active text-blue-500'
                      : 'text-gray-600 hover:text-gray-500 hover:bg-white/5'
                      } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
                    title={isCollapsed ? (showBadge ? `${item.label} (${pendingCount} aguardando)` : item.label) : ''}
                  >
                    <div className="relative">
                      <Icon className={`h-5 w-5 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'
                        }`} />
                      {/* Badge no ícone apenas quando recolhido */}
                      {showBadge && isCollapsed && (
                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="font-medium truncate">{item.label}</span>
                        {/* Badge à direita apenas quando expandido */}
                        {showBadge && (
                          <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                            {pendingCount > 99 ? '99+' : pendingCount}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-gray-300 text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity duration-200 z-50">
                        {item.label}
                        {showBadge && ` (${pendingCount} aguardando)`}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className={`p-3 glass-separator border-t-0 ${isCollapsed ? '' : 'px-4'}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center space-x-3 mb-3 px-3 py-2 rounded-lg bg-white/5">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-full">
                  <UserPlus className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-400 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
                </div>
              </div>

              <button
                onClick={logout}
                className="flex items-center space-x-3 w-full px-3 py-2.5 text-gray-500 hover:text-gray-400 hover:bg-white/5 rounded-xl transition-all duration-300 group"
              >
                <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Sair</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-full">
                <UserPlus className="h-4 w-4 text-white" />
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-gray-400 hover:bg-white/5 rounded-xl transition-all duration-300 group"
                title="Sair"
              >
                <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
