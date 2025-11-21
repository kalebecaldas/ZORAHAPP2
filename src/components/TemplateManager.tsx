import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';
import { Template, TemplateCategory, TEMPLATE_CATEGORIES } from '../types/templates';
import { TemplateService } from '../services/templateService';
import { TemplateEditor } from './TemplateEditor';
import { toast } from 'sonner';
import { api } from '../lib/utils';

export const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const allTemplates = await TemplateService.getAllTemplates();
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.key.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleSave = async (template: Template) => {
    try {
      if (template.id) {
        await TemplateService.updateTemplate(template.id, template);
        toast.success('Template atualizado');
      } else {
        await TemplateService.createTemplate(template);
        toast.success('Template criado');
      }
      await loadTemplates();
      setEditingTemplate(null);
      setIsCreating(false);
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar template');
    }
  };

  const handleDelete = async (template: Template) => {
    if (!confirm(`Tem certeza que deseja deletar o template "${template.title}"?`)) {
      return;
    }

    try {
      await TemplateService.deleteTemplate(template.id);
      toast.success('Template deletado');
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erro ao deletar template');
    }
  };

  const getCategoryCount = (category: TemplateCategory): number => {
    return templates.filter(t => t.category === category).length;
  };

  const getTotalCount = (): number => {
    return templates.length;
  };

  const getActiveCount = (): number => {
    return templates.filter(t => t.isActive).length;
  };

  if (editingTemplate || isCreating) {
    return (
      <TemplateEditor
        template={editingTemplate}
        onSave={handleSave}
        onCancel={() => {
          setEditingTemplate(null);
          setIsCreating(false);
        }}
      />
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar de Categorias */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <div className="mb-4">
          <button
            onClick={() => setIsCreating(true)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Template</span>
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar templates..."
              className="w-full border border-gray-300 rounded-md px-3 py-1 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>Todos</span>
              <span className="text-xs text-gray-500">{getTotalCount()}</span>
            </div>
          </button>

          {(Object.keys(TEMPLATE_CATEGORIES) as TemplateCategory[]).map(category => {
            const catInfo = TEMPLATE_CATEGORIES[category];
            const count = getCategoryCount(category);
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>{catInfo.icon}</span>
                    <span>{catInfo.label}</span>
                  </div>
                  <span className="text-xs text-gray-500">{count}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>Total:</span>
              <span className="font-medium">{getTotalCount()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Ativos:</span>
              <span className="font-medium text-green-600">{getActiveCount()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Inativos:</span>
              <span className="font-medium text-gray-400">{getTotalCount() - getActiveCount()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Templates */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchQuery ? 'Nenhum template encontrado' : 'Nenhum template nesta categoria'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{template.title}</h4>
                      {template.isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-1">
                      <code className="bg-gray-100 px-1 rounded">{template.key}</code>
                    </p>
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 line-clamp-3">{template.content}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {TEMPLATE_CATEGORIES[template.category].icon} {TEMPLATE_CATEGORIES[template.category].label}
                    </span>
                    {template.variables && template.variables.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {template.variables.length} variável{template.variables.length !== 1 ? 'eis' : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Deletar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

