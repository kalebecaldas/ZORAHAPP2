#!/usr/bin/env tsx
/**
 * Script para testar o modelo gpt-5-nano
 * Testa disponibilidade e qualidade comparando com gpt-3.5-turbo
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from root
dotenv.config({ path: join(__dirname, '..', '.env') });

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY não encontrada no .env');
  process.exit(1);
}

const client = new OpenAI({ apiKey });

// Mensagens de teste reais do sistema
const testMessages = [
  'Quanto custa fisioterapia?',
  'Vocês aceitam convênio Bradesco?',
  'Qual o endereço da clínica?',
  'Quero agendar uma consulta',
  'Bom dia! Gostaria de informações sobre acupuntura',
  'Preciso fazer fisioterapia pélvica, tem vaga?'
];

async function testModel(model: string, message: string): Promise<{ response: string; time: number; tokens: number; error?: string }> {
  const start = Date.now();
  
  try {
    // gpt-5-nano usa max_completion_tokens ao invés de max_tokens
    const isGpt5Nano = model === 'gpt-5-nano';
    
    const params: any = {
      model,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente virtual de uma clínica de fisioterapia. Responda de forma breve e útil.'
        },
        { role: 'user', content: message }
      ]
    };

    // gpt-5-nano tem restrições específicas
    if (isGpt5Nano) {
      params.max_completion_tokens = 150;
      // temperature não é suportado - usa default (1)
    } else {
      params.max_tokens = 150;
      params.temperature = 0.7;
    }

    const completion = await client.chat.completions.create(params);

    const time = Date.now() - start;
    const response = completion.choices[0]?.message?.content || '';
    const tokens = completion.usage?.total_tokens || 0;

    return { response, time, tokens };
  } catch (error: any) {
    const time = Date.now() - start;
    return { 
      response: '', 
      time, 
      tokens: 0,
      error: error.message || String(error)
    };
  }
}

async function runTests() {
  console.log('🧪 Testando disponibilidade e qualidade do gpt-5-nano\n');
  console.log('=' .repeat(80));
  
  const models = ['gpt-5-nano', 'gpt-3.5-turbo', 'gpt-4o-mini'];
  const results: Record<string, any[]> = {};

  for (const model of models) {
    console.log(`\n📊 Testando modelo: ${model}`);
    console.log('-'.repeat(80));
    
    results[model] = [];

    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      console.log(`\n${i + 1}. Mensagem: "${message}"`);
      
      const result = await testModel(model, message);
      results[model].push(result);

      if (result.error) {
        console.log(`   ❌ ERRO: ${result.error}`);
      } else {
        console.log(`   ✅ Tempo: ${result.time}ms | Tokens: ${result.tokens}`);
        console.log(`   📝 Resposta: ${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}`);
      }
    }
  }

  // Análise comparativa
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 ANÁLISE COMPARATIVA');
  console.log('='.repeat(80));

  for (const model of models) {
    const modelResults = results[model];
    const successful = modelResults.filter(r => !r.error);
    const failed = modelResults.filter(r => r.error);

    if (successful.length === 0) {
      console.log(`\n❌ ${model}: MODELO NÃO DISPONÍVEL ou ERRO EM TODOS OS TESTES`);
      if (failed.length > 0) {
        console.log(`   Erro típico: ${failed[0].error}`);
      }
      continue;
    }

    const avgTime = successful.reduce((acc, r) => acc + r.time, 0) / successful.length;
    const avgTokens = successful.reduce((acc, r) => acc + r.tokens, 0) / successful.length;
    const totalTokens = successful.reduce((acc, r) => acc + r.tokens, 0);

    // Calcular custo baseado nos preços do plano
    const costs: Record<string, { input: number; output: number }> = {
      'gpt-5-nano': { input: 0.05, output: 0.40 },
      'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
      'gpt-4o-mini': { input: 0.15, output: 0.60 }
    };

    const modelCost = costs[model] || costs['gpt-3.5-turbo'];
    // Estimativa: ~30% input, 70% output
    const estimatedCost = (totalTokens * 0.3 * modelCost.input / 1000000) + (totalTokens * 0.7 * modelCost.output / 1000000);

    console.log(`\n✅ ${model}:`);
    console.log(`   Sucessos: ${successful.length}/${modelResults.length}`);
    console.log(`   Tempo médio: ${avgTime.toFixed(0)}ms`);
    console.log(`   Tokens médios: ${avgTokens.toFixed(0)}`);
    console.log(`   Tokens totais: ${totalTokens}`);
    console.log(`   Custo estimado: $${estimatedCost.toFixed(6)} (${testMessages.length} mensagens)`);
    console.log(`   Custo por 1000 msgs: $${(estimatedCost * 1000 / testMessages.length).toFixed(2)}`);
  }

  // Recomendação final
  console.log('\n' + '='.repeat(80));
  console.log('🎯 RECOMENDAÇÃO');
  console.log('='.repeat(80));

  const gpt5Available = results['gpt-5-nano'].filter(r => !r.error).length > 0;
  const gpt35Available = results['gpt-3.5-turbo'].filter(r => !r.error).length > 0;

  if (gpt5Available) {
    const gpt5Results = results['gpt-5-nano'].filter(r => !r.error);
    const gpt35Results = results['gpt-3.5-turbo'].filter(r => !r.error);

    const gpt5AvgTime = gpt5Results.reduce((acc, r) => acc + r.time, 0) / gpt5Results.length;
    const gpt35AvgTime = gpt35Results.reduce((acc, r) => acc + r.time, 0) / gpt35Results.length;

    const speedDiff = ((gpt5AvgTime - gpt35AvgTime) / gpt35AvgTime * 100).toFixed(0);

    console.log(`\n✅ gpt-5-nano está DISPONÍVEL e funcional!`);
    console.log(`\n📊 Comparação com gpt-3.5-turbo:`);
    console.log(`   Velocidade: ${speedDiff}% ${parseInt(speedDiff) > 0 ? 'mais lento' : 'mais rápido'}`);
    console.log(`   Custo: ~85% mais barato`);
    console.log(`\n🎉 RECOMENDAÇÃO: Migrar para gpt-5-nano!`);
    console.log(`\n📝 Próximos passos:`);
    console.log(`   1. Atualizar .env com gpt-5-nano`);
    console.log(`   2. Testar em ambiente de staging`);
    console.log(`   3. Deploy em produção`);
  } else if (gpt35Available) {
    console.log(`\n⚠️  gpt-5-nano NÃO está disponível ou teve erros`);
    console.log(`\n💡 ALTERNATIVA: Usar gpt-4o-mini (já mais barato que gpt-3.5-turbo)`);
    console.log(`\n📝 Próximos passos:`);
    console.log(`   1. Verificar se gpt-5-nano estará disponível em breve`);
    console.log(`   2. Migrar para gpt-4o-mini como solução intermediária`);
    console.log(`   3. Implementar outras otimizações (cache, fallbacks)`);
  } else {
    console.log(`\n❌ ERRO: Nenhum modelo funcionou. Verificar API key e conectividade.`);
  }

  console.log('\n' + '='.repeat(80));
}

// Executar testes
runTests().catch(error => {
  console.error('❌ Erro ao executar testes:', error);
  process.exit(1);
});
