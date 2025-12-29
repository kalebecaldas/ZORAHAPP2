import prisma from '../api/prisma/client.js'
import fs from 'fs'
import path from 'path'

/**
 * Script de BACKUP antes do deploy no Railway
 * 
 * Este script cria um backup completo do banco de dados antes de qualquer migração
 * 
 * Uso:
 *   npx tsx scripts/railway_backup_before_deploy.ts
 */

async function backupDatabase() {
    console.log('💾 Iniciando backup do banco de dados...\n')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.join(process.cwd(), 'backups')
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`)

    try {
        // Criar diretório de backups se não existir
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true })
            console.log(`📁 Diretório de backups criado: ${backupDir}`)
        }

        console.log('📊 Coletando dados do banco...\n')

        // Backup de todas as tabelas importantes
        const backup: any = {
            timestamp: new Date().toISOString(),
            tables: {}
        }

        // SystemSettings
        console.log('   📋 SystemSettings...')
        backup.tables.systemSettings = await prisma.systemSettings.findMany()

        // ResponseRules
        console.log('   📋 ResponseRules...')
        backup.tables.responseRules = await prisma.responseRule.findMany()

        // ProcedureRules
        console.log('   📋 ProcedureRules...')
        backup.tables.procedureRules = await prisma.procedureRule.findMany()

        // InsuranceRules
        console.log('   📋 InsuranceRules...')
        backup.tables.insuranceRules = await prisma.insuranceRule.findMany()

        // AIConfiguration
        console.log('   📋 AIConfiguration...')
        backup.tables.aiConfiguration = await prisma.aIConfiguration.findMany({
            include: {
                examples: true,
                transferRules: true
            }
        })

        // Procedures (apenas contagem para não ficar muito grande)
        console.log('   📋 Procedures...')
        backup.tables.proceduresCount = await prisma.procedure.count()
        backup.tables.procedures = await prisma.procedure.findMany({
            select: {
                id: true,
                code: true,
                name: true,
                requiresEvaluation: true
            }
        })

        // InsuranceCompanies (apenas contagem)
        console.log('   📋 InsuranceCompanies...')
        backup.tables.insuranceCompaniesCount = await prisma.insuranceCompany.count()
        backup.tables.insuranceCompanies = await prisma.insuranceCompany.findMany({
            select: {
                id: true,
                code: true,
                name: true,
                displayName: true,
                discount: true,
                isParticular: true
            }
        })

        // Clinics (apenas contagem)
        console.log('   📋 Clinics...')
        backup.tables.clinicsCount = await prisma.clinic.count()

        // Users (apenas contagem - não backupar senhas)
        console.log('   📋 Users...')
        backup.tables.usersCount = await prisma.user.count()

        // Conversations (apenas contagem)
        console.log('   📋 Conversations...')
        backup.tables.conversationsCount = await prisma.conversation.count()

        // Messages (apenas contagem)
        console.log('   📋 Messages...')
        backup.tables.messagesCount = await prisma.message.count()

        // Salvar backup
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
        console.log(`\n✅ Backup salvo em: ${backupFile}`)
        console.log(`\n📊 Resumo do backup:`)
        console.log(`   SystemSettings: ${backup.tables.systemSettings.length}`)
        console.log(`   ResponseRules: ${backup.tables.responseRules.length}`)
        console.log(`   ProcedureRules: ${backup.tables.procedureRules.length}`)
        console.log(`   InsuranceRules: ${backup.tables.insuranceRules.length}`)
        console.log(`   Procedures: ${backup.tables.proceduresCount}`)
        console.log(`   InsuranceCompanies: ${backup.tables.insuranceCompaniesCount}`)
        console.log(`   Clinics: ${backup.tables.clinicsCount}`)
        console.log(`   Users: ${backup.tables.usersCount}`)
        console.log(`   Conversations: ${backup.tables.conversationsCount}`)
        console.log(`   Messages: ${backup.tables.messagesCount}`)

        // Criar arquivo de referência com o último backup
        const latestBackupFile = path.join(backupDir, 'latest-backup.json')
        fs.writeFileSync(latestBackupFile, JSON.stringify({ 
            file: backupFile, 
            timestamp: backup.timestamp 
        }, null, 2))
        console.log(`\n📌 Referência ao último backup salva em: ${latestBackupFile}`)

        console.log('\n✅ Backup concluído com sucesso!')
        console.log('\n⚠️  IMPORTANTE: Guarde este backup em local seguro antes de fazer deploy!')

    } catch (error: any) {
        console.error('\n❌ Erro ao fazer backup:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Executar
backupDatabase()
    .then(() => {
        console.log('\n✅ Script de backup concluído!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Erro ao executar backup:', error)
        process.exit(1)
    })
