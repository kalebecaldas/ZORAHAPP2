import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/ui/DesignSystem';
import ManagerDashboard from '../components/dashboards/ManagerDashboard';
import AgentDashboard from '../components/dashboards/AgentDashboard';

const DashboardIntelligent: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pequeno delay para carregar o usuário
    if (user) {
      setLoading(false);
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando dashboard..." />
      </div>
    );
  }

  // MASTER, ADMIN, SUPERVISOR → Dashboard gerencial
  if (['MASTER', 'ADMIN', 'SUPERVISOR'].includes(user.role)) {
    return <ManagerDashboard user={user} />;
  }

  // ATENDENTE → Dashboard pessoal
  return <AgentDashboard user={user} />;
};

export default DashboardIntelligent;
