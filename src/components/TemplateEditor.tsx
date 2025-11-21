import React, { useState, useEffect } from 'react';
import { Save, X, Eye, Copy, Check } from 'lucide-react';
import { Template, TemplateContext, AVAILABLE_VARIABLES } from '../types/templates';
import { TemplateService } from '../services/templateService';
import { toast } from 'sonner';

interface TemplateEditorProps {
  template: Template | null;
  onSave: (template: Template) => void;
  onCancel: () => void;
  previewContext?: TemplateContext;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
  previewContext = {}
}) => {
  const [formData, setFormData] = useState<Partial<Template>>({
    key: '',
    category: 'welcome',
    title: '',
    description: '',
    content: '',
    variables: [],
    example: '',
    isActive: true
  });

  const [preview, setPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setFormData({
        key: template.key,
        category: template.category,
        title: template.title,
        description: template.description || '',
        content: template.content,
        variables: template.variables || [],
        example: template.example || '',
        isActive: template.isActive
      });
    } else {
      setFormData({
        key: '',
        category: 'welcome',
        title: '',
        description: '',
        content: '',
        variables: [],
        example: '',
        isActive: true
      });
    }
  }, [template]);

  useEffect(() => {
    if (formData.content && previewContext) {
      const interpolated = TemplateService.interpolate(formData.content, previewContext);
      setPreview(interpolated);
    } else {
      setPreview(formData.content || '');
    }
  }, [formData.content, previewContext]);

  const handleSave = async () => {
    if (!formData.key || !formData.title || !formData.content) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Extract variables from content
    const extractedVars = TemplateService.extractVariables(formData.content);
    const variables = extractedVars.map(varName => {
      // Find variable info from available variables
      const allVars = Object.values(AVAILABLE_VARIABLES).flat();
      const found = allVars.find(v => v.name === varName);
      return found || {
        name: varName,
        description: `Variável ${varName}`,
        example: `valor_${varName}`
      };
    });

    const templateData: Template = {
      id: template?.id || '',
      key: formData.key,
      category: formData.category as any,
      title: formData.title,
      description: formData.description,
      content: formData.content,
      variables,
      example: formData.example,
      isActive: formData.isActive ?? true
    };

    onSave(templateData);
  };

  const insertVariable = (varName: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.content || '';
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newContent = before + `\${${varName}}` + after;
      setFormData({ ...formData, content: newContent });
      
      // Focus back on textarea
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + varName.length + 3, start + varName.length + 3);
      }, 0);
    }
  };

  const getVariablesForCategory = (category: string): any[] => {
    const categoryMap: Record<string, string> = {
      welcome: 'system',
      units: 'units',
      procedures: 'procedures',
      insurance: 'insurance',
      scheduling: 'scheduling',
      validation: 'system',
      transfer: 'system'
    };
    
    const varCategory = categoryMap[category] || 'system';
    return AVAILABLE_VARIABLES[varCategory] || [];
  };

  const variables = getVariablesForCategory(formData.category || 'welcome');

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">
          {template ? 'Editar Template' : 'Novo Template'}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-2 border rounded-md text-sm flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>{showPreview ? 'Ocultar' : 'Mostrar'} Preview</span>
          </button>
          <button
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chave (Key) *
            </label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="ex: welcome_initial"
              disabled={!!template}
            />
            <p className="text-xs text-gray-500 mt-1">
              Identificador único do template (não pode ser alterado)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="welcome">Boas-vindas</option>
              <option value="units">Unidades</option>
              <option value="procedures">Procedimentos</option>
              <option value="insurance">Convênios</option>
              <option value="scheduling">Agendamento</option>
              <option value="validation">Validações</option>
              <option value="transfer">Transferência</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="ex: Mensagem de Boas-vindas"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={2}
              placeholder="Descrição do template..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Conteúdo *
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Variáveis disponíveis:</span>
                <select
                  value={selectedVariable || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      insertVariable(e.target.value);
                      setSelectedVariable(null);
                    }
                  }}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="">Selecione para inserir</option>
                  {variables.map(v => (
                    <option key={v.name} value={v.name}>
                      {v.name} - {v.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              id="template-content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
              rows={8}
              placeholder="Digite o conteúdo do template. Use ${variavel} para variáveis."
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {variables.slice(0, 5).map(v => (
                <button
                  key={v.name}
                  onClick={() => insertVariable(v.name)}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  title={v.description}
                >
                  ${v.name}
                </button>
              ))}
              {variables.length > 5 && (
                <span className="text-xs text-gray-500 px-2 py-1">
                  +{variables.length - 5} mais
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Ativo</span>
            </label>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          {showPreview && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="text-sm font-semibold mb-2 flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </h4>
              <div className="bg-white rounded p-3 border border-gray-200 min-h-[200px] whitespace-pre-wrap text-sm">
                {preview || 'Digite o conteúdo para ver o preview...'}
              </div>
            </div>
          )}

          {/* Variables Info */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Variáveis Detectadas</h4>
            {formData.content ? (
              <div className="space-y-1">
                {TemplateService.extractVariables(formData.content).map(varName => {
                  const varInfo = variables.find(v => v.name === varName);
                  return (
                    <div key={varName} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      <code className="text-blue-600">${varName}</code>
                      {varInfo && (
                        <span className="text-gray-600 ml-2">- {varInfo.description}</span>
                      )}
                    </div>
                  );
                })}
                {TemplateService.extractVariables(formData.content).length === 0 && (
                  <p className="text-xs text-gray-500">Nenhuma variável detectada</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Digite o conteúdo para detectar variáveis</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>Salvar</span>
        </button>
      </div>
    </div>
  );
};

