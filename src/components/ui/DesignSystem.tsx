import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: number;
    color?: 'primary' | 'success' | 'warning' | 'error' | 'purple';
    loading?: boolean;
    subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon: Icon,
    trend,
    color = 'primary',
    loading = false,
    subtitle
}) => {
    const colorClasses = {
        primary: 'bg-blue-500',
        success: 'bg-green-500',
        warning: 'bg-orange-500',
        error: 'bg-red-500',
        purple: 'bg-purple-500'
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-body">
                    <div className="skeleton h-4 w-24 mb-2"></div>
                    <div className="skeleton h-8 w-16 mb-2"></div>
                    <div className="skeleton h-3 w-32"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="card fade-in">
            <div className="card-body">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                        {trend !== undefined && (
                            <p className={`text-sm mt-1 ${trend >= 0 ? 'trend-up' : 'trend-down'}`}>
                                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs período anterior
                            </p>
                        )}
                        {subtitle && (
                            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                        )}
                    </div>
                    <div className={`${colorClasses[color]} p-3 rounded-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface MetricBadgeProps {
    label: string;
    value: string | number;
    variant?: 'primary' | 'success' | 'warning' | 'error';
}

export const MetricBadge: React.FC<MetricBadgeProps> = ({
    label,
    value,
    variant = 'primary'
}) => {
    return (
        <div className="inline-flex items-center gap-2">
            <span className="text-sm text-gray-600">{label}:</span>
            <span className={`badge badge-${variant}`}>{value}</span>
        </div>
    );
};

interface TrendIndicatorProps {
    value: number;
    suffix?: string;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({ value, suffix = '%' }) => {
    const isPositive = value >= 0;
    const isNeutral = value === 0;

    return (
        <span className={isNeutral ? 'trend-neutral' : isPositive ? 'trend-up' : 'trend-down'}>
            {isPositive && '+'}
            {value}
            {suffix}
        </span>
    );
};

interface ChartContainerProps {
    title: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    loading?: boolean;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
    title,
    children,
    action,
    loading = false
}) => {
    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <div className="skeleton h-6 w-48"></div>
                </div>
                <div className="card-body">
                    <div className="skeleton h-64 w-full"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="card fade-in">
            <div className="card-header">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    {action}
                </div>
            </div>
            <div className="card-body">
                {children}
            </div>
        </div>
    );
};

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div className={`spinner ${sizeClasses[size]}`}></div>
            {text && <p className="text-sm text-gray-600">{text}</p>}
        </div>
    );
};

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    action
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
                <Icon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            {description && <p className="text-sm text-gray-600 mb-4 max-w-sm">{description}</p>}
            {action}
        </div>
    );
};
