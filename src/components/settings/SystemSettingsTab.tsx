import React, { useState, useEffect } from 'react';
import { Clock, MessageSquare, Save, AlertCircle } from 'lucide-react';
import { api } from '../../lib/utils';
import { toast } from 'sonner';

const SystemSettingsTab: React.FC = () => {
    const [settings, setSettings] = useState({
        inactivityTimeoutMinutes: 20,
        closingMessage: '',
        autoAssignEnabled: true,
        maxConversationsPerAgent: 5
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/settings/system');
            setSettings(res.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Erro ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Validações
        if (settings.inactivityTimeoutMinutes < 1 || settings.inactivityTimeoutMinutes > 60) {
            toast.error('Timeout deve estar entre 1 e 60 minutos');
            return;
        }

        if (!settings.closingMessage.trim()) {
            toast.error('Mensagem de encerramento não pode estar vazia');
            return;
        }

        setSaving(true);
        try {
            await api.put('/api/settings/system', settings);
            toast.success('✅ Configurações salvas com sucesso!');
        } catch (error: any) {
            console.error('Error saving settings:', error);
            toast.error(error.response?.data?.error || 'Erro ao salvar configurações');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="spinner"></div>
                <span className="ml-3 text-gray-600">Carregando configurações...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Timeout de Inatividade */}
            <div className="card">
                <div className="card-header">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Timeout de Inatividade</h3>
                    </div>
                </div>
                <div className="card-body">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tempo limite sem resposta do agente (minutos)
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={settings.inactivityTimeoutMinutes}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        inactivityTimeoutMinutes: parseInt(e.target.value) || 1
                                    })}
                                    className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-600">minutos</span>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex gap-3">
                                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium mb-1">Como funciona:</p>
                                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                                        <li>Após este tempo sem resposta, a conversa retorna automaticamente para a fila PRINCIPAL</li>
                                        <li>Uma mensagem do sistema é criada informando o timeout</li>
                                        <li>O agente recebe uma notificação em tempo real</li>
                                        <li>O sistema verifica conversas inativas a cada 1 minuto</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mensagem de Encerramento */}
            <div className="card">
                <div className="card-header">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Mensagem de Encerramento</h3>
                    </div>
                </div>
                <div className="card-body">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mensagem enviada ao paciente quando a conversa é encerrada
                            </label>
                            <textarea
                                value={settings.closingMessage}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    closingMessage: e.target.value
                                })}
                                rows={4}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 font-sans"
                                placeholder="Obrigado pelo contato! Estamos à disposição. 😊"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                {settings.closingMessage.length} caracteres
                            </p>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex gap-3">
                                <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-green-800">
                                    <p className="font-medium mb-1">Quando é enviada:</p>
                                    <ul className="list-disc list-inside space-y-1 text-green-700">
                                        <li>Automaticamente quando o atendente encerra a conversa</li>
                                        <li>Enviada via WhatsApp para o paciente</li>
                                        <li>Uma mensagem do sistema também é criada no histórico</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Outras Configurações */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900">Outras Configurações</h3>
                </div>
                <div className="card-body">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Atribuição automática de conversas
                                </label>
                                <p className="text-xs text-gray-500 mt-1">
                                    Distribuir conversas automaticamente entre agentes disponíveis
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.autoAssignEnabled}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        autoAssignEnabled: e.target.checked
                                    })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Máximo de conversas por agente
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={settings.maxConversationsPerAgent}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    maxConversationsPerAgent: parseInt(e.target.value) || 1
                                })}
                                className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Limite de conversas simultâneas que um agente pode ter
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end gap-3">
                <button
                    onClick={fetchSettings}
                    disabled={saving}
                    className="btn btn-secondary"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Save className="h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
            </div>
        </div>
    );
};

export default SystemSettingsTab;
