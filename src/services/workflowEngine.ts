import OpenAI from 'openai'
import { TemplateService } from './templateService.js'
import type { TemplateContext } from '../types/templates.js'
import { clinicLocations, clinicDataService } from '../../api/data/clinicData.js'

export interface WorkflowNode {
  id: string;
  type: 'START' | 'MESSAGE' | 'CONDITION' | 'ACTION' | 'GPT_RESPONSE' | 'DATA_COLLECTION' | 'TRANSFER_HUMAN' | 'DELAY' | 'END' | 'WEBHOOK' | 'API_CALL' | 'COLLECT_INFO';
  content: {
    text?: string;
    condition?: string;
    action?: string;
    options?: string[];
    systemPrompt?: string;
    field?: string;
    fields?: string[];
    prompt?: string;
    delay?: number;
    finalMessage?: string;
    url?: string;
    method?: string;
    headers?: any;
    body?: any;
    endpoint?: string;
    message?: string;
    welcomeMessage?: string;
    errorMessage?: string;
    ports?: Array<{
      id: string;
      label: string;
      type: 'input' | 'output';
      position: 'top' | 'bottom' | 'left' | 'right';
    }>;
  };
  position: { x: number; y: number };
  connections?: Array<string | { targetId: string; condition?: string; port?: string }>;
}

export interface WorkflowExecutionContext {
  phone: string;
  message: string;
  userData: Record<string, any>;
  conversationHistory: Array<{
    role: 'user' | 'bot';
    content: string;
    timestamp: Date;
  }>;
  currentNodeId: string;
  workflowId: string;
}

export interface NodeExecutionResult {
  nextNodeId?: string;
  response?: string;
  context?: Partial<WorkflowExecutionContext>;
  shouldStop?: boolean;
}

export class WorkflowEngine {
  private context: WorkflowExecutionContext;
  private nodes: Map<string, WorkflowNode>;
  private connections: Map<string, Array<{ targetId: string; condition?: string; port?: string }>>;

  constructor(nodes: WorkflowNode[], workflowId: string, phone: string, message: string, connections?: Array<any>) {
    // Normalize nodes to ensure legacy `data` property is mapped to `content`
    const normalizedNodes = nodes.map(node => {
      const mergedContent = {
        ...((node as any).content || {}),
        ...((node as any).data || {}),
      };

      const normalizedNode: WorkflowNode = {
        ...(node as WorkflowNode),
        content: mergedContent,
        position: node.position || { x: 0, y: 0 },
      };
      (normalizedNode as any).data = (node as any).data ?? mergedContent;
      return normalizedNode;
    });

    this.nodes = new Map(normalizedNodes.map(node => [node.id, node]));
    this.connections = new Map();

    console.log(`🔧 WorkflowEngine constructor - nodes: ${nodes.length}, connections: ${connections?.length || 0}`);

    // Build connection map from either node.connections or separate connections array
    if (connections && connections.length > 0) {
      // Handle dynamic workflow format with separate connections array
      console.log(`🔧 Processing ${connections.length} external connections`);
      connections.forEach(conn => {
        const sourceId = conn.source;
        if (!this.connections.has(sourceId)) {
          this.connections.set(sourceId, []);
        }
        this.connections.get(sourceId)!.push({
          targetId: conn.target,
          condition: (conn.condition || (conn.data && conn.data.condition)),
          port: (conn.sourcePort || (conn.data && conn.data.port) || 'main')
        });
      });
    } else {
      // Handle legacy format with node.connections
      console.log(`🔧 Processing node.connections`);
      nodes.forEach(node => {
        if (node.connections) {
          this.connections.set(node.id, node.connections.map(conn => {
            if (typeof conn === 'string') {
              return { targetId: conn, condition: undefined, port: 'main' };
            }
            return conn;
          }));
        }
      });
    }

    console.log(`🔧 Connections built:`, Array.from(this.connections.entries()));

    this.context = {
      phone,
      message,
      userData: {},
      conversationHistory: [{
        role: 'user',
        content: message,
        timestamp: new Date()
      }],
      currentNodeId: '', // Will be set after constructor
      workflowId
    };
  }

  async executeNextNode(): Promise<NodeExecutionResult> {
    console.log(`🔧 executeNextNode - currentNodeId: ${this.context.currentNodeId}`);

    const currentNode = this.nodes.get(this.context.currentNodeId);
    if (!currentNode) {
      console.log(`🔧 executeNextNode - no current node found, stopping`);
      return { shouldStop: true };
    }

    console.log(`🔧 executeNextNode - executing node: ${currentNode.id} (${currentNode.type})`);
    const result = await this.executeNode(currentNode);

    console.log(`🔧 executeNextNode - result:`, result);

    if (result.context) {
      this.context = { ...this.context, ...result.context };
    }

    // Handle different node types for flow control
    switch (currentNode.type) {
      case 'START':
      case 'MESSAGE': {
        // If this MESSAGE produced no output (duplicate prompt), auto-advance to next
        const hasResponse = !!(result.response && String(result.response).trim());
        if (!hasResponse && result.nextNodeId) {
          const nextNode = this.nodes.get(result.nextNodeId);
          if (nextNode) {
            const chained = await this.executeNode(nextNode);
            if (chained.context) this.context = { ...this.context, ...chained.context } as any;
            // Set current node to the node we just executed (e.g., collect_nome)
            this.context.currentNodeId = nextNode.id;
            // Allow advanceWorkflow to continue executing following nodes
            chained.shouldStop = false;
            return chained;
          }
        }

        // Se o nó MESSAGE tem nextNodeId e é um nó de unidade, continuar automaticamente para o próximo nó
        // Isso garante que após selecionar clínica, vá para o GPT classifier
        if (result.nextNodeId && (currentNode.id === 'unidade_vieiralves' || currentNode.id === 'unidade_sao_jose' || currentNode.id?.includes('unidade_'))) {
          console.log(`🔧 MESSAGE node de unidade (${currentNode.id}) - Continuando automaticamente para: ${result.nextNodeId}`);
          const nextNode = this.nodes.get(result.nextNodeId);
          if (nextNode) {
            // Executar o próximo nó imediatamente
            const chained = await this.executeNode(nextNode);
            if (chained.context) this.context = { ...this.context, ...chained.context } as any;
            // Se o próximo nó é GPT_RESPONSE, não deve parar - deve aguardar próxima mensagem do usuário
            if (nextNode.type === 'GPT_RESPONSE') {
              this.context.currentNodeId = nextNode.id;
              // GPT_RESPONSE deve parar para aguardar mensagem do usuário
              chained.shouldStop = true;
              console.log(`🔧 Continuou para GPT classifier (${nextNode.id}), aguardando próxima mensagem`);
            } else {
              this.context.currentNodeId = chained.nextNodeId || nextNode.id;
              chained.shouldStop = false;
            }
            return chained;
          }
        }

        // MESSAGE nodes should stop to wait for user input
        // BUT save the next node to resume from when user responds
        result.shouldStop = true;
        if (result.nextNodeId) {
          this.context.currentNodeId = result.nextNodeId;
          console.log(`🔧 MESSAGE node completed, saved next node for continuation: ${result.nextNodeId}`);
        }
        break;
      }
      case 'CONDITION':
        // CONDITION nodes should stop only if no matching condition was found
        // If a condition matched and we have a next node, continue execution
        if (!result.nextNodeId) {
          result.shouldStop = true;
        }
        // Update the current node ID for the next execution
        if (result.nextNodeId) {
          this.context.currentNodeId = result.nextNodeId;
        }
        break;
      case 'DATA_COLLECTION':
        // Se ainda está aguardando resposta (tem prompt para enviar), parar e manter no node atual
        if (result.response && result.response.trim().length > 0) {
          // Ainda aguardando resposta do usuário
          result.shouldStop = true;
          // NÃO alterar currentNodeId - manter no node de coleta atual
          // O nextNodeId será usado quando o usuário responder
          console.log(`🔧 DATA_COLLECTION - aguardando campo "${this.context.userData.collectingField}", mantendo currentNodeId: ${currentNode.id}`);
        } else {
          // Resposta já foi processada pelo executeDataCollectionNode
          // Avançar para o próximo node e executá-lo para pedir o próximo campo
          if (result.nextNodeId) {
            this.context.currentNodeId = result.nextNodeId;
            console.log(`🔧 DATA_COLLECTION - campo coletado, avançando para: ${result.nextNodeId}`);
            // Executar o próximo node imediatamente para pedir o próximo campo
            const nextNode = this.nodes.get(result.nextNodeId);
            if (nextNode && nextNode.type === 'DATA_COLLECTION') {
              const nextResult = await this.executeNode(nextNode);
              if (nextResult.context) this.context = { ...this.context, ...nextResult.context } as any;
              // O próximo node vai pedir o próximo campo e parar
              return { ...nextResult, shouldStop: true };
            }
            // Se não é DATA_COLLECTION, continuar normalmente
            result.shouldStop = false;
          } else {
            result.shouldStop = true;
          }
        }
        break;
      case 'GPT_RESPONSE':
        // GPT_RESPONSE nodes should continue if they have a next node
        // This allows the flow to continue after intent classification
        if (result.nextNodeId) {
          this.context.currentNodeId = result.nextNodeId;
          result.shouldStop = false; // Continue to next node
        } else {
          result.shouldStop = true; // Stop if no next node
        }
        break;
      case 'END':
      case 'TRANSFER_HUMAN':
        // These nodes should definitely stop
        result.shouldStop = true;
        break;
      default:
        // Other nodes can continue if they have a next node
        if (result.nextNodeId) {
          this.context.currentNodeId = result.nextNodeId;
          result.shouldStop = false; // Continue to next node
        } else {
          result.shouldStop = true; // Stop if no next node
        }
        break;
    }

    console.log(`🔧 executeNextNode - final result:`, result);
    return result;
  }

  private async executeNode(node: WorkflowNode): Promise<NodeExecutionResult> {
    switch (node.type) {
      case 'START':
        return this.executeStartNode(node);
      case 'MESSAGE':
        return await this.executeMessageNode(node);
      case 'CONDITION':
        return await this.executeConditionNode(node);
      case 'ACTION':
        return this.executeActionNode(node);
      case 'GPT_RESPONSE':
        return this.executeGPTResponseNode(node);
      case 'DATA_COLLECTION':
        return this.executeDataCollectionNode(node);
      case 'COLLECT_INFO':
        return this.executeCollectInfoNode(node);
      case 'API_CALL':
        return await this.executeApiCallNode(node);
      case 'TRANSFER_HUMAN':
        return this.executeTransferHumanNode(node);
      case 'DELAY':
        return this.executeDelayNode(node);
      case 'END':
        return this.executeEndNode(node);
      case 'WEBHOOK':
        return this.executeWebhookNode(node);
      default:
        const connections = this.connections.get(node.id);
        const nextNodeId = connections && connections.length > 0 ? connections[0].targetId : undefined;
        return { nextNodeId };
    }
  }

  private executeStartNode(node: WorkflowNode): NodeExecutionResult {
    console.log(`🔧 executeStartNode - node.id: ${node.id}, connections:`, this.connections.get(node.id));

    const connections = this.connections.get(node.id);
    let nextNodeId = connections && connections.length > 0 ? connections[0].targetId : undefined;
    const clinicConn = connections?.find(c => c.targetId === 'clinic_selection');
    if (clinicConn) nextNodeId = clinicConn.targetId;

    console.log(`🔧 executeStartNode - nextNodeId: ${nextNodeId}`);

    const msg = (this.context.message || '').toLowerCase();
    const trimmed = msg.trim();
    const mentionsUnit = trimmed === '1' || trimmed === '2' || msg.includes('vieiralves') || msg.includes('são josé') || msg.includes('sao jose') || msg.includes('centro') || msg.includes('salvador');
    if (mentionsUnit) {
      return { nextNodeId, response: '' };
    }

    const welcomeMessage =
      node.content?.welcomeMessage ||
      node.content?.text ||
      node.content?.message ||
      `Olá! Em qual unidade você gostaria de ser atendido(a)?
1️⃣ Unidade Vieiralves 📍 Rua Rio Içá, 850 — Nossa Sra. das Graças
2️⃣ Unidade São José 📍 Av. Autaz Mirim, 5773 — São José Operário

Responda com 1 ou 2, ou digite o nome da unidade.`;

    return {
      nextNodeId,
      response: welcomeMessage
    };
  }

