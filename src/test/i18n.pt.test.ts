import { describe, it, expect } from 'vitest'
import { pt } from '@/i18n/pt'

describe('i18n pt — funciones de pluralización', () => {
  it('matrix.players formatea con jogadores', () => {
    expect(pt.matrix.players(0)).toBe('0 jogadores')
    expect(pt.matrix.players(5)).toBe('5 jogadores')
  })

  it('matrix.matches formatea con partidas', () => {
    expect(pt.matrix.matches(0)).toBe('0 partidas')
    expect(pt.matrix.matches(3)).toBe('3 partidas')
  })
})
