import OpenAI from 'openai'
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
    this.nodes = new Map(nodes.map(node => [node.id, node]));
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
            this.context.currentNodeId = chained.nextNodeId || nextNode.id;
            chained.shouldStop = true;
            return chained;
          }
        }
        result.shouldStop = true;
        if (result.nextNodeId) this.context.currentNodeId = result.nextNodeId;
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
      case 'END':
      case 'TRANSFER_HUMAN':
        // These nodes should definitely stop
        result.shouldStop = true;
        break;
      default:
        // Other nodes can continue if they have a next node
        if (result.nextNodeId) {
          this.context.currentNodeId = result.nextNodeId;
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
        return this.executeConditionNode(node);
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
    
    const welcomeMessage = `Olá! Em qual unidade você gostaria de ser atendido(a)?
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
    if (node.id === 'gpt_welcome') {
      raw = 'Você pode perguntar sobre consultas, nossos procedimentos ou convênios. Se quiser agendar, diga que quer agendar.';
    }
    const lastBot = [...this.context.conversationHistory].reverse().find(h => h.role === 'bot');
    const isDuplicate = lastBot && String(lastBot.content || '').trim() === String(raw).trim();
    const normalized = this.normalizeText(this.context.message || '');
    const intentPrice = ['valor','preco','preço','quanto','custa','orcamento','particular','pacote'].some(k => normalized.includes(k)) || !!this.findProcedureKeyword(normalized);
    const intentIns = normalized.includes('convenio') || normalized.includes('convênio') || normalized.includes('planos') || normalized.includes('plano') || normalized.includes('seguros') || normalized.includes('seguro');
    const intentLoc = normalized.includes('localizacao') || normalized.includes('localização') || normalized.includes('endereco') || normalized.includes('endereço') || normalized.includes('onde') || normalized.includes('como chegar');
    const intentBook = normalized.includes('agendar') || normalized.includes('marcar') || normalized.includes('consulta');
    const intentHuman = normalized.includes('atendente') || normalized.includes('humano') || normalized.includes('falar');
    const shouldSkip = ((node.id === 'service_menu' || node.id === 'gpt_welcome') || (node.type === 'MESSAGE' && intentBook)) && (intentPrice || intentIns || intentLoc || intentBook || intentHuman);
    const response = (isDuplicate || shouldSkip) ? '' : await this.interpolateMessage(raw);
    if (response) this.addToHistory('bot', response);
    const connections = this.connections.get(node.id);
    const nextNodeId = connections && connections.length > 0 ? connections[0].targetId : undefined;
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
        const candidates = ['acupuntura','fisioterapia','rpg','pilates','quiropraxia','ventosaterapia','liberacao miofascial','pilates solo','pilates aparelhos'];
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
          const price = (proc.priceByLocation && proc.priceByLocation[clinicCode]) ? proc.priceByLocation[clinicCode] : proc.basePrice;
          out = out.replace('${procedimento_x}', proc.name || proc.code || 'Procedimento')
                   .replace('${valor_procedimento}', `R$ ${Number(price).toFixed(2)}`)
                   .replace('${duracao_procedimento}', `${proc.duration} minutos`)
                   .replace('${observacao_procedimento}', proc.requiresEvaluation ? 'Requer avaliação prévia' : 'Não requer avaliação');
          try {
            const deals = await api.get('/api/appointments/packages').then(r => r.data || []);
            const clinicCode = this.context.userData.selectedClinic || 'vieiralves';
            const applicable = deals.filter((d: any) => {
              const matchesProc = Array.isArray(d.validProcedures) && (d.validProcedures.includes(proc.id) || d.validProcedures.includes(proc.code));
              const matchesLocation = !d.applicableLocations || (Array.isArray(d.applicableLocations) && d.applicableLocations.includes(clinicCode));
              return matchesProc && matchesLocation;
            });
            if (applicable.length > 0) {
              const lines = applicable.map((d: any) => `• ${d.name} — ${d.sessions} sessões, pacote R$ ${Number(d.packagePrice).toFixed(2)}`).join('\n');
              out += `\n\n🎁 Pacotes disponíveis:\n${lines}`;
            }
          } catch {}
        }
      }

      if (out.includes('${convenio_x}') || out.includes('${procedimento_1}') || out.includes('${procedimento_2}') || out.includes('${procedimento_3}')) {
        const { api } = await import('../lib/utils');
        const ins = await api.get('/api/appointments/insurances').then(r => r.data || []);
        const normalized = lower.normalize('NFD').replace(/[^a-z0-9\s]/g, '').replace(/[\u0300-\u036f]/g, '');
        const match = ins.find((i: any) => {
          const names = [i.code, i.name, i.displayName].filter(Boolean).map((s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
          return names.some((n: string) => normalized.includes(n));
        }) || ins[0];
        const convenioName = match?.displayName || match?.name || match?.code || 'Convênio';
        out = out.replace('${convenio_x}', convenioName);
        const list = Array.isArray(match?.procedures) ? match.procedures : [];
        const procsAll = await api.get('/api/appointments/procedures').then(r => r.data || []);
        const nameMap = new Map(procsAll.map((p: any) => [p.id || p.code, p.name]));
        const top3 = list.slice(0,3).map((id: string) => nameMap.get(id) || id);
        out = out.replace('${procedimento_1}', top3[0] || '')
                 .replace('${procedimento_2}', top3[1] || '')
                 .replace('${procedimento_3}', top3[2] || '');
      }

      if (out.includes('${unidade_nome}') || out.includes('${endereco}') || out.includes('${horario_atendimento}') || out.includes('${telefone}') || out.includes('${maps_url}')) {
        const clinicCode = this.context.userData.selectedClinic || 'vieiralves';
        const { api } = await import('../lib/utils');
        const locs = await api.get('/api/appointments/locations').then(r => r.data || []);
        const loc = locs.find((l: any) => (l.id || '').includes(clinicCode)) || locs[0];
        if (loc) {
          const hours = loc.openingHours ? Object.entries(loc.openingHours).map(([d,h]: any) => `${d}: ${h}`).join(', ') : '';
          out = out.replace('${unidade_nome}', loc.name || clinicCode)
                   .replace('${endereco}', loc.address || '')
                   .replace('${horario_atendimento}', hours || '')
                   .replace('${telefone}', loc.phone || '')
                   .replace('${maps_url}', loc.mapUrl || '');
        }
      }
    } catch {}
    return out;
  }

  private executeConditionNode(node: WorkflowNode): NodeExecutionResult {
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
          responseMessage = '✅ Você escolheu a Unidade Vieiralves! Como posso ajudar você?';
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
          responseMessage = '✅ Você escolheu a Unidade São José! Como posso ajudar você?';
          nextNodeId = connections.find(c => c.port === 'true')?.targetId;
          return { nextNodeId, response: responseMessage };
        }
        responseMessage = node.content.finalMessage || 'Por favor, escolha uma de nossas unidades.';
        nextNodeId = connections.find(c => c.port === 'false')?.targetId;
        return { nextNodeId, response: responseMessage };
        
      case 'service_selection':
        const trimmed = lowerMessage.trim();
        const normalizedSel = this.normalizeText(this.context.message);
        const mentionsProcedure = ['acupuntura','fisioterapia','rpg','pilates','quiropraxia','ventosa','miofascial','liberacao miofascial','pilates solo','pilates aparelhos'].some(k => lowerMessage.includes(k)) || !!this.findProcedureKeyword(normalizedSel);
        const matchedProc = ['acupuntura','fisioterapia','rpg','pilates','quiropraxia','ventosaterapia','liberacao miofascial','pilates solo','pilates aparelhos'].find(k => lowerMessage.includes(k)) || this.findProcedureKeyword(normalizedSel);
        if (matchedProc) { this.context.userData.lastProcedure = matchedProc; }
        if (trimmed === '1' || lowerMessage.includes('valor') || lowerMessage.includes('preço') || lowerMessage.includes('quanto') || mentionsProcedure) {
          nextNodeId = connections.find(c => c.port === '1')?.targetId;
        } else if (trimmed === '2' || lowerMessage.includes('convênio') || lowerMessage.includes('plano') || lowerMessage.includes('seguro')) {
          nextNodeId = connections.find(c => c.port === '2')?.targetId;
        } else if (trimmed === '3' || lowerMessage.includes('local') || lowerMessage.includes('endereço') || lowerMessage.includes('como chegar')) {
          nextNodeId = connections.find(c => c.port === '3')?.targetId;
        } else if (trimmed === '4' || lowerMessage.includes('agendar') || lowerMessage.includes('marcar') || lowerMessage.includes('consulta')) {
          this.context.userData.isSchedulingIntent = true;
          nextNodeId = connections.find(c => c.port === '4')?.targetId;
        } else if (trimmed === '5' || lowerMessage.includes('atendente') || lowerMessage.includes('humano') || lowerMessage.includes('falar')) {
          nextNodeId = connections.find(c => c.port === '5')?.targetId;
        } else {
          const gptConn = connections.find(c => {
            const node = this.nodes.get(c.targetId);
            return node && node.type === 'GPT_RESPONSE';
          });
          nextNodeId = gptConn?.targetId || connections.find(c => c.port === '1')?.targetId || connections.find(c => c.port === 'main')?.targetId || connections[0]?.targetId;
        }
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
        // Simulate patient search
        this.context.userData.patientFound = true;
        this.context.userData.patientName = 'João Silva';
        break;
      case 'schedule_appointment':
        // Simulate appointment scheduling
        this.context.userData.appointmentScheduled = true;
        break;
      case 'send_confirmation':
        // Simulate confirmation sending
        break;
    }

    const connections = this.connections.get(node.id);
    const nextNodeId = connections && connections.length > 0 ? connections[0].targetId : undefined;
    
    return {
      nextNodeId
    };
  }

  private async executeGPTResponseNode(node: WorkflowNode): Promise<NodeExecutionResult> {
    const systemPrompt = node.content.systemPrompt || 'Você é um assistente de atendimento médico.';
    const userMessage = this.context.message || '';
    const normalized = this.normalizeText(userMessage);
    const connections = this.connections.get(node.id) || [];
    let nextNodeId: string | undefined;
    let response = '';

    const apiKey = process.env.OPENAI_API_KEY || '';
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const timeout = Number(process.env.OPENAI_TIMEOUT) || 20000;

    // Classificação imediata por palavras-chave para evitar atraso
    if (!nextNodeId) {
      const priceSyn = ['valor','preco','quanto','custa','orcamento','particular','pacote'];
      const hasPriceIntent = priceSyn.some(s => normalized.includes(s));
      const hasProcIntent = !!this.findProcedureKeyword(normalized) || ['fisioterapia','acupuntura','rpg','pilates','quiropraxia'].some(s => normalized.includes(s));
      if (hasPriceIntent || hasProcIntent) {
        nextNodeId = connections.find(c => c.port === '1')?.targetId;
        response = 'Entendi. Vou te ajudar com os valores dos procedimentos.';
        const lp = this.findProcedureKeyword(normalized);
        if (lp) this.context.userData.lastProcedure = lp;
      } else if (normalized.includes('convenio') || normalized.includes('convenios') || normalized.includes('plano') || normalized.includes('seguros') || normalized.includes('seguro')
        || normalized.includes('bradesco') || normalized.includes('sulamerica') || normalized.includes('unimed') || normalized.includes('amil') || normalized.includes('hapvida')
        || normalized.includes('mediservice') || normalized.includes('saude caixa') || normalized.includes('caixa') || normalized.includes('petrobras') || normalized.includes('geap')
        || normalized.includes('pro social') || normalized.includes('postal saude') || normalized.includes('conab') || normalized.includes('affeam') || normalized.includes('ambep')
        || normalized.includes('gama') || normalized.includes('life') || normalized.includes('notredame') || normalized.includes('oab') || normalized.includes('capesaude')
        || normalized.includes('casembrapa') || normalized.includes('clubsaude') || normalized.includes('cultural') || normalized.includes('evida') || normalized.includes('fogas')
        || normalized.includes('fusex') || normalized.includes('plan-assite') || normalized.includes('planassite') || normalized.includes('adepol') || normalized.includes('bem care')
        || normalized.includes('bemol') || normalized.includes('pro saude') || normalized.includes('pro-saude') || normalized.includes('vita')) {
        nextNodeId = connections.find(c => c.port === '2')?.targetId;
        response = 'Certo. Vou verificar os convênios aceitos na sua unidade.';
      } else if (normalized.includes('localizacao') || normalized.includes('endereco') || normalized.includes('como chegar') || normalized.includes('onde')) {
        nextNodeId = connections.find(c => c.port === '3')?.targetId;
        response = 'Ok. Vou te passar a localização e horários.';
      } else if (normalized.includes('agendar') || normalized.includes('marcar') || normalized.includes('consulta')) {
        this.context.userData.isSchedulingIntent = true;
        nextNodeId = connections.find(c => c.port === '4')?.targetId;
        response = 'Vamos agendar sua consulta. Vou coletar algumas informações.';
      } else if (normalized.includes('atendente') || normalized.includes('humano') || normalized.includes('falar')) {
        nextNodeId = connections.find(c => c.port === '5')?.targetId;
        response = '🤝 Vou transferir você para um atendente humano.';
      }
    }

    // Se não houver match rápido, usar GPT para classificar
    if (!nextNodeId && apiKey) {
      try {
        const client = new OpenAI({ apiKey });
        const prompt = `${systemPrompt}\n\nClassifique a intenção do usuário em uma das opções: 1) valores de procedimentos, 2) convênios, 3) localização/horários, 4) agendamento, 5) falar com atendente.\nInclua um campo de confiança entre 0 e 1.\n\nRetorne um JSON no formato {\"intent_port\":\"<1|2|3|4|5>\",\"brief\":\"<mensagem curta>\",\"confidence\":<0..1>}.\n\nPergunta: \"${userMessage}\"`;
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'Responda apenas com JSON válido sem texto extra.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0,
          max_tokens: 100
        }, { timeout });
        const content = completion.choices?.[0]?.message?.content || '';
        let parsed: any = {};
        try { parsed = JSON.parse(content); } catch { parsed = {}; }
        const port = String(parsed.intent_port || '').trim();
        const brief = String(parsed.brief || '').trim();
        const confidence = Number(parsed.confidence ?? 0.5);
        const threshold = Number(process.env.GPT_CONFIDENCE_THRESHOLD || 0.6);
        if (['1','2','3','4','5'].includes(port)) {
          if (confidence >= threshold) {
            nextNodeId = connections.find(c => c.port === port)?.targetId || connections[0]?.targetId;
            response = response || brief || 'Entendi.';
          } else {
            response = '🔎 Só para confirmar: deseja saber sobre valores, convênios, localização ou agendar? Responda com 1, 2, 3 ou 4.';
            const svcNode = Array.from(this.nodes.values()).find(n => n.type === 'CONDITION' && (n.content?.condition || '').toLowerCase() === 'service_selection');
            nextNodeId = svcNode?.id || connections.find(c => c.port === '1')?.targetId || connections[0]?.targetId;
          }
        }
      } catch {}
    }

    // Fallback final
    if (!nextNodeId) {
      response = response || '📋 Posso te ajudar com valores, convênios, localização ou agendamento. Sobre o que você gostaria de saber?';
      nextNodeId = connections.find(c => c.port === '1')?.targetId || connections[0]?.targetId;
    }

    this.addToHistory('bot', response);
    return { nextNodeId, response };
  }

  private executeDataCollectionNode(node: WorkflowNode): NodeExecutionResult {
    const field = node.content.field || '';
    const prompt = node.content.prompt || `Por favor, informe seu ${field}:`;
    
    // Store the field being collected
    this.context.userData.collectingField = field;
    
    const connections = this.connections.get(node.id);
    const nextNodeId = connections && connections.length > 0 ? connections[0].targetId : undefined;
    
    return {
      nextNodeId,
      response: prompt
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
    } catch {}
    
    if (currentField) {
      let input = (this.context.message || '').trim();
      if (currentField === 'preferred_shift') {
        const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const valid = ['manha','manhã','tarde','noite'];
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
            const match = list.find((i: any) => {
              const ni = String(i.id || '').toLowerCase();
              const nn = String(i.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              const nd = String(i.displayName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              return normalized === ni || normalized === nn || normalized === nd;
            });
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
          } catch {}
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

      if (this.context.userData.isSchedulingIntent && !this.context.userData.registrationComplete) {
        const nameNow = (collectedData['name'] || this.context.userData.patientName || '').trim();
        const insNowRaw = (collectedData['insurance'] || this.context.userData.patientInsurance || '').trim();
        if (nameNow && insNowRaw) {
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
              let convDisplay = insNowRaw && insNowRaw.toLowerCase() !== 'particular' ? insNowRaw : 'Particular';
              let coveredList = '';
              if (convDisplay !== 'Particular') {
                try {
                  const insRes = await api.get('/api/appointments/insurances');
                  const insFound = (insRes.data || []).find((i: any) => {
                    const ni = String(i.id || '').toLowerCase();
                    const nn = String(i.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const nd = String(i.displayName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const inNorm = insNowRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    return inNorm === ni || inNorm === nn || inNorm === nd;
                  });
                  const procsAll = await api.get('/api/appointments/procedures').then(r => r.data || []);
                  const nameMap = new Map(procsAll.map((p: any) => [p.id || p.code, p.name]));
                  const list = Array.isArray(insFound?.procedures) ? insFound!.procedures.slice(0, 3) : [];
                  const names = list.map((id: string) => nameMap.get(id) || id).filter(Boolean);
                  if (names.length > 0) {
                    coveredList = names.map((n: string, idx: number) => `${idx + 1}. ${n}`).join('\n');
                    this.context.userData.coveredProcedures = names;
                  }
                } catch {}
              }
              if (coveredList) {
                this.context.userData.currentCollectField = 'procedure_type';
                this.context.userData.collectingField = 'procedure_type';
              }
              const msgOut = coveredList ? `Cadastro concluído, ${nameNow}. Identifiquei seu convênio ${convDisplay}.\n\nProcedimentos cobertos conosco:\n${coveredList}\n\nDeseja agendar algum destes?` : `Cadastro concluído, ${nameNow}. Podemos seguir com seu agendamento.`;
              return { nextNodeId: undefined, response: msgOut, shouldStop: true };
            }
          } catch {}
        }
      }
    }
    
    const needsRegName = this.context.userData.isSchedulingIntent && !this.context.userData.registrationComplete && (!this.context.userData.patientName || /^Paciente\s+\d+/.test(String(this.context.userData.patientName || '')));
    const needsRegInsurance = this.context.userData.isSchedulingIntent && !this.context.userData.registrationComplete && !this.context.userData.patientInsurance;
    const regFields: string[] = [];
    if (needsRegName && !collectedData['name']) regFields.push('name');
    if (needsRegInsurance && !collectedData['insurance']) regFields.push('insurance');
    const effectiveFields = [...regFields, 'procedure_type', 'preferred_date', 'preferred_shift'];
    const remainingFields = effectiveFields.filter(field => !collectedData[field]);
    
    if (remainingFields.length > 0) {
      const nextField = remainingFields[0];
      this.context.userData.currentCollectField = nextField;
      this.context.userData.collectingField = nextField;
      
      let prompt = '';
      switch (nextField) {
        case 'name':
          prompt = '✍️ Informe seu nome completo:';
          break;
        case 'insurance':
          prompt = '💳 Qual é seu convênio? (digite "particular" se não tiver)';
          break;
        case 'procedure_type':
          prompt = '📝 Qual procedimento você deseja? Você pode digitar o nome ou o número da lista enviada.';
          break;
        case 'preferred_date':
          prompt = '📅 Qual data preferida para sua consulta? (Ex: 15/12/2024)';
          break;
        case 'preferred_shift': {
          prompt = '🕐 Qual turno prefere? (Manhã, Tarde ou Noite)';
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
        if (!this.context.userData.registrationComplete && pid && (name || insuranceRaw)) {
          const payload: any = {};
          if (name) payload.name = name;
          if (insuranceRaw && insuranceRaw.toLowerCase() !== 'particular') payload.insuranceCompany = insuranceRaw;
          payload.preferences = { registrationComplete: true };
          await api.put(`/api/patients/${pid}`, payload);
          this.context.userData.registrationComplete = true;
          this.context.userData.patientName = name;
          this.context.userData.patientInsurance = insuranceRaw;
          let convDisplay = insuranceRaw && insuranceRaw.toLowerCase() !== 'particular' ? insuranceRaw : 'Particular';
          let coveredList = '';
          if (convDisplay !== 'Particular') {
            try {
              const insRes = await api.get('/api/appointments/insurances');
              const ins = (insRes.data || []).find((i: any) => {
                const ni = String(i.id || '').toLowerCase();
                const nn = String(i.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const nd = String(i.displayName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const inNorm = (insuranceRaw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return inNorm === ni || inNorm === nn || inNorm === nd;
              });
              const procsAll = await api.get('/api/appointments/procedures').then(r => r.data || []);
              const nameMap = new Map(procsAll.map((p: any) => [p.id || p.code, p.name]));
              const list = Array.isArray(ins?.procedures) ? ins!.procedures.slice(0, 3) : [];
              const names = list.map((id: string) => nameMap.get(id) || id).filter(Boolean);
              if (names.length > 0) {
                coveredList = names.map((n: string, idx: number) => `${idx + 1}. ${n}`).join('\n');
              }
            } catch {}
          }
          if (convDisplay !== 'Particular') {
            try {
              const insRes2 = await api.get('/api/appointments/insurances');
              const ins2 = (insRes2.data || []).find((i: any) => {
                const ni = String(i.id || '').toLowerCase();
                const nn = String(i.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const nd = String(i.displayName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const inNorm = (insuranceRaw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return inNorm === ni || inNorm === nn || inNorm === nd;
              });
              const procsAll2 = await api.get('/api/appointments/procedures').then(r => r.data || []);
              const nameMap2 = new Map(procsAll2.map((p: any) => [p.id || p.code, p.name]));
              const listAll = Array.isArray(ins2?.procedures) ? ins2!.procedures : [];
              const namesAll = listAll.map((id: string) => nameMap2.get(id) || id).filter(Boolean);
              if (namesAll.length > 0) {
                coveredList = namesAll.map((n: string, idx: number) => `${idx + 1}. ${n}`).join('\n');
                this.context.userData.coveredProcedures = namesAll;
              }
            } catch {}
          } else {
            try {
              const procsAll3 = await api.get('/api/appointments/procedures').then(r => r.data || []);
              const clinicCode = this.context.userData.selectedClinic || 'vieiralves';
              const namesAll = procsAll3.map((p: any) => p.name).filter(Boolean);
              if (namesAll.length > 0) {
                coveredList = namesAll.map((n: string, idx: number) => `${idx + 1}. ${n}`).join('\n');
                this.context.userData.coveredProcedures = namesAll;
              }
            } catch {}
          }
          if (coveredList) {
            this.context.userData.currentCollectField = 'procedure_type';
            this.context.userData.collectingField = 'procedure_type';
          }
          responseOut = coveredList ? `Cadastro concluído, ${name}. Identifiquei seu convênio ${convDisplay}.\n\nProcedimentos disponíveis:\n${coveredList}\n\nDigite o número ou nome do procedimento.` : `Cadastro concluído, ${name}. Podemos seguir com seu agendamento.`;
        }
      } catch {}
      const summaryReady = collectedData['procedure_type'] && collectedData['preferred_date'] && collectedData['preferred_shift'];
      if (summaryReady) {
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
        responseOut = `✅ Intenção registrada: ${intent.procedure} em ${intent.date} (${intent.shift}). Vou encaminhar para nossa equipe.`;
      }
      return { nextNodeId: undefined, response: responseOut, shouldStop: true };
    }
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
    const procedureCode = foundProcedure || 'fisioterapia';
    
    try {
      const { api } = await import('../lib/utils');
      const proceduresRes = await api.get('/api/clinic/procedures?q=&page=1&limit=1000');
      const proceduresData = (proceduresRes.data && proceduresRes.data.procedures) || [];
      
      if (!proceduresData || proceduresData.length === 0) {
        return `❌ Desculpe, não consegui encontrar informações sobre procedimentos para a unidade ${clinicCode}.`;
      }
      
      // Find the specific procedure
      const procedure = proceduresData.find((p: any) => 
        (p.name || p.code || '').toLowerCase().includes(procedureCode.toLowerCase())
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
      } catch {}
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
      'bradesco','sulamerica','unimed','amil','hapvida','mediservice','saude caixa','caixa','petrobras','geap','pro social',
      'postal saude','conab','affeam','ambep','gama','life','notredame','oab','capesaude','casembrapa','clubsaude','cultural',
      'evida','fogas','fusex','plan-assite','planassite','adepol','bem care','bemol','pro saude','pro-saude','vita'
    ];
    const mentionsBrand = brands.some(b => normalized.includes(b));
    if (mentionsBrand) {
      return '📋 Convênios\n\nConfirmamos que atendemos ao seu convênio ${convenio_x}.\n\nProcedimentos cobertos:\n1️⃣ ${procedimento_1}\n2️⃣ ${procedimento_2}\n3️⃣ ${procedimento_3}\n\nDeseja agendar ou consultar valores?';
    }
    try {
      const { api } = await import('../lib/utils');
      const insurancesRes = await api.get('/api/appointments/insurances');
      const insurancesData = insurancesRes.data || [];
      
      if (!insurancesData || insurancesData.length === 0) {
        return `❌ Desculpe, não consegui encontrar informações sobre convênios para a unidade ${clinicCode}.`;
      }
      
      // Format the response with insurance information
      let result = `📋 **Convênios aceitos na unidade ${clinicCode}:**\n\n`;
      result += `✅ **Particular**\n`;
      result += `   • Pagamento direto na clínica\n`;
      
      insurancesData.forEach((insurance: any) => {
        result += `✅ **${insurance.name || insurance.insuranceCode}**\n`;
        if (insurance.coveragePercentage) {
          result += `   • Cobertura: ${insurance.coveragePercentage}%\n`;
        }
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
    
    // If collecting data, store it
    if (this.context.userData.collectingField) {
      this.context.userData[this.context.userData.collectingField] = message;
      delete this.context.userData.collectingField;
    }
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