  private async executeMessageNode(node: WorkflowNode): Promise<NodeExecutionResult> {
    let raw = (node as any).data?.message || node.content.text || node.content.message || '';
    const lastBot = [...this.context.conversationHistory].reverse().find(h => h.role === 'bot');
    const isDuplicate = lastBot && String(lastBot.content || '').trim() === String(raw).trim();
    const normalized = this.normalizeText(this.context.message || '');
    const intentPrice = ['valor', 'preco', 'preço', 'quanto', 'custa', 'orcamento', 'particular', 'pacote'].some(k => normalized.includes(k)) || !!this.findProcedureKeyword(normalized);
    const intentIns = normalized.includes('convenio') || normalized.includes('convênio') || normalized.includes('planos') || normalized.includes('plano') || normalized.includes('seguros') || normalized.includes('seguro');
    const intentLoc = normalized.includes('localizacao') || normalized.includes('localização') || normalized.includes('endereco') || normalized.includes('endereço') || normalized.includes('onde') || normalized.includes('como chegar');
    const intentBook = normalized.includes('agendar') || normalized.includes('marcar') || normalized.includes('consulta');
    const intentHuman = normalized.includes('atendente') || normalized.includes('humano') || normalized.includes('falar');
    const shouldSkip = (node.id === 'service_menu') && (intentPrice || intentIns || intentLoc || intentBook || intentHuman);
    const response = (isDuplicate || shouldSkip) ? '' : await this.interpolateMessage(raw);
    if (response) this.addToHistory('bot', response);
    const connections = this.connections.get(node.id);

    // Se este é um nó MESSAGE de unidade (unidade_vieiralves ou unidade_sao_jose),
    // procurar conexão para gpt_classifier primeiro
    let nextNodeId: string | undefined;
    if (node.id === 'unidade_vieiralves' || node.id === 'unidade_sao_jose' || node.id?.includes('unidade_')) {
      const gptConn = connections?.find(c => {
        const targetNode = this.nodes.get(c.targetId);
        return targetNode && (targetNode.id === 'gpt_classifier' || targetNode.type === 'GPT_RESPONSE');
      });
      if (gptConn) {
        nextNodeId = gptConn.targetId;
        console.log(`🔧 MESSAGE node ${node.id} - Conectando ao GPT classifier: ${nextNodeId}`);
      }
    }

    // Se não encontrou conexão específica, usar a primeira conexão disponível
    if (!nextNodeId && connections && connections.length > 0) {
      nextNodeId = connections[0].targetId;
    }

    // Fallback inteligente para fluxos conhecidos quando não há conexão explicitamente mapeada
    if (!nextNodeId) {
      const fallbackMap: Record<string, string> = {
        'msg_cadastro_sucesso': 'ask_procedimentos',
        'msg_paciente_encontrado': 'ask_procedimentos',
        'ask_procedimentos': 'collect_proc_1'
      };
      const target = fallbackMap[node.id];
      if (target && this.nodes.has(target)) {
        nextNodeId = target;
        console.log(`🔧 MESSAGE node ${node.id} - Fallback conectado para: ${nextNodeId}`);
      }
    }

    return { nextNodeId, response };
  }

