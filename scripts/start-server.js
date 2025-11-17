#!/usr/bin/env node

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

// Configuration
const SERVER_PORT = 4001;
const CLIENT_PORT = 4002;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Colors for output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkPort(port) {
  try {
    const { stdout } = await execAsync(`lsof -ti tcp:${port} 2>/dev/null || true`);
    return stdout.trim().length > 0;
  } catch (error) {
    // Fallback for Windows or systems without lsof
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr ":${port} " | findstr "LISTENING" 2>nul || true`);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }
}

async function killPort(port) {
  try {
    // Try Unix first
    const { stdout } = await execAsync(`lsof -ti tcp:${port} 2>/dev/null || true`);
    const pids = stdout.trim().split('\n').filter(pid => pid.length > 0);
    
    if (pids.length > 0) {
      log(`🔒 Porta ${port} em uso. Encerrando processos...`, 'yellow');
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid} 2>/dev/null || true`);
          log(`✅ Processo ${pid} encerrado na porta ${port}`, 'green');
        } catch (error) {
          log(`❌ Falha ao encerrar processo ${pid} na porta ${port}`, 'red');
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    // Fallback for Windows
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr ":${port} " | findstr "LISTENING"`);
      const lines = stdout.trim().split('\n').filter(line => line.length > 0);
      
      if (lines.length > 0) {
        log(`🔒 Porta ${port} em uso. Encerrando processos...`, 'yellow');
        for (const line of lines) {
          const pid = line.trim().split(/\s+/).pop();
          if (pid) {
            try {
              await execAsync(`taskkill /F /PID ${pid}`);
              log(`✅ Processo ${pid} encerrado na porta ${port}`, 'green');
            } catch (error) {
              log(`❌ Falha ao encerrar processo ${pid} na porta ${port}`, 'red');
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch {
      // Ignore Windows errors
    }
  }
}

async function waitForPort(port) {
  let retries = 0;
  
  while (await checkPort(port) && retries < MAX_RETRIES) {
    log(`⏳ Aguardando porta ${port} ficar livre...`, 'yellow');
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    retries++;
  }
  
  if (await checkPort(port)) {
    log(`❌ Porta ${port} ainda em uso após ${MAX_RETRIES} tentativas`, 'red');
    return false;
  }
  
  return true;
}

async function verifyPrisma() {
  const schemaPath = 'prisma/schema.prisma';
  if (!fs.existsSync(schemaPath)) {
    log(`❌ Arquivo ${schemaPath} não encontrado`, 'red');
    process.exit(1);
  }
  
  // Generate Prisma client if needed
  const prismaClientPath = 'node_modules/.prisma/client/index.js';
  if (!fs.existsSync(prismaClientPath)) {
    log('📦 Gerando cliente Prisma...', 'yellow');
    try {
      await execAsync('npx prisma generate');
    } catch (error) {
      log('❌ Falha ao gerar cliente Prisma', 'red');
      process.exit(1);
    }
  }
  
  // Check if database exists and run migrations if needed
  const dbPath = 'prisma/dev.db';
  if (!fs.existsSync(dbPath)) {
    log('💾 Banco de dados não encontrado. Criando...', 'yellow');
    try {
      await execAsync('npx prisma migrate deploy');
    } catch (error) {
      log('❌ Falha ao criar banco de dados', 'red');
      process.exit(1);
    }
  }
  
  log('✅ Banco de dados verificado!', 'green');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  log('🚀 Iniciando sistema de gerenciamento de clínica...', 'green');
  
  // Check and kill ports if in use
  log('📋 Verificando portas...', 'green');
  
  for (const port of [SERVER_PORT, CLIENT_PORT]) {
    if (await checkPort(port)) {
      await killPort(port);
      if (!await waitForPort(port)) {
        log(`❌ Não foi possível liberar a porta ${port}`, 'red');
        process.exit(1);
      }
    }
  }
  
  log('✅ Portas verificadas e liberadas!', 'green');
  
  // Verify Prisma setup
  await verifyPrisma();
  
  // Start the system
  log('🎯 Iniciando servidor e cliente...', 'green');
  log(`📡 Servidor: http://localhost:${SERVER_PORT}`, 'green');
  log(`🌐 Cliente: http://localhost:${CLIENT_PORT}`, 'green');
  log('⏱️  Isso pode levar alguns segundos...', 'yellow');
  console.log('');
  
  // Use npm run dev to start both client and server
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  devProcess.on('error', (error) => {
    log(`❌ Erro ao iniciar o sistema: ${error.message}`, 'red');
    process.exit(1);
  });
  
  devProcess.on('exit', (code) => {
    if (code !== 0) {
      log(`❌ Sistema encerrado com código ${code}`, 'red');
      process.exit(code);
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('🛑 Encerrando sistema...', 'yellow');
    devProcess.kill('SIGINT');
    process.exit(0);
  });
}

main().catch(error => {
  log(`❌ Erro fatal: ${error.message}`, 'red');
  process.exit(1);
});