import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Zap, Save } from 'lucide-react';
import { api } from '../lib/utils';
import { toast } from 'sonner';

interface QuickReply {
    id: string;
    shortcut: string;
    text: string;
    isGlobal: boolean;
}

interface QuickRepliesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (text: string) => void;
}

export default function QuickRepliesModal({ isOpen, onClose, onSelect }: QuickRepliesModalProps) {
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newShortcut, setNewShortcut] = useState('');
    const [newText, setNewText] = useState('');
    const [showNewForm, setShowNewForm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchQuickReplies();
        }
    }, [isOpen]);

    const fetchQuickReplies = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/quick-replies');
            setQuickReplies(response.data);
        } catch (error) {
            console.error('Erro ao buscar atalhos:', error);
            toast.error('Erro ao carregar atalhos');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newShortcut.trim() || !newText.trim()) {
            toast.error('Preencha todos os campos');
            return;
        }

        try {
            await api.post('/api/quick-replies', {
                shortcut: newShortcut.trim(), // ✅ Manter exatamente como usuário digitou
                text: newText
            });

            toast.success('Atalho criado com sucesso!');
            setNewShortcut('');
            setNewText('');
            setShowNewForm(false);
            fetchQuickReplies();
        } catch (error: any) {
            console.error('Erro ao criar atalho:', error);
            toast.error(error.response?.data?.error || 'Erro ao criar atalho');
        }
    };

    const handleUpdate = async (id: string, text: string) => {
        try {
            await api.put(`/api/quick-replies/${id}`, { text });
            toast.success('Atalho atualizado!');
            setEditingId(null);
            fetchQuickReplies();
        } catch (error) {
            console.error('Erro ao atualizar atalho:', error);
            toast.error('Erro ao atualizar atalho');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja deletar este atalho?')) return;

        try {
            await api.delete(`/api/quick-replies/${id}`);
            toast.success('Atalho deletado!');
            fetchQuickReplies();
        } catch (error) {
            console.error('Erro ao deletar atalho:', error);
            toast.error('Erro ao deletar atalho');
        }
    };

    const handleSelect = (text: string) => {
        if (onSelect) {
            onSelect(text);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Atalhos Rápidos</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* New Quick Reply Form */}
                    {showNewForm ? (
                        <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                            <h3 className="text-sm font-medium text-gray-900 mb-3">Novo Atalho</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Atalho (ex: bomdia, horario, preco)
                                    </label>
                                    <input
                                        type="text"
                                        value={newShortcut}
                                        onChange={(e) => setNewShortcut(e.target.value)}
                                        placeholder="bomdia"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Texto
                                    </label>
                                    <textarea
                                        value={newText}
                                        onChange={(e) => setNewText(e.target.value)}
                                        placeholder="Olá! Meu nome é..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCreate}
                                        className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                    >
                                        <Save className="w-4 h-4" />
                                        Salvar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowNewForm(false);
                                            setNewShortcut('');
                                            setNewText('');
                                        }}
                                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowNewForm(true)}
                            className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-600 hover:text-blue-600"
                        >
                            <Plus className="w-4 h-4" />
                            Criar Novo Atalho
                        </button>
                    )}

                    {/* Quick Replies List */}
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Carregando...</div>
                    ) : quickReplies.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Nenhum atalho criado ainda
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {quickReplies.map((qr) => (
                                <div
                                    key={qr.id}
                                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <code className="px-2 py-1 bg-gray-100 text-blue-600 rounded text-xs font-mono">
                                                /{qr.shortcut}
                                            </code>
                                            {qr.isGlobal && (
                                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                                    Global
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {onSelect && (
                                                <button
                                                    onClick={() => handleSelect(qr.text)}
                                                    className="p-1 hover:bg-blue-100 rounded text-blue-600 text-xs"
                                                    title="Usar este atalho"
                                                >
                                                    Usar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(qr.id)}
                                                className="p-1 hover:bg-red-100 rounded text-red-600"
                                                title="Deletar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    {editingId === qr.id ? (
                                        <div className="space-y-2">
                                            <textarea
                                                defaultValue={qr.text}
                                                onBlur={(e) => handleUpdate(qr.id, e.target.value)}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                rows={2}
                                            />
                                        </div>
                                    ) : (
                                        <p
                                            onClick={() => setEditingId(qr.id)}
                                            className="text-sm text-gray-700 cursor-pointer hover:text-gray-900"
                                        >
                                            {qr.text}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50">
                    <p className="text-xs text-gray-600">
                        💡 <strong>Dica:</strong> Digite <code className="px-1 bg-gray-200 rounded">/</code> no campo de mensagem para usar um atalho
                    </p>
                </div>
            </div>
        </div>
    );
}