  private normalizeText(text: string): string {
    return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private findProcedureKeyword(text: string): string | undefined {
    const t = this.normalizeText(text);
    const map: Record<string, string> = {
      'acupuntura': 'acupuntura',
      'agulha': 'acupuntura',
      'agulhas': 'acupuntura',
      'dry needling': 'acupuntura',
      'auricular': 'acupuntura',
      'auriculo': 'acupuntura',
      'ventosa': 'ventosaterapia',
      'ventosaterapia': 'ventosaterapia',
      'miofascial': 'liberacao miofascial',
      'liberacao miofascial': 'liberacao miofascial',
      'rpg': 'rpg',
      'reeducacao postural': 'rpg',
      'pilates': 'pilates',
      'pilates solo': 'pilates solo',
      'pilates aparelhos': 'pilates aparelhos',
      'quiropraxia': 'quiropraxia',
      'kinesio': 'liberacao miofascial',
      'kinesio taping': 'liberacao miofascial',
      'taping': 'liberacao miofascial',
      'fisioterapia': 'fisioterapia-ortopedica'
    };
    const keys = Object.keys(map);
    const hit = keys.find(k => t.includes(k));
    return hit ? map[hit] : undefined;
  }

  private async interpolateMessage(template: string): Promise<string> {
    let out = template || '';
    try {
      const lower = (this.context.message || '').toLowerCase();

      if (out.includes('${procedimento_x}') || out.includes('${valor_procedimento}') || out.includes('${duracao_procedimento}') || out.includes('${observacao_procedimento}')) {
        const { api } = await import('../lib/utils');
        const procs = await api.get('/api/appointments/procedures').then(r => r.data || []);
        const candidates = ['acupuntura', 'fisioterapia', 'rpg', 'pilates', 'quiropraxia', 'ventosaterapia', 'liberacao miofascial', 'pilates solo', 'pilates aparelhos'];
        const normalizedMsg = this.normalizeText(this.context.message || '');
        let found = this.findProcedureKeyword(normalizedMsg);
        if (!found) found = candidates.find(c => lower.includes(c));
        if (!found) found = this.context.userData.lastProcedure;
        if (!found) found = 'fisioterapia-ortopedica';
        const normFound = String(found).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
        let proc = procs.find((p: any) => String(p.id || p.code || '').toLowerCase() === normFound);
        if (!proc) {
          proc = procs.find((p: any) => {
            const pn = String(p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
            return pn.includes(normFound);
          });
        }
        if (!proc) proc = procs.find((p: any) => (p.id || p.code) === 'acupuntura') || procs[0];
        if (proc) {
          const clinicCode = this.context.userData.selectedClinic || 'vieiralves';
          let price = (proc.priceByLocation && proc.priceByLocation[clinicCode]) ? proc.priceByLocation[clinicCode] : proc.basePrice;
          try {
            const cips = await api.get(`/api/clinic/clinics/${clinicCode}/insurances/particular/procedures`).then(r => Array.isArray(r.data) ? r.data : (r.data?.procedures || r.data || []));
            const cp = cips.find((c: any) => String(c.procedureCode) === String(proc.id || proc.code) || String(c.code) === String(proc.id || proc.code));
            if (cp && typeof cp.price === 'number' && cp.price > 0) {
              price = cp.price;
            }
            if (cp && (cp.hasPackage || cp.packageInfo)) {
              const info = String(cp.packageInfo || '').trim();
              if (info) {
                out += `\n\n🎁 Pacotes disponíveis:\n${info}`;
              }
            }
          } catch { }
          out = out.replace('${procedimento_x}', proc.name || proc.code || 'Procedimento')
            .replace('${valor_procedimento}', `R$ ${Number(price).toFixed(2)}`)
            .replace('${duracao_procedimento}', `${proc.duration} minutos`)
            .replace('${observacao_procedimento}', proc.requiresEvaluation ? 'Requer avaliação prévia' : 'Não requer avaliação');
        }
      }

      if (out.includes('${convenio_x}') || out.includes('${procedimento_1}') || out.includes('${procedimento_2}') || out.includes('${procedimento_3}')) {
        const { api } = await import('../lib/utils');
        const insRes = await api.get('/api/appointments/insurances');
        const ins = insRes.data || [];
        const normalized = lower.normalize('NFD').replace(/[^a-z0-9\s]/g, '').replace(/[\u0300-\u036f]/g, '');

        const match = ins.find((i: any) => {
          const names = [i.id, i.code, i.name, i.displayName].filter(Boolean).map((s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
          return names.some((n: string) => normalized.includes(n));
        }) || ins[0];

        const convenioName = match?.displayName || match?.name || match?.id || 'Convênio';
        out = out.replace('${convenio_x}', convenioName);

        let top3: string[] = [];
        if (match && match.id) {
          try {
            const clinicCode = this.context.userData.selectedClinic || 'vieiralves';
            const coveredRes = await api.get(`/api/clinic/clinics/${clinicCode}/insurances/${match.id}/procedures`);
            const covered = Array.isArray(coveredRes.data) ? coveredRes.data : [];
            top3 = covered.slice(0, 3).map((p: any) => p.procedure?.name || p.name || p.procedureCode || p.code);
          } catch (e) {
            console.error('Error fetching covered procedures', e);
          }
        }

        out = out.replace('${procedimento_1}', top3[0] || 'Consultar')
          .replace('${procedimento_2}', top3[1] || '')
          .replace('${procedimento_3}', top3[2] || '');
      }

      if (out.includes('${unidade_nome}') || out.includes('${endereco}') || out.includes('${horario_atendimento}') || out.includes('${telefone}') || out.includes('${maps_url}')) {
        const clinicCode = this.context.userData.selectedClinic || 'vieiralves';
        let loc: any = null;
        try {
          const { api } = await import('../lib/utils');
          const locs = await api.get('/api/appointments/locations').then(r => r.data || []);
          loc = locs.find((l: any) => (l.id || '').includes(clinicCode)) || locs[0];
        } catch (error) {
          console.warn('⚠️ Falha ao buscar locais via API, usando fallback estático', error);
        }
        if (!loc) {
          loc = clinicLocations.find(l => (l.id || '').includes(clinicCode)) || clinicLocations[0];
        }
        if (loc) {
          const hours = loc.openingHours ? Object.entries(loc.openingHours).map(([d, h]: any) => `${d}: ${h}`).join(', ') : '';
          out = out.replace('${unidade_nome}', loc.displayName || loc.name || clinicCode)
            .replace('${endereco}', [loc.address, loc.neighborhood].filter(Boolean).join(' — ') || '')
            .replace('${horario_atendimento}', hours || '')
            .replace('${telefone}', loc.phone || loc.contactInfo?.phone || '')
            .replace('${maps_url}', loc.mapUrl || '');
        }
      }

      // Interpolação de dados do paciente coletados (collectedData)
      if (out.includes('${paciente.nome}') || out.includes('${paciente.cpf}') || out.includes('${paciente.data_nascimento}') ||
        out.includes('${paciente.email}') || out.includes('${paciente.convenio}') || out.includes('${paciente.telefone}')) {
        const collected = this.context.userData.collectedData || {};
        out = out.replace('${paciente.nome}', collected['name'] || '-')
          .replace('${paciente.cpf}', collected['cpf'] || '-')
          .replace('${paciente.data_nascimento}', collected['birth_date'] ?
            (() => {
              try {
                const [y, m, d] = collected['birth_date'].split('-');
                return `${d}/${m}/${y}`;
              } catch { return collected['birth_date']; }
            })() : '-')
          .replace('${paciente.email}', collected['email'] || '-')
          .replace('${paciente.convenio}', collected['insurance'] || '-')
          .replace('${paciente.telefone}', this.context.phone || '-');
      }

      // Lista dinâmica de procedimentos por unidade/convênio
      if (out.includes('${procedimentos_disponiveis}')) {
        const clinicCode = this.context.userData.selectedClinic || 'vieiralves'
        const collected = this.context.userData.collectedData || {}
        const insRaw = String(this.context.userData.patientInsurance || collected['insurance'] || 'particular').trim()
        let proceduresList: any[] = []
        try {
          const { api } = await import('../lib/utils')
          if (insRaw && insRaw.toLowerCase() !== 'particular') {
            const insRes = await api.get('/api/appointments/insurances')
            const allIns = Array.isArray(insRes.data?.insurances) ? insRes.data.insurances : (insRes.data || [])
            const ins = this.findClosestInsurance(insRaw, allIns) || { id: insRaw, code: insRaw }
            const cipsRes = await api.get(`/api/clinic/clinics/${clinicCode}/insurances/${ins.id || ins.code}/procedures`)
            proceduresList = Array.isArray(cipsRes.data) ? cipsRes.data : (cipsRes.data?.procedures || [])
          } else {
            const cipsRes = await api.get(`/api/clinic/clinics/${clinicCode}/insurances/particular/procedures`)
            proceduresList = Array.isArray(cipsRes.data) ? cipsRes.data : (cipsRes.data?.procedures || [])
          }
        } catch (e) {
          const insuranceId = insRaw.toLowerCase() === 'particular' ? 'particular' : insRaw
          const all = clinicDataService.getProceduresByInsurance(insuranceId)
          proceduresList = all.map(p => ({ procedure: p }))
        }
        const bannedSJ = ['fisioterapia-pelvica', 'quiropraxia', 'pilates-aparelhos', 'pilates']
        const names = proceduresList
          .map((p: any) => (p.procedure?.name || p.name || p.procedureCode || p.code || '').toString())
          .filter(Boolean)
          .filter(n => clinicCode === 'sao-jose' ? !bannedSJ.some(b => n.toLowerCase().includes(b.replace('-', ' '))) : true)
        const unique = Array.from(new Set(names))
        const bullets = unique.length ? unique.map(n => `• ${n}`).join('\n') : '• Consulte nossos procedimentos disponíveis'
        out = out.replace('${procedimentos_disponiveis}', bullets)
      }
    } catch { }
    return out;
  }

  private async executeConditionNode(node: WorkflowNode): Promise<NodeExecutionResult> {
    const condition = node.content.condition || '';
    const connections = this.connections.get(node.id) || [];

    let nextNodeId: string | undefined;
    const lowerMessage = this.context.message.toLowerCase();

    switch (condition) {
      case 'clinic_selection':
        const clinics = ['vieiralves', 'saojose', 'são josé', 'sao jose', 'salvador', 'centro'];
        const trimmedMsg = lowerMessage.trim();
        let responseMessage = '';
        if (
          trimmedMsg === '1' ||
          lowerMessage.includes('vieiralves') ||
          lowerMessage.includes('vieira') ||
          lowerMessage.includes('salvador')
        ) {
          this.context.userData.selectedClinic = 'vieiralves';
          // Buscar mensagem do node unidade_vieiralves ao invés de template hard-coded
          const unidadeNode = Array.from(this.nodes.values()).find(n => n.id === 'unidade_vieiralves');
          if (unidadeNode && unidadeNode.type === 'MESSAGE') {
            const msg = unidadeNode.content?.message || unidadeNode.content?.text || '';
            responseMessage = await this.interpolateMessage(msg);
          } else {
            // Fallback apenas se node não existir
            responseMessage = '✅ Você escolheu a Unidade Vieiralves!';
          }
          nextNodeId = connections.find(c => c.port === 'true')?.targetId;
          return { nextNodeId, response: responseMessage };
        }
        if (
          trimmedMsg === '2' ||
          lowerMessage.includes('são josé') ||
          lowerMessage.includes('sao jose') ||
          lowerMessage.includes('centro')
        ) {
          this.context.userData.selectedClinic = 'sao-jose';
          // Buscar mensagem do node unidade_sao_jose ao invés de template hard-coded
          const unidadeNode = Array.from(this.nodes.values()).find(n => n.id === 'unidade_sao_jose');
          if (unidadeNode && unidadeNode.type === 'MESSAGE') {
            const msg = unidadeNode.content?.message || unidadeNode.content?.text || '';
            responseMessage = await this.interpolateMessage(msg);
          } else {
            // Fallback apenas se node não existir
            responseMessage = '✅ Você escolheu a Unidade São José!';
          }
          nextNodeId = connections.find(c => c.port === 'true')?.targetId;
          return { nextNodeId, response: responseMessage };
        }
        // Mensagem de erro também deve vir do node, mas usar fallback se não houver
        responseMessage = node.content.finalMessage || node.content.message || 'Por favor, escolha uma de nossas unidades.';
        nextNodeId = connections.find(c => c.port === 'false')?.targetId;
        return { nextNodeId, response: responseMessage };

      case 'service_selection':
        const trimmed = lowerMessage.trim();
        const normalizedSel = this.normalizeText(this.context.message);
        const mentionsProcedure = ['acupuntura', 'fisioterapia', 'rpg', 'pilates', 'quiropraxia', 'ventosa', 'miofascial', 'liberacao miofascial', 'pilates solo', 'pilates aparelhos'].some(k => lowerMessage.includes(k)) || !!this.findProcedureKeyword(normalizedSel);
        const matchedProc = ['acupuntura', 'fisioterapia', 'rpg', 'pilates', 'quiropraxia', 'ventosaterapia', 'liberacao miofascial', 'pilates solo', 'pilates aparelhos'].find(k => lowerMessage.includes(k)) || this.findProcedureKeyword(normalizedSel);
        if (matchedProc) { this.context.userData.lastProcedure = matchedProc; }
        if (trimmed === '1' || lowerMessage.includes('valor') || lowerMessage.includes('preço') || lowerMessage.includes('quanto') || mentionsProcedure) {
          nextNodeId = connections.find(c => c.port === '1')?.targetId;
        } else if (trimmed === '2' || lowerMessage.includes('convênio') || lowerMessage.includes('plano') || lowerMessage.includes('seguro')) {
          nextNodeId = connections.find(c => c.port === '2')?.targetId;
        } else if (trimmed === '3' || lowerMessage.includes('local') || lowerMessage.includes('endereço') || lowerMessage.includes('como chegar')) {
          nextNodeId = connections.find(c => c.port === '3')?.targetId;
        } else if (trimmed === '4' || lowerMessage.includes('procedimento') || lowerMessage.includes('o que é') || lowerMessage.includes('benefícios') || lowerMessage.includes('indicação')) {
          // Porta 4: Explicação de procedimento
          nextNodeId = connections.find(c => c.port === '4')?.targetId;
        } else if (trimmed === '5' || lowerMessage.includes('agendar') || lowerMessage.includes('marcar') || lowerMessage.includes('consulta')) {
          // Porta 5: Agendamento
          this.context.userData.isSchedulingIntent = true;
          nextNodeId = connections.find(c => c.port === '5')?.targetId;
        } else if (trimmed === '6' || lowerMessage.includes('atendente') || lowerMessage.includes('humano') || lowerMessage.includes('falar')) {
          // Porta 6: Falar com humano
          nextNodeId = connections.find(c => c.port === '6')?.targetId;
        } else {
          const gptConn = connections.find(c => {
            const node = this.nodes.get(c.targetId);
            return node && node.type === 'GPT_RESPONSE';
          });
          nextNodeId = gptConn?.targetId || connections.find(c => c.port === '1')?.targetId || connections.find(c => c.port === 'main')?.targetId || connections[0]?.targetId;
        }
        break;

      case 'patient_found':
        const patientFound = !!this.context.userData.patientFound || !!this.context.userData._patientId;
        nextNodeId = connections.find(c => c.port === (patientFound ? 'true' : 'false'))?.targetId;
        break;

      case 'insurance_valid':
        const insuranceCode = this.context.userData.patientInsurance || this.context.userData.collectedData?.insurance;
        const procedureCode = this.context.userData.lastProcedure || this.context.userData.collectedData?.procedure_type;
        let isValid = false;

        if (insuranceCode && procedureCode) {
          try {
            const { api } = await import('../lib/utils');
            const clinicCode = this.context.userData.selectedClinic || 'vieiralves';
            const insRes = await api.get('/api/appointments/insurances');
            const insList = insRes.data || [];
            const matchedIns = insList.find((i: any) => {
              const ni = String(i.id || '').toLowerCase();
              const nn = String(i.name || '').toLowerCase();
              const nd = String(i.displayName || '').toLowerCase();
              const insNorm = String(insuranceCode || '').toLowerCase();
              return insNorm === ni || insNorm === nn || insNorm === nd;
            });

            if (matchedIns && matchedIns.id) {
              const coveredRes = await api.get(`/api/clinic/clinics/${clinicCode}/insurances/${matchedIns.id}/procedures`);
              const covered = Array.isArray(coveredRes.data) ? coveredRes.data : [];
              const procNorm = String(procedureCode).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              isValid = covered.some((p: any) => {
                const pn = String(p.procedure?.name || p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const pc = String(p.procedureCode || p.code || '').toLowerCase();
                return pn.includes(procNorm) || pc === procNorm;
              });
            } else if (insuranceCode.toLowerCase() === 'particular') {
              isValid = true; // Particular sempre válido
            }
          } catch (e) {
            console.error('Error checking insurance validity:', e);
          }
        }

        nextNodeId = connections.find(c => c.port === (isValid ? 'true' : 'false'))?.targetId;
        break;

      case 'procedure_selected':
        const hasProcedure = !!this.context.userData.lastProcedure || !!this.context.userData.collectedData?.procedure_type;
        const wantsMore = lowerMessage.includes('sim') || lowerMessage.includes('s') || lowerMessage.includes('mais') || lowerMessage.includes('outro');
        const wantsContinue = lowerMessage.includes('não') || lowerMessage.includes('nao') || lowerMessage.includes('continuar') || lowerMessage.includes('pronto');

        if (hasProcedure && wantsMore) {
          nextNodeId = connections.find(c => c.port === 'add_more')?.targetId;
        } else if (hasProcedure && wantsContinue) {
          nextNodeId = connections.find(c => c.port === 'continue')?.targetId;
        } else if (hasProcedure) {
          // Procedure mentioned but unclear intent - ask
          nextNodeId = connections.find(c => c.port === 'add_more')?.targetId;
        } else {
          // No procedure selected yet
          nextNodeId = connections.find(c => c.port === 'add_more')?.targetId;
        }
        break;

      case 'availability_available':
        const hasAvailability = !!this.context.userData.availabilityChecked && this.context.userData.availabilityAvailable === true;
        nextNodeId = connections.find(c => c.port === (hasAvailability ? 'true' : 'false'))?.targetId;
        break;

      default:
        // Original condition evaluation for other cases
        const keywords = condition.split('|').map(k => k.trim().toLowerCase());
        const matches = keywords.some(keyword => lowerMessage.includes(keyword));

        if (matches) {
          // Find connection with matching condition
          nextNodeId = connections.find(c => {
            if (!c.condition) return true;
            const connKeywords = c.condition.split('|').map(k => k.trim().toLowerCase());
            return connKeywords.some(keyword => lowerMessage.includes(keyword));
          })?.targetId;
        }

        // If no specific match, prefer GPT if connected, otherwise first connection
        if (!nextNodeId && connections.length > 0) {
          const gptConn = connections.find(c => {
            const node = this.nodes.get(c.targetId);
            return node && node.type === 'GPT_RESPONSE';
          });
          nextNodeId = gptConn?.targetId || connections[0].targetId;
        }
    }

    return { nextNodeId };
  }

  private async executeActionNode(node: WorkflowNode): Promise<NodeExecutionResult> {
    const action = node.content.action || '';

    switch (action) {
      case 'search_patient_by_phone':
        // Search patient by phone number
        try {
          const { api } = await import('../lib/utils');
          const phoneDigits = String(this.context.phone || '').replace(/\D/g, '');
          const res = await api.get('/api/patients', { params: { search: phoneDigits } });
          const list = (res.data && res.data.patients) || [];
          const pat = list.find((p: any) => String(p.phone || '').replace(/\D/g, '') === phoneDigits);

          if (pat) {
            this.context.userData.patientFound = true;
            this.context.userData._patientId = pat.id;
            this.context.userData.patientName = pat.name;
            this.context.userData.patientInsurance = pat.insuranceCompany;
            const isDefaultName = !pat.name || /^Paciente\s+\d+/.test(String(pat.name || ''));
            this.context.userData.registrationComplete = !!pat.insuranceCompany && !isDefaultName;
          } else {
            this.context.userData.patientFound = false;
          }
        } catch (error) {
          console.error('Error searching patient:', error);
          this.context.userData.patientFound = false;
        }
        break;

      case 'validate_and_create_patient':
        // Validate and create patient registration
        try {
          const { api } = await import('../lib/utils');
          const collectedData = this.context.userData.collectedData || {};
          const phoneDigits = String(this.context.phone || '').replace(/\D/g, '');

          // Check if patient already exists
          const res = await api.get('/api/patients', { params: { search: phoneDigits } });
          const list = (res.data && res.data.patients) || [];
          let pat = list.find((p: any) => String(p.phone || '').replace(/\D/g, '') === phoneDigits);

          if (!pat) {
            // Create new patient
            const patientData: any = {
              phone: phoneDigits,
              name: collectedData['name'] || `Paciente ${phoneDigits.slice(-4)}`,
            };

            if (collectedData['cpf']) patientData.cpf = collectedData['cpf'].replace(/\D/g, '');
            if (collectedData['birth_date']) patientData.birthDate = collectedData['birth_date'];
            if (collectedData['email']) patientData.email = collectedData['email'];
            if (collectedData['address']) patientData.address = collectedData['address'];
            if (collectedData['insurance'] && collectedData['insurance'].toLowerCase() !== 'particular') {
              patientData.insuranceCompany = collectedData['insurance'];
            }

            const createRes = await api.post('/api/patients', patientData);
            pat = createRes.data;
          } else {
            // Update existing patient
            const updateData: any = {};
            if (collectedData['name']) updateData.name = collectedData['name'];
            if (collectedData['cpf']) updateData.cpf = collectedData['cpf'].replace(/\D/g, '');
            if (collectedData['birth_date']) updateData.birthDate = collectedData['birth_date'];
            if (collectedData['email']) updateData.email = collectedData['email'];
            if (collectedData['address']) updateData.address = collectedData['address'];
            if (collectedData['insurance'] && collectedData['insurance'].toLowerCase() !== 'particular') {
              updateData.insuranceCompany = collectedData['insurance'];
            }

            if (Object.keys(updateData).length > 0) {
              await api.put(`/api/patients/${pat.id}`, updateData);
            }
          }

          this.context.userData._patientId = pat.id;
          this.context.userData.patientName = pat.name;
          this.context.userData.patientInsurance = pat.insuranceCompany;
          this.context.userData.registrationComplete = true;
        } catch (error) {
          console.error('Error validating/creating patient:', error);
        }
        break;

      case 'check_appointment_availability':
        // Check appointment availability
        try {
          const collectedData = this.context.userData.collectedData || {};
          const date = collectedData['preferred_date'];
          const shift = collectedData['preferred_shift'];
          const procedure = this.context.userData.lastProcedure || collectedData['procedure_type'];
          const clinicCode = this.context.userData.selectedClinic || 'vieiralves';

          // For now, assume available (real implementation would check calendar)
          // TODO: Implement real availability check via API
          this.context.userData.availabilityChecked = true;
          this.context.userData.availabilityAvailable = true; // Placeholder

          // In real implementation, would call:
          // const { api } = await import('../lib/utils');
          // const availability = await api.get(`/api/appointments/availability`, {
          //   params: { clinic: clinicCode, procedure, date, shift }
          // });
          // this.context.userData.availabilityAvailable = availability.data.available;
        } catch (error) {
          console.error('Error checking availability:', error);
          this.context.userData.availabilityChecked = true;
          this.context.userData.availabilityAvailable = false;
        }
        break;

      case 'create_appointment_reservation':
        // Create appointment reservation
        try {
          const { api } = await import('../lib/utils');
          const collectedData = this.context.userData.collectedData || {};
          const patientId = this.context.userData._patientId;

          if (!patientId) {
            throw new Error('Patient ID not found');
          }

          const appointmentData = {
            patientId,
            patientPhone: this.context.phone,
            procedure: collectedData['procedure_type'] || this.context.userData.lastProcedure,
            date: collectedData['preferred_date'],
            time: collectedData['preferred_shift'],
            location: this.context.userData.selectedClinic,
            insurance: collectedData['insurance'] || this.context.userData.patientInsurance,
            notes: collectedData['notes'] || '',
            status: 'PENDING_CONFIRMATION' // Reservation, not confirmed yet
          };

          const res = await api.post('/api/appointments', appointmentData);
          this.context.userData.appointmentId = res.data.appointment?.id;
          this.context.userData.appointmentScheduled = true;
        } catch (error) {
          console.error('Error creating appointment reservation:', error);
        }
        break;

      case 'send_confirmation_notifications':
        // Send confirmation notifications (SMS/Email)
        try {
          const appointmentId = this.context.userData.appointmentId;
          if (appointmentId) {
            // TODO: Implement notification sending
            // const { api } = await import('../lib/utils');
            // await api.post(`/api/appointments/${appointmentId}/notify`);
            console.log('📧 Notifications would be sent for appointment:', appointmentId);
          }
        } catch (error) {
          console.error('Error sending notifications:', error);
        }
        break;

      case 'schedule_appointment':
        // Legacy: schedule appointment (confirmed)
        this.context.userData.appointmentScheduled = true;
        break;

      case 'send_confirmation':
        // Legacy: send confirmation
        break;
    }

    const connections = this.connections.get(node.id);
    const nextNodeId = connections && connections.length > 0 ? connections[0].targetId : undefined;

    return {
      nextNodeId
    };
  }

  private async executeGPTResponseNode(node: WorkflowNode): Promise<NodeExecutionResult> {
    // Usar systemPrompt do node, ou fallback padrão que corresponde ao workflow (1-6 portas)
    const systemPrompt = node.content.systemPrompt ||
      'Você é um classificador de intenção para clínica de fisioterapia. Analise a mensagem do usuário e classifique em UMA das opções:\n\n1) VALORES - perguntas sobre preços, valores particulares, pacotes (ex: "quanto custa", "qual o valor", "preço")\n2) CONVÊNIOS - perguntas sobre convênios aceitos, planos de saúde, cobertura (ex: "quais convênios", "aceita bradesco")\n3) LOCALIZAÇÃO - perguntas sobre endereço, como chegar, horários, contato (ex: "onde fica", "endereço", "horário")\n4) PROCEDIMENTO - perguntas sobre o que é um procedimento, benefícios, duração, indicações (ex: "o que é acupuntura", "benefícios")\n5) AGENDAR - desejo de marcar consulta, agendar, marcar horário (ex: "quero agendar", "quero gendar", "marcar consulta", "agendar", "marcar", "quero marcar")\n6) ATENDENTE - pedido para falar com humano, atendente, pessoa (ex: "falar com humano", "atendente")\n\nIMPORTANTE: "quero agendar", "quero gendar" (com erro de digitação), "marcar", "agendar consulta" = SEMPRE porta 5 (AGENDAR).\n\nResponda APENAS com JSON no formato {"intent_port":"<1|2|3|4|5|6>","brief":"<mensagem curta>","confidence":<0..1>}.';
    const userMessage = this.context.message || '';
    const normalized = this.normalizeText(userMessage);
    const connections = this.connections.get(node.id) || [];
    let nextNodeId: string | undefined;
    let response = '';

    const apiKey = process.env.OPENAI_API_KEY || '';
    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    const timeout = Number(process.env.OPENAI_TIMEOUT) || 20000;

    // Check if this is just a clinic selection (user said "1" or "2" or similar)
    // In this case, don't send any response as the welcome message was already sent
    const isJustClinicSelection = normalized.trim() === '1' || normalized.trim() === '2' ||
      (normalized.length <= 3 && ['1', '2', 'um', 'dois'].includes(normalized.trim()));

    // Check for generic greetings/messages that don't have clear intent
    const genericGreetings = ['oi', 'olá', 'ola', 'opa', 'eae', 'e aí', 'e ai', 'hey', 'hi', 'hello',
      'tchau', 'tchauzinho', 'obrigado', 'obrigada', 'valeu', 'vlw', 'ok', 'okay', 'beleza', 'blz',
      'tudo bem', 'td bem', 'como vai', 'tudo certo', 'td certo', 'sim', 'não', 'nao', 'claro', 'pode ser'];
    const isGenericMessage = genericGreetings.some(g => {
      const trimmed = normalized.trim();
      return trimmed === g || trimmed.startsWith(g + ' ') || trimmed.endsWith(' ' + g) ||
        trimmed.includes(' ' + g + ' ') || (trimmed.length <= 10 && trimmed.includes(g));
    });

    // Check for follow-up questions (e.g., "e o da fisioterapia?" after asking about acupuntura)
    const isFollowUp = /^(e\s+)?((o|a)\s+)?(do|da|de|dos|das)\s+/.test(normalized.trim());

    // Get last topic context
    const lastTopic = this.context.userData.lastTopic || '';

    // Se for mensagem genérica, não classificar e aguardar mensagem com intenção clara
    if (isGenericMessage && !isFollowUp) {
      console.log(`🔧 GPT_RESPONSE - Mensagem genérica detectada: "${userMessage}". Aguardando intenção clara.`);
      // Não definir nextNodeId, apenas responder de forma amigável
      response = 'Olá! Como posso ajudar você hoje? 😊\n\nVocê pode:\n1️⃣ Saber valores de procedimentos\n2️⃣ Verificar convênios aceitos\n3️⃣ Conhecer nossa localização\n4️⃣ Saber mais sobre um procedimento\n5️⃣ Agendar uma consulta\n6️⃣ Falar com atendente';
      // Não definir nextNodeId para manter no GPT classifier aguardando próxima mensagem
      return { nextNodeId: undefined, response, shouldStop: true };
    }

    const iaamPort = this.classifyIAAMToPort(normalized)
    if (iaamPort) {
      const targetConnection = connections.find(c => c.port === iaamPort)
      nextNodeId = targetConnection?.targetId || connections[0]?.targetId
      if (iaamPort === '1') this.context.userData.lastTopic = 'price'
      else if (iaamPort === '2') this.context.userData.lastTopic = 'insurance'
      else if (iaamPort === '3') this.context.userData.lastTopic = 'location'
      else if (iaamPort === '4') this.context.userData.lastTopic = 'procedure_info'
      else if (iaamPort === '5') { this.context.userData.lastTopic = 'scheduling'; this.context.userData.isSchedulingIntent = true }
      else if (iaamPort === '6') this.context.userData.lastTopic = 'human'
      return { nextNodeId, response }
    }




    console.log(`🤖 [GPT] Verificando condições para chamar GPT:`);
    console.log(`🤖 [GPT]    nextNodeId: ${nextNodeId || 'undefined'}`);
    console.log(`🤖 [GPT]    apiKey: ${apiKey ? 'SIM' : 'NÃO'}`);
    console.log(`🤖 [GPT]    isJustClinicSelection: ${isJustClinicSelection}`);
    console.log(`🤖 [GPT]    isGenericMessage: ${isGenericMessage}`);
    console.log(`🤖 [GPT]    Vai chamar GPT? ${!nextNodeId && apiKey && !isJustClinicSelection && !isGenericMessage ? 'SIM ✅' : 'NÃO ❌'}`);

    if (!nextNodeId && apiKey && !isJustClinicSelection && !isGenericMessage) {
      try {
        console.log(`🤖 [GPT] 🚀 CHAMANDO GPT-4o AGORA!`);
        const client = new OpenAI({ apiKey });

        // Build conversation history for context
        const historyContext = this.context.conversationHistory
          .slice(-4) // Last 4 messages for context
          .map(h => `${h.role === 'user' ? 'Usuário' : 'Bot'}: ${h.content}`)
          .join('\n');

        const contextInfo = lastTopic ? `\n\nContexto: O usuário estava perguntando sobre ${lastTopic === 'price' ? 'valores/preços' : lastTopic === 'insurance' ? 'convênios' : lastTopic === 'location' ? 'localização' : lastTopic}.` : '';

        // Prompt deve corresponder ao systemPrompt do workflow (1-6 portas)
        const prompt = `${systemPrompt}\n\nClassifique a intenção do usuário e retorne um JSON no formato {\"intent_port\":\"<1|2|3|4|5|6>\",\"brief\":\"<mensagem curta>\",\"confidence\":<0..1>}.\n\nHistórico recente:\n${historyContext}${contextInfo}\n\nPergunta atual: \"${userMessage}\"`;

        // Logs detalhados para debug
        console.log(`🤖 [GPT] ==========================================`);
        console.log(`🤖 [GPT] 📨 MENSAGEM DO USUÁRIO: "${userMessage}"`);
        console.log(`🤖 [GPT] 📋 HISTÓRICO (últimas 4 mensagens):`);
        console.log(historyContext || '(sem histórico)');
        console.log(`🤖 [GPT] 🏥 CLÍNICA SELECIONADA: ${this.context.userData.selectedClinic || 'nenhuma'}`);
        console.log(`🤖 [GPT] 📝 ÚLTIMO TÓPICO: ${lastTopic || 'nenhum'}`);
        console.log(`🤖 [GPT] 🔧 SYSTEM PROMPT:`);
        console.log(systemPrompt.substring(0, 200) + '...');
        console.log(`🤖 [GPT] 📤 PROMPT COMPLETO ENVIADO AO GPT:`);
        console.log(prompt);
        console.log(`🤖 [GPT] ⏳ Chamando GPT-4o...`);

        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'Responda apenas com JSON válido sem texto extra.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0,
          max_tokens: 100
        }, { timeout });

        let content = completion.choices?.[0]?.message?.content || '';
        console.log(`🤖 [GPT] 📥 RESPOSTA RAW DO GPT:`);
        console.log(content);

        // Remover blocos de código markdown se presentes
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let parsed: any = {};
        try {
          parsed = JSON.parse(content);
          console.log(`🤖 [GPT] ✅ JSON PARSEADO COM SUCESSO:`);
          console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log(`🤖 [GPT] ❌ ERRO AO PARSEAR JSON:`, e);
          console.log(`🤖 [GPT] Conteúdo após limpeza:`, content);
          console.log(`🤖 [GPT] Tentando extrair informações do texto...`);
          // Fallback: tentar extrair número da resposta
          const match = content.match(/"intent_port"\s*:\s*"([1-6])"/);
          if (match) {
            parsed.intent_port = match[1];
            parsed.confidence = 0.8;
            parsed.brief = 'Intenção detectada';
            console.log(`🤖 [GPT] Extraído intent_port: ${match[1]}`);
          } else {
            parsed = {};
          }
        }

        const port = String(parsed.intent_port || '').trim();
        const brief = String(parsed.brief || '').trim();
        const confidence = Number(parsed.confidence ?? 0.5);
        // Reduzir threshold para 0.5 para ser mais permissivo (era 0.6)
        const threshold = Number(process.env.GPT_CONFIDENCE_THRESHOLD || 0.5);

        console.log(`🤖 [GPT] 📊 RESULTADO DA CLASSIFICAÇÃO:`);
        console.log(`🤖 [GPT]    Porta selecionada: ${port || 'NENHUMA'}`);
        console.log(`🤖 [GPT]    Confiança: ${confidence} (threshold: ${threshold})`);
        console.log(`🤖 [GPT]    Brief: "${brief}"`);

        if (['1', '2', '3', '4', '5', '6'].includes(port)) {
          if (confidence >= threshold) {
            // O workflow tem 6 portas mapeadas diretamente:
            // Porta 1: Valores → branch_valores
            // Porta 2: Convênios → info_convenios
            // Porta 3: Localização → info_localizacao
            // Porta 4: Explicação → info_procedimento_explicacao
            // Porta 5: Agendar → check_patient
            // Porta 6: Humano → transfer_human
            // O GPT retorna 1-6 diretamente, sem necessidade de mapeamento
            const targetConnection = connections.find(c => c.port === port);
            nextNodeId = targetConnection?.targetId || connections[0]?.targetId;

            console.log(`🤖 [GPT] ✅ CLASSIFICAÇÃO ACEITA!`);
            console.log(`🤖 [GPT]    Conexão: porta ${port} → node "${targetConnection?.targetId || 'NENHUM'}"`);
            console.log(`🤖 [GPT]    Próximo node: ${nextNodeId}`);

            response = response || brief || 'Entendi.';

            // Update last topic based on classified intent
            if (port === '1') this.context.userData.lastTopic = 'price';
            else if (port === '2') this.context.userData.lastTopic = 'insurance';
            else if (port === '3') this.context.userData.lastTopic = 'location';
            else if (port === '4') this.context.userData.lastTopic = 'procedure_info';
            else if (port === '5') {
              this.context.userData.lastTopic = 'scheduling';
              this.context.userData.isSchedulingIntent = true;
            }
            else if (port === '6') this.context.userData.lastTopic = 'human';
          } else {
            console.log(`🤖 [GPT] ⚠️ CONFIANÇA BAIXA (${confidence} < ${threshold}). Solicitando confirmação.`);
            response = '🔎 Só para confirmar: deseja saber sobre valores, convênios, localização ou agendar? Responda com 1, 2, 3 ou 4.';
            const svcNode = Array.from(this.nodes.values()).find(n => n.type === 'CONDITION' && (n.content?.condition || '').toLowerCase() === 'service_selection');
            nextNodeId = svcNode?.id || connections.find(c => c.port === '1')?.targetId || connections[0]?.targetId;
          }
        } else {
          console.log(`🤖 [GPT] ❌ PORTA INVÁLIDA OU NÃO ENCONTRADA: "${port}"`);
        }

        console.log(`🤖 [GPT] ==========================================`);
      } catch (error) {
        console.error('🔧 GPT_RESPONSE - GPT classification error:', error);
      }
    }

    // Fallback final - only send generic message if no specific intent was detected
    // But skip if this was just a clinic selection (welcome message already sent)
    if (!nextNodeId && !isJustClinicSelection) {
      // If we already set response to empty because we detected an intent keyword, don't override it
      if (response === '') {
        // Intent was detected but somehow nextNodeId wasn't set - use port 1 as fallback
        nextNodeId = connections.find(c => c.port === '1')?.targetId || connections[0]?.targetId;
      } else if (!response) {
        // No intent detected at all - don't send a message, just wait for user input
        // The welcome message was already sent by clinic_selection
        response = '';
        // Don't set nextNodeId to avoid continuing execution unnecessarily
        // The user should respond with their intent
      }
    } else if (isJustClinicSelection) {
      // Just clinic selection - don't send any response, welcome message already sent
      response = '';
      // Don't continue to next node, wait for user to specify their intent
      nextNodeId = undefined;
    }

    // Only add non-empty responses to history
    if (response) {
      this.addToHistory('bot', response);
    }

    console.log(`🔧 GPT_RESPONSE - Final result - nextNodeId: ${nextNodeId}, response length: ${response?.length || 0}, hasResponse: ${!!response}`);

    return { nextNodeId, response };

  }

  private classifyIAAMToPort(message: string): string | undefined {
    const s = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const fix = (t: string) => t
      .replace(/\b(gendar|ajendar|agnda|aje\s*nda)\b/gi, 'agendar')
      .replace(/\b(reagnda|remaracr|reagendar|remarcar)\b/gi, 'reagendar')
      .replace(/\b(desmacar|desmaracr|desmarcar)\b/gi, 'cancelar')
      .replace(/\b(ond\s*f\s*ica|ond\s*fica|onde\s*f\s*ica)\b/gi, 'onde fica')
      .replace(/\b(valro|valr)\b/gi, 'valor')
      .replace(/\bacupuntra\b/gi, 'acupuntura')
    const m = fix(s)
    const has = (arr: string[]) => arr.some(k => m.includes(k))
    const trg = {
      local: ['onde fica', 'local', 'endereco', 'como chegar', 'perto de', 'localizacao', 'qual o endereco', 'manda a localizacao', 'mapa'],
      conv: ['convenio', 'plano', 'aceita meu plano', 'aceita', 'atende'],
      convproc: ['cobre', 'cobertura', 'procedimentos do convenio', 'plano cobre', 'cobre acupuntura'],
      price: ['valor', 'preco', 'quanto custa', 'particular', 'pacote', 'preco do procedimento'],
      info: ['o que e', 'pra que serve', 'beneficio', 'explica', 'quero saber mais', 'descricao', 'o que faz'],
      sched: ['agendar', 'marcar', 'agenda ai', 'quero horario', 'quero agendar hoje', 'marcar consulta', 'agnd', 'aje dar'],
      resched: ['remarcar', 'reagendar', 'mudar horario', 'trocar horario', 'reagnda', 'mudar consulta'],
      cancel: ['cancelar', 'desmarcar', 'cancela ai', 'remover agendamento', 'nao quero mais']
    }
    if (has(trg.cancel) || has(trg.resched)) return '6'
    if (has(trg.sched)) return '5'
    if (has(trg.local)) return '3'
    if (has(trg.convproc) || has(trg.conv)) return '2'
    if (has(trg.price)) return '1'
    if (has(trg.info)) return '4'
    return undefined
  }

  private validateField(field: string, value: string): { valid: boolean; error?: string; normalizedValue?: string } {
    const trimmed = value.trim();

    switch (field) {
      case 'name':
        if (trimmed.length < 2) {
          return { valid: false, error: '⚠️ O nome deve ter pelo menos 2 caracteres. Por favor, informe seu nome completo:' };
        }
        if (trimmed.length > 100) {
          return { valid: false, error: '⚠️ O nome é muito longo. Por favor, informe um nome válido:' };
        }
        // Validar se não é apenas números
        if (/^\d+$/.test(trimmed)) {
          return { valid: false, error: '⚠️ O nome não pode conter apenas números. Por favor, informe seu nome completo:' };
        }
        return { valid: true, normalizedValue: trimmed };

      case 'cpf':
        // Remover caracteres não numéricos
        const cpfDigits = trimmed.replace(/\D/g, '');
        if (cpfDigits.length !== 11) {
          return { valid: false, error: '⚠️ CPF deve ter 11 dígitos. Por favor, informe apenas os números do seu CPF:' };
        }
        // Validar CPF (algoritmo básico)
        if (!this.validateCPF(cpfDigits)) {
          return { valid: false, error: '⚠️ CPF inválido. Por favor, verifique e informe novamente:' };
        }
        return { valid: true, normalizedValue: cpfDigits };

      case 'birth_date':
      case 'birthDate':
        // Aceitar formatos: DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA
        const dateMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (!dateMatch) {
          return { valid: false, error: '⚠️ Data inválida. Por favor, informe no formato DD/MM/AAAA (ex: 15/08/1990):' };
        }
        const [, day, month, year] = dateMatch;
        const d = parseInt(day, 10);
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);

        // Validar range
        if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
          return { valid: false, error: '⚠️ Data inválida. Por favor, verifique dia, mês e ano (ex: 15/08/1990):' };
        }

        // Validar se a data existe (ex: 31/02 não existe)
        const date = new Date(y, m - 1, d);
        if (date.getDate() !== d || date.getMonth() !== m - 1 || date.getFullYear() !== y) {
          return { valid: false, error: '⚠️ Data inválida. Por favor, verifique se a data existe (ex: 15/08/1990):' };
        }

        // Validar se não é data futura
        if (date > new Date()) {
          return { valid: false, error: '⚠️ A data de nascimento não pode ser no futuro. Por favor, informe uma data válida:' };
        }

        // Normalizar para formato ISO (YYYY-MM-DD)
        const normalizedDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return { valid: true, normalizedValue: normalizedDate };

      case 'email':
        // Se vazio, permitir (email é opcional em alguns casos)
        if (trimmed.length === 0) {
          return { valid: true, normalizedValue: '' };
        }
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          return { valid: false, error: '⚠️ Email inválido. Por favor, informe um email válido (ex: seuemail@exemplo.com):' };
        }
        return { valid: true, normalizedValue: trimmed.toLowerCase() };

      case 'phone':
        const phoneDigits = trimmed.replace(/\D/g, '');
        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
          return { valid: false, error: '⚠️ Telefone inválido. Por favor, informe com DDD (10 ou 11 dígitos, ex: 92999999999):' };
        }
        return { valid: true, normalizedValue: phoneDigits };

      case 'insurance':
        if (trimmed.length < 2) {
          return { valid: false, error: '⚠️ Por favor, informe o nome do convênio ou digite "particular":' };
        }
        return { valid: true, normalizedValue: trimmed };

      case 'preferred_date':
        // Validar formato de data (pode ser DD/MM/AAAA ou YYYY-MM-DD)
        const dateMatch2 = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/) || trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
        if (!dateMatch2) {
          return { valid: false, error: '⚠️ Data inválida. Por favor, informe no formato DD/MM/AAAA:' };
        }
        return { valid: true, normalizedValue: trimmed };

