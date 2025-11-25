import { describe, it, expect } from 'vitest'
import { AIService } from '../api/services/ai'

describe('IAAM Intent Interpreter', () => {
  const ai = new AIService('')

  it('classifies AGENDAR with typos', async () => {
    const r = await ai.interpretIntentIAAM('quero gendar hoje')
    expect(r.intencao).toBe('AGENDAR')
    expect(r.textoInterpretado.toLowerCase()).toContain('agendar')
  })

  it('classifies LOCALIZACAO', async () => {
    const r = await ai.interpretIntentIAAM('ond fica essa unidade?')
    expect(r.intencao).toBe('LOCALIZACAO')
    expect(r.textoInterpretado.toLowerCase()).toContain('onde fica')
  })

  it('classifies CONVENIO_PROCEDIMENTOS', async () => {
    const r = await ai.interpretIntentIAAM('meu plano cobre acupuntura?')
    expect(r.intencao).toBe('CONVENIO_PROCEDIMENTOS')
  })

  it('classifies VALOR_PARTICULAR with typo', async () => {
    const r = await ai.interpretIntentIAAM('quanto custa a acupuntra?')
    expect(r.intencao).toBe('VALOR_PARTICULAR')
    expect(r.textoInterpretado.toLowerCase()).toContain('acupuntura')
  })

  it('classifies INFO_PROCEDIMENTO', async () => {
    const r = await ai.interpretIntentIAAM('o que é rpg?')
    expect(r.intencao).toBe('INFO_PROCEDIMENTO')
  })

  it('classifies REAGENDAR with typos', async () => {
    const r = await ai.interpretIntentIAAM('quero reagnda pra amanha')
    expect(r.intencao).toBe('REAGENDAR')
  })

  it('classifies CANCELAR', async () => {
    const r = await ai.interpretIntentIAAM('cancela ai')
    expect(r.intencao).toBe('CANCELAR')
  })
})
