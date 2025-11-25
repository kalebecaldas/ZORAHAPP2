import { PrismaClient } from '@prisma/client'
import pg from 'pg'

const { Client } = pg

async function cloneDatabase() {
  console.log('🚀 Clonando banco de dados do Railway...\n')

  const railwayUrl = process.env.RAILWAY_DATABASE_URL
  const localUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL

  if (!railwayUrl) {
    console.error('❌ Erro: RAILWAY_DATABASE_URL não configurada')
    console.log('\nConfigure:')
    console.log('  export RAILWAY_DATABASE_URL="postgresql://..."')
    process.exit(1)
  }

  if (!localUrl) {
    console.error('❌ Erro: DATABASE_URL local não configurada')
    process.exit(1)
  }

  console.log('📥 Conectando ao banco Railway...')
  // Parse URL para extrair parâmetros SSL
  const railwayUrlObj = new URL(railwayUrl)
  const railwayClient = new Client({ 
    host: railwayUrlObj.hostname,
    port: parseInt(railwayUrlObj.port || '5432'),
    database: railwayUrlObj.pathname.slice(1).split('?')[0],
    user: railwayUrlObj.username,
    password: railwayUrlObj.password,
    ssl: { rejectUnauthorized: false }
  })
  
  console.log('📤 Conectando ao banco local...')
  const localClient = new Client({ connectionString: localUrl })

  try {
    await railwayClient.connect()
    console.log('✅ Conectado ao Railway\n')

    await localClient.connect()
    console.log('✅ Conectado ao banco local\n')

    // Listar todas as tabelas
    console.log('📋 Listando tabelas...')
    const tablesResult = await railwayClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `)

    const tables = tablesResult.rows.map((r: any) => r.table_name)
    console.log(`✅ Encontradas ${tables.length} tabelas:\n${tables.join(', ')}\n`)

    // Ordem de cópia para respeitar foreign keys
    const tableOrder = [
      'User',
      'InsuranceCompany',
      'Procedure',
      'Clinic',
      'Patient',
      'ClinicInsurance',
      'ClinicProcedure',
      'ClinicInsuranceProcedure',
      'Template',
      'Workflow',
      'Conversation',
      'Message',
      'Appointment',
      'PatientInteraction',
      'AuditLog',
      'AILearningData'
    ]

    // Filtrar apenas tabelas que existem
    const orderedTables = tableOrder.filter(t => tables.includes(t))
    // Adicionar tabelas que não estão na ordem
    const remainingTables = tables.filter(t => !orderedTables.includes(t))
    const finalOrder = [...orderedTables, ...remainingTables]

    console.log(`📋 Ordem de cópia: ${finalOrder.join(' → ')}\n`)

    // Para cada tabela, copiar dados
    for (const table of finalOrder) {
      try {
        console.log(`📦 Copiando tabela: ${table}...`)

        // Obter estrutura da tabela
        const structureResult = await railwayClient.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `, [table])

        // Limpar tabela local se existir
        await localClient.query(`TRUNCATE TABLE "${table}" CASCADE;`).catch(() => {
          // Tabela pode não existir ainda, ignorar erro
        })

        // Copiar dados
        const dataResult = await railwayClient.query(`SELECT * FROM "${table}";`)
        
        if (dataResult.rows.length > 0) {
          const columns = Object.keys(dataResult.rows[0])
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
          const columnNames = columns.map(c => `"${c}"`).join(', ')

          for (const row of dataResult.rows) {
            const values = columns.map(col => {
              const value = row[col]
              // Converter objetos/arrays para JSON string se necessário
              if (value !== null && typeof value === 'object') {
                return JSON.stringify(value)
              }
              return value
            })
            
            try {
              await localClient.query(
                `INSERT INTO "${table}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING;`,
                values
              )
            } catch (insertError: any) {
              // Se erro de JSON, tentar inserir valor original
              if (insertError.message.includes('json')) {
                const originalValues = columns.map(col => row[col])
                await localClient.query(
                  `INSERT INTO "${table}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING;`,
                  originalValues
                )
              } else {
                throw insertError
              }
            }
          }

          console.log(`   ✅ ${dataResult.rows.length} registros copiados`)
        } else {
          console.log(`   ℹ️  Tabela vazia`)
        }
      } catch (error: any) {
        console.log(`   ⚠️  Erro ao copiar ${table}: ${error.message}`)
        // Continuar com próxima tabela
      }
    }

    console.log('\n✅ Clone concluído com sucesso!')
    console.log(`\nDados importados para: ${localUrl}`)
    console.log('\nPróximos passos:')
    console.log('1. Verifique os dados: npx prisma studio')
    console.log('2. Inicie o servidor: npm run dev')

  } catch (error: any) {
    console.error('\n❌ Erro:', error.message)
    process.exit(1)
  } finally {
    await railwayClient.end()
    await localClient.end()
  }
}

cloneDatabase()