      case 'preferred_shift':
        const shift = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const validShifts = ['manha', 'manhã', 'tarde', 'noite'];
        if (!validShifts.includes(shift)) {
          return { valid: false, error: '⚠️ Turno inválido. Por favor, informe: Manhã, Tarde ou Noite:' };
        }
        return { valid: true, normalizedValue: shift };

      default:
        // Para outros campos, apenas validar se não está vazio
        if (trimmed.length === 0) {
          return { valid: false, error: `⚠️ Este campo é obrigatório. Por favor, informe:` };
        }
        return { valid: true, normalizedValue: trimmed };
    }
  }

  private validateCPF(cpf: string): boolean {
    // Remove caracteres não numéricos
    const digits = cpf.replace(/\D/g, '');

    // Verifica se tem 11 dígitos
    if (digits.length !== 11) return false;

    // Verifica se todos os dígitos são iguais (CPF inválido)
    if (/^(\d)\1{10}$/.test(digits)) return false;

    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(digits.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(digits.charAt(10))) return false;

    return true;
  }

  private executeDataCollectionNode(node: WorkflowNode): NodeExecutionResult {
    const field = node.content.field || '';
    const prompt =
      node.content.prompt ||
      node.content.message ||
      (field ? `Por favor, informe seu ${field}:` : 'Por favor, informe o dado solicitado:');

    // Verificar se já temos uma resposta do usuário para este campo
    const userMessage = this.context.message || '';
    const hasUserResponse = userMessage.trim().length > 0;

    // Verificar se este é o campo que estamos coletando atualmente
    const currentCollectingField = this.context.userData.collectingField;
    const isCurrentField = currentCollectingField === field;

    // Se já temos uma resposta E este é o campo atual, validar e salvar
    if (hasUserResponse && isCurrentField) {
      // Validar o campo
      const validation = this.validateField(field, userMessage);

      if (!validation.valid) {
        // Dado inválido - retornar erro e manter no mesmo node
        // Usar mensagem de erro personalizada do node se disponível, senão usar a mensagem padrão da validação
        // Verificar tanto em node.content quanto em node.data (legacy)
        const customErrorMessage = (node as any).data?.errorMessage || node.content.errorMessage;
        const errorMessage = customErrorMessage || validation.error || `⚠️ Dado inválido. ${prompt}`;
        console.log(`🔧 DATA_COLLECTION - Campo "${field}" inválido: "${userMessage}". Erro: ${errorMessage}`);
        return {
          nextNodeId: node.id, // Manter no mesmo node
          response: errorMessage,
          shouldStop: true // Parar para aguardar nova resposta
        };
      }

      // Dado válido - salvar o valor coletado (usar valor normalizado se disponível)
      if (!this.context.userData.collectedData) {
        this.context.userData.collectedData = {};
      }
      this.context.userData.collectedData[field] = validation.normalizedValue || userMessage.trim();

      // Limpar o campo de coleta atual
      delete this.context.userData.collectingField;

      // Avançar para o próximo node
      const connections = this.connections.get(node.id);
      const nextNodeId = connections && connections.length > 0 ? connections[0].targetId : undefined;

      console.log(`🔧 DATA_COLLECTION - Campo "${field}" coletado e validado: "${validation.normalizedValue || userMessage.trim()}". Avançando para: ${nextNodeId}`);

      return {
        nextNodeId,
        response: '' // Não enviar resposta, apenas avançar
      };
    }

    // Se já coletamos este campo antes, pular para o próximo (não deve acontecer, mas por segurança)
    if (this.context.userData.collectedData?.[field] && !isCurrentField) {
      const connections = this.connections.get(node.id);
      const nextNodeId = connections && connections.length > 0 ? connections[0].targetId : undefined;
      console.log(`🔧 DATA_COLLECTION - Campo "${field}" já foi coletado, pulando para: ${nextNodeId}`);
      return {
        nextNodeId,
        response: ''
      };
    }

    // Se não temos resposta ainda E não estamos coletando outro campo, definir o campo e aguardar
    // IMPORTANTE: Só definir collectingField se não há outro campo sendo coletado
    if (!currentCollectingField || currentCollectingField === field) {
      this.context.userData.collectingField = field;

      const connections = this.connections.get(node.id);
      const nextNodeId = connections && connections.length > 0 ? connections[0].targetId : undefined;

      console.log(`🔧 DATA_COLLECTION - Aguardando campo "${field}". Próximo nó configurado: ${nextNodeId}`);

      const lastBot = (this.context.conversationHistory || []).filter(h => h.role === 'bot').slice(-1)[0]?.content || '';
      const lastNormalized = lastBot.toLowerCase();
      const promptNormalized = String(prompt || '').toLowerCase();
      const alreadyAsked = promptNormalized && lastNormalized.includes(promptNormalized);

      return {
        nextNodeId: undefined,
        response: alreadyAsked ? '' : prompt
      };
    }

    // Se estamos coletando outro campo, não fazer nada neste node
    console.log(`🔧 DATA_COLLECTION - Ignorando node "${node.id}" porque estamos coletando "${currentCollectingField}"`);
    return {
      nextNodeId: undefined,
      response: '',
      shouldStop: true
    };
  }

  private async executeCollectInfoNode(node: WorkflowNode): Promise<NodeExecutionResult> {
    const fields = node.content.fields || [];
    const message = node.content.message || 'Aguarde enquanto processo suas informações...';

    // Check if we're in the middle of collecting information
    const currentField = this.context.userData.currentCollectField;
    const collectedData = this.context.userData.collectedData || {};
    try {
      if (this.context.userData.isSchedulingIntent && !this.context.userData.registrationChecked) {
        const { api } = await import('../lib/utils');
        const res = await api.get('/api/patients', { params: { search: this.context.phone } });
        const list = (res.data && res.data.patients) || [];
        const phoneDigits = String(this.context.phone || '').replace(/\D/g, '');
        const pat = list.find((p: any) => String(p.phone || '').replace(/\D/g, '') === phoneDigits);
        if (pat) {
          this.context.userData._patientId = pat.id;
          this.context.userData.patientName = pat.name;
          this.context.userData.patientInsurance = pat.insuranceCompany;
        }
        const isDefaultName = !pat?.name || /^Paciente\s+\d+/.test(String(pat?.name || ''));
        const registrationComplete = !!pat && !!pat.insuranceCompany && !isDefaultName;
        this.context.userData.registrationComplete = registrationComplete;
        this.context.userData.registrationChecked = true;
      }
    } catch { }

    if (currentField) {
      let input = (this.context.message || '').trim();
      if (currentField === 'birth_date') {
        const raw = input.replace(/\s+/g, '');
        const dm = raw.match(/^([0-3]?\d)[\/-]([01]?\d)[\/-](\d{4})$/);
        if (!dm) {
          return { nextNodeId: undefined, response: '⚠️ Informe a data no formato DD/MM/AAAA. Ex: 15/08/1990', shouldStop: true };
        }
        const d = dm[1].padStart(2, '0');
        const m = dm[2].padStart(2, '0');
        const y = dm[3];
        input = `${y}-${m}-${d}`;
      }
      if (currentField === 'phone') {
        const lower = input.toLowerCase().trim();
        if (['sim', 's', 'yes', 'y'].includes(lower)) {
          input = String(this.context.phone || '').replace(/\D/g, '');
        } else if (['nao', 'não', 'n', 'no'].includes(lower)) {
          return { nextNodeId: undefined, response: '📱 Informe o telefone com DDD (ex.: 92 9XXXX-XXXX).', shouldStop: true };
        } else {
          const digits = input.replace(/\D/g, '');
          if (digits.length < 10 || digits.length > 11) {
            return { nextNodeId: undefined, response: '⚠️ Informe um número válido com DDD (10 ou 11 dígitos). Ex.: 92 9XXXX-XXXX.', shouldStop: true };
          }
          input = digits;
        }
      }
      if (currentField === 'preferred_shift') {
        const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const valid = ['manha', 'manhã', 'tarde', 'noite'];
        const ok = valid.includes(normalized);
        if (!ok) {
          return { nextNodeId: undefined, response: '⚠️ Informe um turno válido: Manhã, Tarde ou Noite.', shouldStop: true };
        }
      }
      if (currentField === 'insurance') {
        const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalized !== 'particular') {
          try {
            const { api } = await import('../lib/utils');
            const insRes = await api.get('/api/appointments/insurances');
            const list = insRes.data || [];

            // Use fuzzy matching to find closest insurance
            const match = this.findClosestInsurance(input, list);

            if (match) {
              // Store the corrected insurance name
              input = match.displayName || match.name;
              this.context.userData.insuranceMatch = match;
              collectedData[currentField] = input;
            }

            const procId = this.context.userData._procedureId || '';
            const covers = !procId || (match && Array.isArray(match.procedures) && match.procedures.includes(procId));
            if (!match || !covers) {
              const acceptedList = Array.isArray(list) ? list : [];
              const acceptedForProc = procId ? acceptedList.filter((i: any) => Array.isArray(i.procedures) && i.procedures.includes(procId)).map((i: any) => i.displayName || i.name).join(', ') : '';
              const hasProc = !!collectedData['procedure_type'];
              const procName = collectedData['procedure_type'] || '';
              const msg = !match ? `Não encontrei este convênio. Digite "particular" ou informe um convênio aceito.` : (hasProc && acceptedForProc ? `Este convênio não cobre ${procName}. Convênios aceitos: ${acceptedForProc}. Se preferir, digite "particular".` : `Convênio informado não localizado. Digite "particular" ou informe um convênio aceito.`);
              return {
                nextNodeId: undefined,
                response: msg,
                shouldStop: true
              };
            }
          } catch { }
        }
      }

      // Allow skipping email
      if (currentField === 'email') {
        const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalized.includes('nao') || normalized.includes('não') || normalized === 'n') {
          collectedData[currentField] = '';
          this.context.userData.collectedData = collectedData;
        }
      }

      if (currentField === 'personal_data_confirmation') {
        const choice = input.trim();
        if (choice === '0') {
          // Confirm personal data and SAVE to system
          const collectedData = this.context.userData.collectedData || {};
          const nm = String(collectedData['name'] || '').trim();
          const em = String(collectedData['email'] || '').trim();
          const bd = String(collectedData['birth_date'] || '').trim();
          const ins = String(collectedData['insurance'] || 'Particular').trim();

          // Save patient data to system
          try {
            const { api } = await import('../lib/utils');
            const pid = this.context.userData._patientId;
            if (pid) {
              const payload: any = {
                name: nm,
                preferences: { registrationComplete: true }
              };
              if (bd) payload.birthDate = bd;
              if (em) payload.email = em;
              if (ins && ins.toLowerCase() !== 'particular') payload.insuranceCompany = ins;

              await api.put(`/api/patients/${pid}`, payload);
              this.context.userData.registrationComplete = true;
              this.context.userData.patientName = nm;
              this.context.userData.patientInsurance = ins;

              // Fetch covered procedures for the insurance
              if (ins && ins.toLowerCase() !== 'particular') {
                try {
                  const clinicCode = this.context.userData.selectedClinic || 'vieiralves';
                  const insRes = await api.get('/api/appointments/insurances');
                  const insList = insRes.data || [];
                  const matchedIns = this.findClosestInsurance(ins, insList);

                  if (matchedIns) {
                    const cipsRes = await api.get(`/api/clinic/clinics/${clinicCode}/insurances/${matchedIns.code}/procedures`);
                    const cips = Array.isArray(cipsRes.data) ? cipsRes.data : (cipsRes.data?.procedures || []);
                    const covered = cips.filter((cip: any) => cip.isActive !== false);
                    const namesAll = covered.map((p: any) => p.procedure?.name || p.name || p.procedureCode || p.code);

                    if (namesAll.length > 0) {
                      this.context.userData.coveredProcedures = namesAll;
                    }
                  }
                } catch (e) {
                  console.error('Error fetching procedures after confirmation', e);
                }
              } else {
                // For particular patients, fetch all clinic procedures
                try {
                  const clinicCode = this.context.userData.selectedClinic || 'vieiralves';
                  const procsAll = await api.get('/api/appointments/procedures').then(r => r.data || []);
                  const namesAll = procsAll.map((p: any) => p.name).filter(Boolean);
                  if (namesAll.length > 0) {
                    this.context.userData.coveredProcedures = namesAll;
                  }
                } catch (e) {
                  console.error('Error fetching procedures for particular', e);
                }
              }
            }
          } catch (e) {
            console.error('Error saving patient data', e);
          }

          // Mark personal data as confirmed
          this.context.userData.personalDataConfirmed = true;
          delete this.context.userData.currentCollectField;
          delete this.context.userData.collectingField;

          // Continue to collect procedure, date, and shift
          return { nextNodeId: undefined, response: '', shouldStop: false };
        } else if (choice === '1') {
          // Change name
          this.context.userData.currentCollectField = 'name';
          this.context.userData.collectingField = 'name';
          delete collectedData['name'];
          this.context.userData.collectedData = collectedData;
          const nameTemplate = await TemplateService.getInterpolatedTemplate('scheduling_name', {});
          return { nextNodeId: undefined, response: nameTemplate || '✍️ Informe seu nome completo:', shouldStop: true };
        } else if (choice === '2') {
          // Change birth date
          this.context.userData.currentCollectField = 'birth_date';
          this.context.userData.collectingField = 'birth_date';
          delete collectedData['birth_date'];
          this.context.userData.collectedData = collectedData;
          const birthTemplate = await TemplateService.getInterpolatedTemplate('scheduling_birthdate', {});
          return { nextNodeId: undefined, response: birthTemplate || '📆 Qual é sua data de nascimento? (Ex: 15/08/1990)', shouldStop: true };
        } else if (choice === '3') {
          // Change email
          this.context.userData.currentCollectField = 'email';
          this.context.userData.collectingField = 'email';
          delete collectedData['email'];
          this.context.userData.collectedData = collectedData;
          const emailTemplate = await TemplateService.getInterpolatedTemplate('scheduling_email', {});
          return { nextNodeId: undefined, response: emailTemplate || '📧 Informe seu email:', shouldStop: true };
        } else if (choice === '4') {
          // Change insurance
          this.context.userData.currentCollectField = 'insurance';
          this.context.userData.collectingField = 'insurance';
          delete collectedData['insurance'];
          this.context.userData.collectedData = collectedData;
          const insuranceTemplate = await TemplateService.getInterpolatedTemplate('scheduling_insurance', {});
          return { nextNodeId: undefined, response: insuranceTemplate || '💳 Qual é seu convênio? (digite "particular" se não tiver)', shouldStop: true };
        } else {
          return { nextNodeId: undefined, response: '⚠️ Opção inválida. Digite o número do campo (1-4) ou 0 para confirmar.', shouldStop: true };
        }
      }

      if (currentField === 'data_confirmation') {
        const choice = input.trim();
        if (choice === '0') {
          // Confirm final appointment data
          this.context.userData.dataConfirmed = true;
          delete this.context.userData.currentCollectField;
          delete this.context.userData.collectingField;
          return { nextNodeId: undefined, response: '', shouldStop: false };
        } else if (choice === '1') {
          // Change name
          this.context.userData.currentCollectField = 'name';
          this.context.userData.collectingField = 'name';
          const nameTemplate = await TemplateService.getInterpolatedTemplate('scheduling_name', {});
          return { nextNodeId: undefined, response: nameTemplate || '✍️ Informe seu nome completo:', shouldStop: true };
        } else if (choice === '2') {
          // Change birth date
          this.context.userData.currentCollectField = 'birth_date';
          this.context.userData.collectingField = 'birth_date';
          const birthTemplate = await TemplateService.getInterpolatedTemplate('scheduling_birthdate', {});
          return { nextNodeId: undefined, response: birthTemplate || '📆 Qual é sua data de nascimento? (Ex: 15/08/1990)', shouldStop: true };
        } else if (choice === '3') {
          // Change email
          this.context.userData.currentCollectField = 'email';
          this.context.userData.collectingField = 'email';
          const emailTemplate = await TemplateService.getInterpolatedTemplate('scheduling_email', {});
          return { nextNodeId: undefined, response: emailTemplate || '📧 Informe seu email:', shouldStop: true };
        } else if (choice === '4') {
          // Change insurance
          this.context.userData.currentCollectField = 'insurance';
          this.context.userData.collectingField = 'insurance';
          const insuranceTemplate = await TemplateService.getInterpolatedTemplate('scheduling_insurance', {});
          return { nextNodeId: undefined, response: insuranceTemplate || '💳 Qual é seu convênio? (digite "particular" se não tiver)', shouldStop: true };
        } else {
          return { nextNodeId: undefined, response: '⚠️ Opção inválida. Digite o número do campo (1-4) ou 0 para confirmar.', shouldStop: true };
        }
      }

      if (currentField === 'procedure_type') {
        const num = Number(input);
        const list: string[] = Array.isArray(this.context.userData.coveredProcedures) ? this.context.userData.coveredProcedures : [];
        if (!isNaN(num) && num >= 1 && num <= list.length) {
          input = String(list[num - 1] || input);
        }
      }
      collectedData[currentField] = input;
      this.context.userData.collectedData = collectedData;

      // Update patient registration if we just collected name or insurance
      if (this.context.userData.isSchedulingIntent && !this.context.userData.registrationComplete) {
        const nameNow = (collectedData['name'] || this.context.userData.patientName || '').trim();
        const insNowRaw = (collectedData['insurance'] || this.context.userData.patientInsurance || '').trim();

        // Only update patient if we have both name and insurance collected
        const hasNameAndInsurance = nameNow && insNowRaw;

        if (hasNameAndInsurance) {
          try {
            const { api } = await import('../lib/utils');
            const pidNow = this.context.userData._patientId;
            if (pidNow) {
              const payload: any = { preferences: { registrationComplete: true } };
              if (nameNow) payload.name = nameNow;
              if (insNowRaw && insNowRaw.toLowerCase() !== 'particular') payload.insuranceCompany = insNowRaw;
              await api.put(`/api/patients/${pidNow}`, payload);
              this.context.userData.registrationComplete = true;
              this.context.userData.patientName = nameNow;
              this.context.userData.patientInsurance = insNowRaw;

              // Fetch and display covered procedures after registration is complete
              // CRITICAL FIX: Fetch patient from database to get the ACTUAL normalized insurance
              let convDisplay = 'Particular';
              try {
                const patientFromDb = await api.get(`/api/patients/${pidNow}`);
                const dbPatient = patientFromDb.data;
                if (dbPatient && dbPatient.insuranceCompany) {
                  convDisplay = dbPatient.insuranceCompany;
                  console.log(`✅ [WORKFLOW-2] Fetched insurance from DB: "${convDisplay}" for patient ${nameNow}`);
                } else {
                  convDisplay = insNowRaw && insNowRaw.toLowerCase() !== 'particular' ? insNowRaw : 'Particular';
                  console.log(`⚠️ [WORKFLOW-2] No insurance in DB, using context: "${convDisplay}"`);
                }
              } catch (dbError) {
                console.error(`❌ [WORKFLOW-2] Error fetching patient from DB:`, dbError);
                convDisplay = insNowRaw && insNowRaw.toLowerCase() !== 'particular' ? insNowRaw : 'Particular';
              }

              let coveredList = '';

              if (convDisplay !== 'Particular') {
                try {
                  // IMPORTANT: Use clinicData.ts as source of truth instead of API
                  const { clinicData } = await import('../data/clinicData');

                  // Filter procedures that are covered by this insurance
                  const coveredProcedures = clinicData.procedures.filter(proc =>
                    proc.convenios.includes(convDisplay)
                  );

                  if (coveredProcedures.length > 0) {
                    const namesAll = coveredProcedures.map(p => p.name);
                    coveredList = namesAll.map((n: string, idx: number) => `${idx + 1}. ${n}`).join('\n');
                    this.context.userData.coveredProcedures = namesAll;

                    console.log(`✅ [WORKFLOW-2] Found ${namesAll.length} procedures for ${convDisplay} from clinicData.ts`);
                  } else {
                    console.log(`⚠️ [WORKFLOW-2] No procedures found for ${convDisplay} in clinicData.ts`);
                  }
                } catch (e) {
                  console.error('Error loading procedures from clinicData:', e);
                }
              } else {
                try {
                  // For particular patients, show all available procedures
                  const { clinicData } = await import('../data/clinicData');
                  const namesAll = clinicData.procedures.map(p => p.name).filter(Boolean);
                  if (namesAll.length > 0) {
                    coveredList = namesAll.map((n: string, idx: number) => `${idx + 1}. ${n}`).join('\n');
                    this.context.userData.coveredProcedures = namesAll;
                  }
                } catch (e) {
                  console.error('Error loading procedures from clinicData:', e);
                }
              }

              // Store procedures list for later, but continue collecting remaining fields
              if (coveredList) {
                // Store the procedures list to show when asking for procedure_type
                this.context.userData.coveredProcedures = coveredList.split('\n').map((line: string) => {
                  const match = line.match(/^\d+\.\s+(.+)$/);
                  return match ? match[1].trim() : line.trim();
                }).filter(Boolean);
                // Don't return here - let the code continue to determine next field
                // The confirmation message will be set in responseOut below
              }
            }
          } catch (e) {
            console.error('Error updating patient during collection:', e);
          }
        }
      }
    }

    // Determine which fields still need to be collected for scheduling
    const needsRegName = this.context.userData.isSchedulingIntent && (!this.context.userData.patientName || /^Paciente\s+\d+/.test(String(this.context.userData.patientName || '')));
    const needsRegInsurance = this.context.userData.isSchedulingIntent && !this.context.userData.patientInsurance;

    // Build the complete list of required fields for appointment scheduling
    const requiredFields: string[] = [];
    if (needsRegName && !collectedData['name']) requiredFields.push('name');
    if (needsRegInsurance && !collectedData['insurance']) requiredFields.push('insurance');

    // First collect personal data (birth_date, email), then show confirmation
    // After confirmation, collect appointment details (procedure_type, preferred_date, preferred_shift)
    const personalDataFields = ['birth_date', 'email'];
    const appointmentDetailsFields = ['procedure_type', 'preferred_date', 'preferred_shift'];

    // Check if personal data is complete (for first confirmation)
    const personalDataComplete = collectedData['name'] && collectedData['insurance'] &&
      collectedData['birth_date'] && collectedData['email'] !== undefined;

    if (!personalDataComplete) {
      // Still collecting personal data
      for (const field of personalDataFields) {
        if (!collectedData[field] && field !== 'email' || (field === 'email' && collectedData[field] === undefined)) {
          requiredFields.push(field);
        }
      }
    } else if (!this.context.userData.personalDataConfirmed) {
      // Personal data complete but not confirmed yet - show confirmation
      // Don't add more fields, will show confirmation below
    } else {
      // Personal data confirmed, now collect appointment details
      for (const field of appointmentDetailsFields) {
        if (!collectedData[field]) {
          requiredFields.push(field);
        }
      }
    }

    const remainingFields = requiredFields;

    if (remainingFields.length > 0) {
      const nextField = remainingFields[0];
      this.context.userData.currentCollectField = nextField;
      this.context.userData.collectingField = nextField;

      let prompt = '';
      switch (nextField) {
        case 'phone': {
          const phoneDisplay = String(this.context.phone || '').replace(/\D/g, '')
          prompt = `📱 Deseja usar este número do WhatsApp (${phoneDisplay})? Digite "sim" para confirmar ou informe outro telefone com DDD (ex.: 92 9XXXX-XXXX).`;
          break;
        }
        case 'name': {
          const template = await TemplateService.getInterpolatedTemplate('scheduling_name', {});
          prompt = template || '✍️ Informe seu nome completo:';
          break;
        }
        case 'insurance': {
          const template = await TemplateService.getInterpolatedTemplate('scheduling_insurance', {});
          prompt = template || '💳 Qual é seu convênio? (digite "particular" se não tiver)';
          break;
        }
        case 'birth_date': {
          const template = await TemplateService.getInterpolatedTemplate('scheduling_birthdate', {});
          prompt = template || '📆 Qual é sua data de nascimento? (Ex: 15/08/1990)';
          break;
        }
        case 'email': {
          const template = await TemplateService.getInterpolatedTemplate('scheduling_email', {});
          prompt = template || '📧 Informe seu email (ou digite "não tenho" para pular):';
          break;
        }
        case 'procedure_type': {
          // Show procedures list if available
          const coveredProcs = this.context.userData.coveredProcedures || [];
          let proceduresMsg = '';
          if (Array.isArray(coveredProcs) && coveredProcs.length > 0) {
            proceduresMsg = '\n\n📋 Procedimentos disponíveis:\n' +
              coveredProcs.map((proc: string, idx: number) => `${idx + 1}. ${proc}`).join('\n') + '\n';
          }
          const template = await TemplateService.getInterpolatedTemplate('scheduling_procedure', {});
          prompt = (template || '📝 Qual procedimento você deseja? Você pode digitar o nome ou o número da lista.') + proceduresMsg;
          break;
        }
        case 'preferred_date': {
          const template = await TemplateService.getInterpolatedTemplate('scheduling_date', {});
          prompt = template || '📅 Qual data preferida para sua consulta? (Ex: 15/12/2024)';
          break;
        }
        case 'preferred_shift': {
          const template = await TemplateService.getInterpolatedTemplate('scheduling_shift', {});
          prompt = template || '🕐 Qual turno prefere? (Manhã, Tarde ou Noite)';
          break;
        }
        default:
          prompt = `ℹ️ Por favor, informe seu ${nextField}:`;
      }

      return {
        nextNodeId: undefined,
        response: prompt,
        shouldStop: true
      };
    } else {
      delete this.context.userData.currentCollectField;
      let responseOut = message;
      try {
        const { api } = await import('../lib/utils');
        const pid = this.context.userData._patientId;
        const name = collectedData['name'] || this.context.userData.patientName || '';
        const insuranceRaw = collectedData['insurance'] || this.context.userData.patientInsurance || '';
        const birthIso = collectedData['birth_date'] || '';
        if (!this.context.userData.registrationComplete && pid && (name || insuranceRaw)) {
          const payload: any = {};
          if (name) payload.name = name;
          if (insuranceRaw && insuranceRaw.toLowerCase() !== 'particular') payload.insuranceCompany = insuranceRaw;
          if (birthIso) payload.birthDate = birthIso;
          payload.preferences = { registrationComplete: true };
          await api.put(`/api/patients/${pid}`, payload);
          this.context.userData.registrationComplete = true;
          this.context.userData.patientName = name;
          this.context.userData.patientInsurance = insuranceRaw;

          // CRITICAL FIX: Fetch patient from database to get the ACTUAL normalized insurance
          // This ensures we use the insurance that was saved, not what's in context
          let convDisplay = 'Particular';
          try {
            const patientFromDb = await api.get(`/api/patients/${pid}`);
            const dbPatient = patientFromDb.data;
            if (dbPatient && dbPatient.insuranceCompany) {
              convDisplay = dbPatient.insuranceCompany;
              console.log(`✅ [WORKFLOW] Fetched insurance from DB: "${convDisplay}" for patient ${name}`);
            } else {
              convDisplay = insuranceRaw && insuranceRaw.toLowerCase() !== 'particular' ? insuranceRaw : 'Particular';
              console.log(`⚠️ [WORKFLOW] No insurance in DB, using context: "${convDisplay}"`);
            }
          } catch (dbError) {
            console.error(`❌ [WORKFLOW] Error fetching patient from DB:`, dbError);
            convDisplay = insuranceRaw && insuranceRaw.toLowerCase() !== 'particular' ? insuranceRaw : 'Particular';
          }

          let coveredList = '';
          if (convDisplay !== 'Particular') {
            try {
              // IMPORTANT: Use clinicData.ts as source of truth instead of API
              const { clinicData } = await import('../data/clinicData');

              // Filter procedures that are covered by this insurance
              const coveredProcedures = clinicData.procedures.filter(proc =>
                proc.convenios.includes(convDisplay)
              );

              if (coveredProcedures.length > 0) {
                const namesAll = coveredProcedures.map(p => p.name);
                coveredList = namesAll.map((n: string, idx: number) => `${idx + 1}. ${n}`).join('\n');
                this.context.userData.coveredProcedures = namesAll;

                console.log(`✅ Found ${namesAll.length} procedures for ${convDisplay} from clinicData.ts`);
              } else {
                console.log(`⚠️ No procedures found for ${convDisplay} in clinicData.ts`);
              }
            } catch (e) {
              console.error('Error loading procedures from clinicData:', e);
            }
          } else {
            try {
              // For particular patients, show all available procedures
              const { clinicData } = await import('../data/clinicData');
              const namesAll = clinicData.procedures.map(p => p.name).filter(Boolean);
              if (namesAll.length > 0) {
                coveredList = namesAll.map((n: string, idx: number) => `${idx + 1}. ${n}`).join('\n');
                this.context.userData.coveredProcedures = namesAll;
              }
            } catch (e) {
              console.error('Error loading procedures from clinicData:', e);
            }
          }
          // Store covered procedures but don't show them yet - they'll be shown when asking for procedure_type
          if (coveredList) {
            // Store procedures list for later use
            this.context.userData.coveredProcedures = coveredList.split('\n').map((line: string) => {
              const match = line.match(/^\d+\.\s+(.+)$/);
              return match ? match[1].trim() : line.trim();
            }).filter(Boolean);
          }
          responseOut = `Cadastro concluído, ${name}. Identifiquei seu convênio ${convDisplay}.`;
        }
      } catch { }

      // Check if personal data is complete (name, insurance, birth_date, email)
      const personalDataComplete = collectedData['name'] && collectedData['insurance'] &&
        collectedData['birth_date'] && collectedData['email'] !== undefined;

      // Show personal data confirmation first (before asking for procedure)
      if (personalDataComplete && !this.context.userData.personalDataConfirmed) {
        const nm = String(collectedData['name'] || '').trim();
        const em = String(collectedData['email'] || '').trim();
        const bd = String(collectedData['birth_date'] || '').trim();
        const ins = String(collectedData['insurance'] || 'Particular').trim();

        // Format birth date for display
        let bdDisplay = bd;
        if (bd && bd.includes('-')) {
          const [y, m, d] = bd.split('-');
          bdDisplay = `${d}/${m}/${y}`;
        }

        // Show confirmation message
        this.context.userData.currentCollectField = 'personal_data_confirmation';
        this.context.userData.collectingField = 'personal_data_confirmation';
        const confirmContext: TemplateContext = {
          nome: nm,
          data_nascimento: bdDisplay,
          email: em || undefined,
          convenio: ins
        };
        const confirmationTemplate = await TemplateService.getInterpolatedTemplate('scheduling_confirm', confirmContext);
        const confirmationMsg = confirmationTemplate || `📋 *Confirme seus dados pessoais:*\n\n1. Nome: ${nm}\n2. Data de Nascimento: ${bdDisplay}\n3. Email: ${em || 'Não informado'}\n4. Convênio: ${ins}\n\n*Deseja alterar algum dado?*\n\nDigite o número do campo que deseja alterar (1-4) ou digite *0* para confirmar e prosseguir.`;
        return { nextNodeId: undefined, response: confirmationMsg, shouldStop: true };
      }

      const summaryReady = collectedData['procedure_type'] && collectedData['preferred_date'] && collectedData['preferred_shift'];
      if (summaryReady) {
        // Check if already confirmed
        if (!this.context.userData.dataConfirmed) {
          const issues: string[] = []
          const nm = String(collectedData['name'] || '').trim()
          const em = String(collectedData['email'] || '').trim()
          const cpf = String(collectedData['cpf'] || '').trim()
          const bd = String(collectedData['birth_date'] || '').trim()
          if (!nm || !this.isLikelyName(nm)) issues.push('Nome inválido')
          if (em && !this.isValidEmail(em)) issues.push('Email inválido')
          if (cpf && !this.isValidCPF(cpf)) issues.push('CPF inválido')
          if (bd && !this.isValidBirthDate(bd)) issues.push('Nascimento inválido')
          if (issues.length > 0) {
            const nextField = !nm || !this.isLikelyName(nm) ? 'name' : (em && !this.isValidEmail(em) ? 'email' : (cpf && !this.isValidCPF(cpf) ? 'cpf' : 'birth_date'))
            this.context.userData.currentCollectField = nextField
            this.context.userData.collectingField = nextField
            let msg = '⚠️ Dados inconsistentes: ' + issues.join(', ') + '. '
            switch (nextField) {
              case 'name': msg += 'Informe seu nome completo.'; break
              case 'email': msg += 'Informe um email válido.'; break
              case 'cpf': msg += 'Informe um CPF válido.'; break
              case 'birth_date': msg += 'Informe sua data de nascimento no formato DD/MM/AAAA.'; break
            }
            return { nextNodeId: undefined, response: msg, shouldStop: true }
          }

          // Show final confirmation with procedure, date and shift
          this.context.userData.currentCollectField = 'data_confirmation';
          this.context.userData.collectingField = 'data_confirmation';

          // Format dates for display
          let bdDisplay = bd;
          if (bd && bd.includes('-')) {
            const [y, m, d] = bd.split('-');
            bdDisplay = `${d}/${m}/${y}`;
          }

          let dateDisplay = String(collectedData['preferred_date'] || '');
          if (dateDisplay && dateDisplay.includes('-')) {
            const [y, m, d] = dateDisplay.split('-');
            dateDisplay = `${d}/${m}/${y}`;
          }

          const procName = String(collectedData['procedure_type'] || '');
          const shiftName = String(collectedData['preferred_shift'] || '');

          const confirmContext: TemplateContext = {
            nome: nm,
            data_nascimento: bdDisplay,
            email: em || undefined,
            convenio: collectedData['insurance'] || 'Particular',
            procedimento: procName,
            data_preferida: dateDisplay,
            turno: shiftName
          };
          const confirmationTemplate = await TemplateService.getInterpolatedTemplate('scheduling_confirm_final', confirmContext);
          const confirmationMsg = confirmationTemplate || `📋 *Confirme seu agendamento:*\n\n*Dados Pessoais:*\n1. Nome: ${nm}\n2. Data de Nascimento: ${bdDisplay}\n3. Email: ${em || 'Não informado'}\n4. Convênio: ${collectedData['insurance'] || 'Particular'}\n\n*Agendamento:*\n5. Procedimento: ${procName}\n6. Data: ${dateDisplay}\n7. Turno: ${shiftName}\n\n*Deseja alterar algum dado?*\n\nDigite o número do campo que deseja alterar ou digite *0* para confirmar e finalizar.`;
          return { nextNodeId: undefined, response: confirmationMsg, shouldStop: true };
        }

        // All confirmed - save final intent
        const clinicCode = this.context.userData.selectedClinic || '';
        const intent = {
          clinic: clinicCode,
          insurance: (this.context.userData.patientInsurance || '').toString(),
          procedure: String(collectedData['procedure_type'] || ''),
          date: String(collectedData['preferred_date'] || ''),
          shift: String(collectedData['preferred_shift'] || '')
        };
        this.context.userData.intentReady = true;
        this.context.userData.intentSummary = intent;

        // Format dates for display
        let dateDisplay = String(collectedData['preferred_date'] || '');
        if (dateDisplay && dateDisplay.includes('-')) {
          const [y, m, d] = dateDisplay.split('-');
          dateDisplay = `${d}/${m}/${y}`;
        }

        const successContext: TemplateContext = {
          procedimento: intent.procedure,
          data_preferida: dateDisplay,
          turno: intent.shift
        };
        const successTemplate = await TemplateService.getInterpolatedTemplate('scheduling_success', successContext);
        responseOut = successTemplate || `✅ Agendamento confirmado!\n\n📋 *Resumo do agendamento:*\n\nProcedimento: ${intent.procedure}\nData: ${dateDisplay}\nTurno: ${intent.shift}\n\nVou encaminhar para nossa equipe entrar em contato para confirmar o horário.`;
        // All fields collected and confirmed - can delete currentCollectField now
        delete this.context.userData.currentCollectField;
        delete this.context.userData.collectingField;
      }

      // If we still have fields to collect, don't stop - continue collecting
      // Check if currentCollectField is set (meaning we're still collecting)
      const stillCollecting = !!this.context.userData.currentCollectField;
      return { nextNodeId: undefined, response: responseOut, shouldStop: !stillCollecting };
    }
  }

  private isValidEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  }
  private isLikelyName(v: string): boolean {
    const s = v.trim()
    if (s.length < 3) return false
    if (/\d/.test(s)) return false
    return s.split(/\s+/).length >= 2
  }
  private isValidCPF(cpf: string): boolean {
    const c = cpf.replace(/\D/g, '')
    if (c.length !== 11) return false
    if (/^(\d)\1{10}$/.test(c)) return false
    let sum = 0
    for (let i = 1; i <= 9; i++) sum += parseInt(c.substring(i - 1, i)) * (11 - i)
    let r = (sum * 10) % 11
    if (r === 10 || r === 11) r = 0
    if (r !== parseInt(c.substring(9, 10))) return false
    sum = 0
    for (let i = 1; i <= 10; i++) sum += parseInt(c.substring(i - 1, i)) * (12 - i)
    r = (sum * 10) % 11
    if (r === 10 || r === 11) r = 0
    return r === parseInt(c.substring(10, 11))
  }
  private isValidBirthDate(iso: string): boolean {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return false
    const now = new Date()
    if (d > now) return false
    const age = Math.floor((now.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
    return age >= 10 && age <= 120
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  private findClosestInsurance(input: string, insurances: any[]): any | null {
    const normalizedInput = this.normalizeText(input);

    // Exact match first
    const exact = insurances.find(ins =>
      this.normalizeText(ins.name) === normalizedInput ||
      this.normalizeText(ins.displayName) === normalizedInput ||
      this.normalizeText(ins.code) === normalizedInput
    );

    if (exact) return exact;

    // Fuzzy match with distance threshold
    let closest = null;
    let minDistance = Infinity;

    for (const ins of insurances) {
      const distances = [
        this.levenshteinDistance(normalizedInput, this.normalizeText(ins.name)),
        this.levenshteinDistance(normalizedInput, this.normalizeText(ins.displayName)),
        this.levenshteinDistance(normalizedInput, this.normalizeText(ins.code))
      ];

      const distance = Math.min(...distances);

      // Allow up to 3 character differences for fuzzy matching
      if (distance < minDistance && distance <= 3) {
        minDistance = distance;
        closest = ins;
      }
    }

    return closest;
  }

  private async executeApiCallNode(node: WorkflowNode): Promise<NodeExecutionResult> {
    const endpoint = node.content.endpoint || '';
    const message = node.content.message || 'Processando informações...';

    try {
      let response = '';
      const clinicCode = this.context.userData.selectedClinic;
      const userMessage = this.context.message.toLowerCase();

      switch (endpoint) {
        case 'get_clinic_procedures':
          response = await this.getClinicProcedures(clinicCode, userMessage);
          break;
        case 'get_clinic_insurances':
          response = await this.getClinicInsurances(clinicCode, userMessage);
          break;
        case 'get_clinic_location':
          response = await this.getClinicLocation(clinicCode);
          break;
        default:
          response = 'Informações não disponíveis no momento.';
      }

      const connections = this.connections.get(node.id);
      const nextNodeId = connections && connections.length > 0 ? connections[0].targetId : undefined;

      const final = await this.interpolateMessage(response || message);
      return { nextNodeId, response: final };
    } catch (error) {
      console.error('Erro ao executar API call:', error);
      const connections = this.connections.get(node.id);
      const nextNodeId = connections && connections.length > 0 ? connections[0].targetId : undefined;

      return {
        nextNodeId,
        response: 'Desculpe, não consegui buscar as informações no momento. Por favor, tente novamente mais tarde.'
      };
    }
  }

  private async getClinicProcedures(clinicCode: string, userMessage: string): Promise<string> {
    // Extract procedure name from user message
    const procedures = [
      'acupuntura', 'fisioterapia', 'rpg', 'pilates', 'quiropraxia',
      'consulta médica', 'avaliação', 'tratamento', 'sessão'
    ];
    const foundProcedure = procedures.find(proc => userMessage.includes(proc));
    let procedureCode = foundProcedure || 'fisioterapia';
    if (procedureCode === 'fisioterapia') procedureCode = 'fisioterapia-ortopedica';
    if (procedureCode === 'pilates') procedureCode = 'pilates-solo';

    try {
      const { api } = await import('../lib/utils');
      const proceduresRes = await api.get('/api/clinic/procedures?q=&page=1&limit=1000');
      const proceduresData = (proceduresRes.data && proceduresRes.data.procedures) || [];

      if (!proceduresData || proceduresData.length === 0) {
        return `❌ Desculpe, não consegui encontrar informações sobre procedimentos para a unidade ${clinicCode}.`;
      }

      // Find the specific procedure
      const procedure = proceduresData.find((p: any) =>
        ((p.name || p.code || p.procedureCode || '').toLowerCase().includes(procedureCode.toLowerCase()))
      );

      if (!procedure) {
        // Show all available procedures
        const availableProcedures = proceduresData.map((p: any) =>
          `• ${(p.name || p.procedureCode)}`
        ).join('\n');

        return `Na unidade ${clinicCode}, temos os seguintes procedimentos disponíveis:

${availableProcedures}

Por favor, escolha um procedimento da lista acima.`;
      }

      let result = `Na unidade ${clinicCode}, informações para ${(procedure.name || procedure.procedureCode)}:\n`;
      if (procedure.basePrice) {
        result += `💰 Valor: R$ ${Number(procedure.basePrice).toFixed(2)}`;
      }
      result += '\n\n📋 Convênios: consulte cobertura disponível.';
      try {
        const { api } = await import('../lib/utils');
        const packagesRes = await api.get('/api/appointments/packages');
        const deals = packagesRes.data || [];
        const applicable = deals.filter((d: any) => Array.isArray(d.validProcedures) && d.validProcedures.includes(procedure.code));
        if (applicable.length > 0) {
          const lines = applicable.map((d: any) => `• ${d.name} — ${d.sessions} sessões, pacote R$ ${Number(d.packagePrice).toFixed(2)}`).join('\n');
          result += `\n\n🎁 Pacotes disponíveis:\n${lines}`;
        }
      } catch { }
      result += '\n\nPosso verificar os convênios aceitos ou agendar um horário se quiser!';

      return result;

    } catch (error) {
      console.error('Erro ao buscar procedimentos da clínica:', error);
      return `❌ Desculpe, não consegui buscar os valores dos procedimentos no momento. Por favor, entre em contato diretamente com a unidade ${clinicCode}.`;
    }
  }

  private async getClinicInsurances(clinicCode: string, userMessage: string = ''): Promise<string> {
    const normalized = (userMessage || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const brands = [
      'bradesco', 'sulamerica', 'unimed', 'amil', 'hapvida', 'mediservice', 'saude caixa', 'caixa', 'petrobras', 'geap', 'pro social',
      'postal saude', 'conab', 'affeam', 'ambep', 'gama', 'life', 'notredame', 'oab', 'capesaude', 'casembrapa', 'clubsaude', 'cultural',
      'evida', 'fogas', 'fusex', 'plan-assite', 'planassite', 'adepol', 'bem care', 'bemol', 'pro saude', 'pro-saude', 'vita'
    ];
    const mentionsBrand = brands.some(b => normalized.includes(b));
    if (mentionsBrand) {
      return '📋 Convênios\n\nConfirmamos que atendemos ao seu convênio ${convenio_x}.\n\nProcedimentos cobertos:\n1️⃣ ${procedimento_1}\n2️⃣ ${procedimento_2}\n3️⃣ ${procedimento_3}\n\nDeseja agendar ou consultar valores?';
    }
    try {
      const { api } = await import('../lib/utils');
      const insurancesRes = await api.get(`/api/clinic/clinics/${clinicCode}/insurances`);
      const insurancesData = insurancesRes.data?.insurances || insurancesRes.data || [];

      if (!insurancesData || insurancesData.length === 0) {
        return `❌ Desculpe, não consegui encontrar informações sobre convênios para a unidade ${clinicCode}.`;
      }

      // Format the response with insurance information
      let result = `📋 **Convênios aceitos na unidade ${clinicCode}:**\n\n`;
      result += `✅ **Particular**\n`;
      result += `   • Pagamento direto na clínica\n`;

      insurancesData.forEach((insurance: any) => {
        result += `✅ **${insurance.displayName || insurance.name || insurance.insuranceCode}**\n`;
      });

      result += 'Se você tiver algum convênio específico, posso verificar os valores com cobertura!';

      return result;

    } catch (error) {
      console.error('Erro ao buscar convênios da clínica:', error);
      return `❌ Desculpe, não consegui buscar as informações de convênios no momento. Por favor, entre em contato diretamente com a unidade ${clinicCode}.`;
    }
  }

  private async getClinicLocation(clinicCode: string): Promise<string> {
    try {
      const { api } = await import('../lib/utils');
      const locationsRes = await api.get('/api/appointments/locations');
      const clinicData = (locationsRes.data || []).find((l: any) => (l.id || '').includes(clinicCode));

      if (!clinicData) {
        return `❌ Desculpe, não consegui encontrar informações sobre a unidade ${clinicCode}.`;
      }

      // Format the response with clinic location information
      let result = `📍 **Localização da Unidade ${clinicData.name}:**\n\n`;
      result += `📌 **Endereço:** ${clinicData.address}\n`;
      result += `📞 **Telefone:** ${clinicData.phone}\n`;

      // Add opening hours if available
      if (clinicData.openingHours) {
        result += '\n🕐 **Horário de funcionamento:**\n';
        Object.entries(clinicData.openingHours).forEach(([day, hours]) => {
          result += `• ${day}: ${hours}\n`;
        });
      }

      // Add specialties if available
      if (clinicData.specialties && Array.isArray(clinicData.specialties)) {
        result += '\n🏥 **Especialidades:**\n';
        clinicData.specialties.forEach((specialty: string) => {
          result += `• ${specialty}\n`;
        });
      }

      // Add accessibility features if available
      if (clinicData.accessibility && typeof clinicData.accessibility === 'object') {
        result += '\n♿ **Acessibilidade:**\n';
        Object.entries(clinicData.accessibility).forEach(([feature, available]) => {
          if (available) {
            result += `• ${feature}\n`;
          }
        });
      }

      // Add parking information
      if (clinicData.parkingAvailable) {
        result += '\n🚗 **Estacionamento disponível**\n';
      }

      // Add coordinates/maps link if available
      const mapsUrl = clinicData.mapUrl || (clinicData.coordinates ? `https://maps.google.com/?q=${encodeURIComponent(clinicData.address)}` : '');
      if (mapsUrl) {
        result += `\n🗺️ **Como chegar:** ${mapsUrl}\n`;
      }

      return result;

    } catch (error) {
      console.error('Erro ao buscar informações da clínica:', error);
      return `❌ Desculpe, não consegui buscar as informações de localização no momento. Por favor, entre em contato diretamente com a unidade ${clinicCode}.`;
    }
  }

  private executeTransferHumanNode(node: WorkflowNode): NodeExecutionResult {
    const message = node.content.finalMessage || '🤝 Transferindo para atendimento humano...';

    return {
      response: message,
      shouldStop: true
    };
  }

  private async executeDelayNode(node: WorkflowNode): Promise<NodeExecutionResult> {
    const delay = node.content.delay || 1;
    await new Promise(resolve => setTimeout(resolve, delay * 1000));

    const connections = this.connections.get(node.id);
    const nextNodeId = connections && connections.length > 0 ? connections[0].targetId : undefined;

    return {
      nextNodeId
    };
  }

  private executeEndNode(node: WorkflowNode): NodeExecutionResult {
    const message = node.content.finalMessage || node.content.message || '✅ Obrigado por entrar em contato!';

    return {
      response: message,
      shouldStop: true
    };
  }

  private async executeWebhookNode(node: WorkflowNode): Promise<NodeExecutionResult> {
    const url = node.content.url || '';
    const method = node.content.method || 'POST';

    // Simulate webhook call
    console.log(`Calling webhook: ${method} ${url}`);

    return {
      nextNodeId: this.getNextNode(node.id)
    };
  }

  private getNextNode(currentNodeId: string): string | undefined {
    const connections = this.connections.get(currentNodeId);
    if (!connections || connections.length === 0) {
      return undefined;
    }

    // Handle continue/end conversation flow
    if (currentNodeId === 'continue_conversation') {
      const lowerMessage = this.context.message.toLowerCase();
      if (lowerMessage.includes('não') || lowerMessage.includes('nao') || lowerMessage.includes('nada') || lowerMessage.includes('obrigado')) {
        // Find connection with "end" condition
        return connections.find(c => c.condition === 'end')?.targetId || connections[0].targetId;
      } else {
        // Find connection with "continue" condition
        return connections.find(c => c.condition === 'continue')?.targetId || connections[0].targetId;
      }
    }

    // Return first connection for simplicity
    return connections[0].targetId;
  }

  private addToHistory(role: 'user' | 'bot', content: string) {
    this.context.conversationHistory.push({
      role,
      content,
      timestamp: new Date()
    });
  }

  getContext(): WorkflowExecutionContext {
    return this.context;
  }

  setCurrentNodeId(nodeId: string): void {
    console.log(`🔧 Setting current node ID: ${nodeId}`);
    this.context.currentNodeId = nodeId;
  }

  setUserResponse(message: string) {
    this.context.message = message;
    this.addToHistory('user', message);

    // Não processar aqui - deixar o executeDataCollectionNode processar quando executar
    // Isso garante que o campo seja salvo no collectedData corretamente
  }

  // Execute complete workflow
  async execute(): Promise<{ responses: string[]; context: WorkflowExecutionContext }> {
    const responses: string[] = [];

    while (true) {
      const result = await this.executeNextNode();

      if (result.response) {
        responses.push(result.response);
      }

      if (result.shouldStop || !result.nextNodeId) {
        break;
      }
    }

    return {
      responses,
      context: this.context
    };
  }
}
