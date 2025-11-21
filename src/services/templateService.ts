import { api } from '../lib/utils';
import type { Template, TemplateContext, TemplateCategory } from '../types/templates';

export class TemplateService {
  /**
   * Busca um template por sua chave
   */
  static async getTemplate(key: string): Promise<Template | null> {
    try {
      const response = await api.get(`/api/templates/key/${key}`);
      return response.data;
    } catch (error) {
      console.error(`Template ${key} not found:`, error);
      return null;
    }
  }

  /**
   * Busca templates por categoria
   */
  static async getTemplatesByCategory(category: TemplateCategory): Promise<Template[]> {
    try {
      const response = await api.get(`/api/templates/category/${category}`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching templates for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Busca todos os templates
   */
  static async getAllTemplates(): Promise<Template[]> {
    try {
      const response = await api.get('/api/templates');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching all templates:', error);
      return [];
    }
  }

  /**
   * Cria um novo template
   */
  static async createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
    const response = await api.post('/api/templates', template);
    return response.data;
  }

  /**
   * Atualiza um template existente
   */
  static async updateTemplate(id: string, template: Partial<Template>): Promise<Template> {
    const response = await api.put(`/api/templates/${id}`, template);
    return response.data;
  }

  /**
   * Deleta um template
   */
  static async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/api/templates/${id}`);
  }

  /**
   * Interpola variáveis em um template
   */
  static interpolate(template: string, context: TemplateContext): string {
    let result = template;
    
    // Substituir todas as variáveis ${variavel}
    const variableRegex = /\$\{([^}]+)\}/g;
    
    result = result.replace(variableRegex, (match, varName) => {
      const value = context[varName as keyof TemplateContext];
      
      if (value === undefined || value === null) {
        // Se a variável não existe, retornar vazio ou o nome da variável
        return '';
      }
      
      // Converter para string
      return String(value);
    });
    
    return result;
  }

  /**
   * Busca e interpola um template por chave
   */
  static async getInterpolatedTemplate(key: string, context: TemplateContext): Promise<string | null> {
    const template = await this.getTemplate(key);
    
    if (!template || !template.isActive) {
      return null;
    }
    
    return this.interpolate(template.content, context);
  }

  /**
   * Valida se um template tem todas as variáveis necessárias
   */
  static validateTemplate(template: string, context: TemplateContext): { valid: boolean; missing: string[] } {
    const variableRegex = /\$\{([^}]+)\}/g;
    const matches = template.matchAll(variableRegex);
    const variables = Array.from(matches, m => m[1]);
    const missing: string[] = [];
    
    for (const varName of variables) {
      if (context[varName as keyof TemplateContext] === undefined || 
          context[varName as keyof TemplateContext] === null) {
        missing.push(varName);
      }
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Extrai todas as variáveis de um template
   */
  static extractVariables(template: string): string[] {
    const variableRegex = /\$\{([^}]+)\}/g;
    const matches = template.matchAll(variableRegex);
    return Array.from(matches, m => m[1]);
  }
}

