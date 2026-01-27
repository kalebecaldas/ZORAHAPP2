#!/usr/bin/env tsx
/**
 * Script para aplicar migrações no Railway com baseline automático
 * 
 * Fluxo:
 * 1. Tenta aplicar migrações normalmente
 * 2. Se erro P3005 (banco não vazio sem migrações), faz baseline
 * 3. Aplica apenas migrações novas (como nossa lastAgentActivity)
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function runMigrations() {
  try {
    console.log('🔄 Tentando aplicar migrações...')
    
    // Tentar aplicar migrações normalmente
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy')
    console.log(stdout)
    if (stderr) console.error(stderr)
    
    console.log('✅ Migrações aplicadas com sucesso!')
    
  } catch (error: any) {
    const errorMessage = error.message || error.toString()
    
    // Se erro P3005 (banco não vazio), fazer baseline
    if (errorMessage.includes('P3005') || errorMessage.includes('database schema is not empty')) {
      console.log('⚠️  Banco não está vazio e precisa de baseline...')
      console.log('📝 Fazendo baseline das migrações antigas...')
      
      try {
        // Marcar todas as migrações EXCETO a nossa nova como aplicadas
        // Lista de migrações antigas (até 20251125220000_remove_aiconfig)
        const oldMigrations = [
          '20251115012004_init_schema',
          '20251115195251_clinic_models',
          '20251115204154_interactions_ai',
          '20251115211102_roles_audit',
          '20251115225240_add_conversation_workflow_state',
          '20251118141937_add_package_fields_to_clinic_procedure',
          '20251118143058_add_is_particular_to_insurance',
          '20251118151517_add_defaults_on_insurance_procedure_and_is_active',
          '20251118161253_refactor_procedures_and_insurances',
          '20251121045418_add_clinic_procedure_model',
          '20251121115200_add_important_info_and_discount_percentage',
          '20251121145523_add_templates',
          '20251125220000_remove_aiconfig'
        ]
        
        console.log(`📋 Marcando ${oldMigrations.length} migrações antigas como aplicadas...`)
        
        for (const migration of oldMigrations) {
          try {
            await execAsync(`npx prisma migrate resolve --applied ${migration}`)
            console.log(`  ✓ ${migration}`)
          } catch (resolveError: any) {
            // Se já foi aplicada, ignorar erro
            if (resolveError.message.includes('already been applied')) {
              console.log(`  ✓ ${migration} (já aplicada)`)
            } else {
              console.log(`  ⚠️  ${migration} (erro, mas continuando)`)
            }
          }
        }
        
        console.log('✅ Baseline concluído!')
        console.log('🔄 Aplicando novas migrações...')
        
        // Agora aplicar novas migrações (nossa lastAgentActivity)
        const { stdout: deployStdout, stderr: deployStderr } = await execAsync('npx prisma migrate deploy')
        console.log(deployStdout)
        if (deployStderr) console.error(deployStderr)
        
        console.log('✅ Novas migrações aplicadas com sucesso!')
        
      } catch (baselineError: any) {
        console.error('❌ Erro ao fazer baseline:', baselineError.message)
        
        // Fallback: usar db push (funciona mas não é ideal)
        console.log('⚠️  Fallback: usando prisma db push...')
        const { stdout: pushStdout } = await execAsync('npx prisma db push --accept-data-loss=false')
        console.log(pushStdout)
        console.log('⚠️  Schema sincronizado via db push')
      }
      
    } else {
      // Outro erro, relançar
      console.error('❌ Erro ao aplicar migrações:', errorMessage)
      throw error
    }
  }
}

// Executar
runMigrations()
  .then(() => {
    console.log('🎉 Processo de migração concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Falha no processo de migração:', error)
    process.exit(1)
  })
