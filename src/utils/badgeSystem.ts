export interface AgentStats {
  totalConversations: number;
  closedConversations: number;
  withAppointment: number;
  conversionRate: number;
  avgResponseTimeMinutes: number;
  closeRate: number;
  rank?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  condition: (stats: AgentStats) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: 'speed_demon',
    name: 'Resposta Rápida',
    description: 'Tempo médio de resposta abaixo de 3 minutos',
    icon: '⚡',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    condition: (stats) => stats.avgResponseTimeMinutes < 3
  },
  {
    id: 'closer',
    name: 'Fechador',
    description: 'Taxa de fechamento acima de 80%',
    icon: '🎯',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    condition: (stats) => stats.closeRate > 80
  },
  {
    id: 'top_performer',
    name: 'Top Performer',
    description: 'Melhor desempenho da equipe',
    icon: '🏆',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-400',
    condition: (stats) => stats.rank === 1
  },
  {
    id: 'consistent',
    name: 'Consistente',
    description: 'Taxa de conversão acima de 70%',
    icon: '📈',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    condition: (stats) => stats.conversionRate > 70
  },
  {
    id: 'productive',
    name: 'Produtivo',
    description: 'Mais de 15 conversas no período',
    icon: '💪',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    condition: (stats) => stats.totalConversations > 15
  },
  {
    id: 'converter',
    name: 'Conversor',
    description: 'Mais de 10 agendamentos realizados',
    icon: '🎁',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-300',
    condition: (stats) => stats.withAppointment > 10
  }
];

export function calculateEarnedBadges(stats: AgentStats): Badge[] {
  return BADGES.filter(badge => badge.condition(stats));
}

export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(badge => badge.id === id);
}

export interface PerformanceLevel {
  level: string;
  label: string;
  minScore: number;
  color: string;
  bgColor: string;
  icon: string;
}

export const PERFORMANCE_LEVELS: PerformanceLevel[] = [
  {
    level: 'excellent',
    label: 'Excelente',
    minScore: 90,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: '🌟'
  },
  {
    level: 'great',
    label: 'Ótimo',
    minScore: 75,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: '⭐'
  },
  {
    level: 'good',
    label: 'Bom',
    minScore: 60,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: '👍'
  },
  {
    level: 'needsImprovement',
    label: 'Pode Melhorar',
    minScore: 0,
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: '📊'
  }
];

/**
 * Calcula o nível de performance baseado nas métricas
 * Score baseado em: taxa de conversão (40%), tempo de resposta (30%), taxa de fechamento (30%)
 */
export function calculatePerformanceLevel(stats: AgentStats): PerformanceLevel {
  // Normalizar métricas
  const conversionScore = Math.min(stats.conversionRate, 100);
  
  // Tempo de resposta: melhor = mais pontos (inverter escala)
  // Menos de 3min = 100, mais de 10min = 0
  const responseScore = Math.max(0, Math.min(100, 100 - (stats.avgResponseTimeMinutes - 3) * 14));
  
  const closeScore = Math.min(stats.closeRate, 100);
  
  // Média ponderada
  const totalScore = (conversionScore * 0.4) + (responseScore * 0.3) + (closeScore * 0.3);
  
  // Encontrar nível apropriado
  for (const level of PERFORMANCE_LEVELS) {
    if (totalScore >= level.minScore) {
      return level;
    }
  }
  
  return PERFORMANCE_LEVELS[PERFORMANCE_LEVELS.length - 1];
}

/**
 * Gera mensagens motivacionais baseadas no desempenho
 */
export function getMotivationalMessage(stats: AgentStats, previousStats?: AgentStats): string {
  const level = calculatePerformanceLevel(stats);
  const badges = calculateEarnedBadges(stats);
  
  if (level.level === 'excellent') {
    return `Excelente trabalho! Você conquistou ${badges.length} badge${badges.length !== 1 ? 's' : ''} 🎉`;
  }
  
  if (previousStats) {
    const improvement = stats.conversionRate - previousStats.conversionRate;
    if (improvement > 5) {
      return `Ótimo progresso! Sua taxa de conversão subiu ${improvement.toFixed(1)}% 📈`;
    }
    
    const timeImprovement = previousStats.avgResponseTimeMinutes - stats.avgResponseTimeMinutes;
    if (timeImprovement > 1) {
      return `Muito bem! Seu tempo de resposta melhorou ${timeImprovement.toFixed(1)} minutos ⚡`;
    }
  }
  
  if (stats.conversionRate > 50) {
    return 'Continue assim! Você está fazendo um ótimo trabalho 💪';
  }
  
  if (stats.avgResponseTimeMinutes < 5) {
    return 'Sua velocidade de resposta está excelente! ⚡';
  }
  
  return 'Continue se esforçando! Cada conversa é uma oportunidade 🎯';
}
