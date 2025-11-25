import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function reorganizePositions() {
  const wf = await prisma.workflow.findUnique({
    where: { id: 'cmid7w6gf0000xgtvf4j0n0qe' }
  })

  if (!wf) {
    console.log('Workflow não encontrado')
    return
  }

  const cfg = typeof wf.config === 'string' ? JSON.parse(wf.config as any) : (wf.config as any)
  const nodes = cfg.nodes || []
  const edges = cfg.edges || []

  console.log('📐 Reorganizando posições dos nodes...\n')

  // Layout organizado verticalmente por fase
  const COLUMN_WIDTH = 400
  const ROW_HEIGHT = 180
  const START_X = 600
  const START_Y = 50

  // Reorganizar nodes com posições lógicas
  const updatedNodes = nodes.map((node: any) => {
    let x = START_X
    let y = START_Y

    // Fase 1: Escolha da Unidade
    if (node.id === 'start') {
      x = START_X; y = 50
    } else if (node.id === 'clinic_selection') {
      x = START_X; y = 220
    } else if (node.id === 'unidade_vieiralves') {
      x = START_X - 300; y = 390
    } else if (node.id === 'unidade_sao_jose') {
      x = START_X + 300; y = 390
    }
    // Fase 2: GPT Classifier (centro)
    else if (node.id === 'gpt_classifier') {
      x = START_X; y = 560
    }
    // Branch Valores (esquerda superior)
    else if (node.id === 'branch_valores') {
      x = START_X - 800; y = 730
    } else if (node.id === 'valor_fisio_ortopedica') {
      x = START_X - 1200; y = 900
    } else if (node.id === 'valor_fisio_pelvica') {
      x = START_X - 1000; y = 900
    } else if (node.id === 'valor_fisio_neurologica') {
      x = START_X - 800; y = 900
    } else if (node.id === 'valor_acupuntura') {
      x = START_X - 600; y = 900
    } else if (node.id === 'valor_rpg') {
      x = START_X - 400; y = 900
    } else if (node.id === 'valor_pilates') {
      x = START_X - 200; y = 900
    } else if (node.id === 'valor_quiropraxia') {
      x = START_X; y = 900
    } else if (node.id === 'valor_consulta') {
      x = START_X + 200; y = 900
    }
    // Branch Convênios (esquerda inferior)
    else if (node.id === 'info_convenios') {
      x = START_X - 600; y = 730
    } else if (node.id === 'ask_convenio_procedimentos') {
      x = START_X - 600; y = 900
    } else if (node.id === 'convenio_bradesco') {
      x = START_X - 800; y = 1070
    } else if (node.id === 'convenio_sulamerica') {
      x = START_X - 600; y = 1070
    } else if (node.id === 'convenio_outros') {
      x = START_X - 400; y = 1070
    }
    // Branch Localização (centro esquerda)
    else if (node.id === 'info_localizacao') {
      x = START_X - 300; y = 730
    }
    // Branch Explicações (centro direita)
    else if (node.id === 'info_procedimento_explicacao') {
      x = START_X + 300; y = 730
    } else if (node.id === 'explicacao_fisio_ortopedica') {
      x = START_X + 100; y = 900
    } else if (node.id === 'explicacao_acupuntura') {
      x = START_X + 300; y = 900
    } else if (node.id === 'explicacao_rpg') {
      x = START_X + 500; y = 900
    } else if (node.id === 'gpt_faq') {
      x = START_X + 300; y = 1070
    }
    // Branch Transferência (direita)
    else if (node.id === 'transfer_human') {
      x = START_X + 800; y = 730
    }
    // Fase 3: Agendamento (direita, vertical)
    else if (node.id === 'check_patient') {
      x = START_X + 600; y = 730
    } else if (node.id === 'patient_exists') {
      x = START_X + 600; y = 900
    } else if (node.id === 'msg_paciente_encontrado') {
      x = START_X + 400; y = 1070
    } else if (node.id === 'msg_solicita_cadastro') {
      x = START_X + 800; y = 1070
    }
    // Cadastro (direita superior)
    else if (node.id === 'collect_nome') {
      x = START_X + 800; y = 1240
    } else if (node.id === 'collect_cpf') {
      x = START_X + 800; y = 1410
    } else if (node.id === 'collect_nascimento') {
      x = START_X + 800; y = 1580
    } else if (node.id === 'collect_email') {
      x = START_X + 800; y = 1750
    } else if (node.id === 'collect_convenio') {
      x = START_X + 800; y = 1920
    } else if (node.id === 'confirma_cadastro') {
      x = START_X + 800; y = 2090
    } else if (node.id === 'validate_confirmacao') {
      x = START_X + 800; y = 2260
    } else if (node.id === 'create_patient') {
      x = START_X + 600; y = 2430
    } else if (node.id === 'msg_cadastro_sucesso') {
      x = START_X + 600; y = 2600
    } else if (node.id === 'corrigir_cadastro') {
      x = START_X + 1000; y = 2430
    }
    // Escolha de Procedimentos (centro direita)
    else if (node.id === 'ask_procedimentos') {
      x = START_X + 400; y = 2770
    } else if (node.id === 'collect_proc_1') {
      x = START_X + 400; y = 2940
    } else if (node.id === 'ask_proc_2') {
      x = START_X + 400; y = 3110
    } else if (node.id === 'condition_proc_2') {
      x = START_X + 400; y = 3280
    } else if (node.id === 'collect_proc_2') {
      x = START_X + 200; y = 3450
    } else if (node.id === 'ask_proc_3') {
      x = START_X + 200; y = 3620
    } else if (node.id === 'condition_proc_3') {
      x = START_X + 200; y = 3790
    } else if (node.id === 'collect_proc_3') {
      x = START_X; y = 3960
    }
    // Data e Turno (centro)
    else if (node.id === 'show_dates') {
      x = START_X + 300; y = 4130
    } else if (node.id === 'collect_date') {
      x = START_X + 300; y = 4300
    } else if (node.id === 'ask_turno') {
      x = START_X + 300; y = 4470
    } else if (node.id === 'collect_turno') {
      x = START_X + 300; y = 4640
    }
    // Confirmação e Fim (centro)
    else if (node.id === 'resumo_agendamento') {
      x = START_X + 300; y = 4810
    } else if (node.id === 'confirma_agendamento') {
      x = START_X + 300; y = 4980
    } else if (node.id === 'create_appointment') {
      x = START_X + 100; y = 5150
    } else if (node.id === 'fila_aguardando') {
      x = START_X + 100; y = 5320
    } else if (node.id === 'cancelar_agendamento') {
      x = START_X + 500; y = 5150
    } else if (node.id === 'end_success') {
      x = START_X + 300; y = 5490
    }

    return {
      ...node,
      position: { x, y }
    }
  })

  // Atualizar workflow
  await prisma.workflow.update({
    where: { id: 'cmid7w6gf0000xgtvf4j0n0qe' },
    data: {
      config: {
        nodes: updatedNodes,
        edges: edges
      }
    }
  })

  console.log('✅ Posições reorganizadas com sucesso!')
  console.log(`📊 ${updatedNodes.length} nodes atualizados`)
  console.log('\n🔗 Acesse o editor:')
  console.log('   http://localhost:4002/workflows/editor/cmid7w6gf0000xgtvf4j0n0qe')

  await prisma.$disconnect()
}

reorganizePositions().catch(console.error)

