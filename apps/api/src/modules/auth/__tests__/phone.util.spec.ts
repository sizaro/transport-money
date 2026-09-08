import { describe, expect, it } from 'vitest'
import {
  formatUgandaPhone,
  normalizeUgandaPhone,
} from '../../../common/phone/phone.util.js'

describe('Uganda phone normalization', () => {
  it('normalizes local format', () => {
    expect(normalizeUgandaPhone('0771895506'))
      .toBe('256771895506')
  })

  it('normalizes +256 format', () => {
    expect(normalizeUgandaPhone('+256771895506'))
      .toBe('256771895506')
  })

  it('normalizes canonical format', () => {
    expect(normalizeUgandaPhone('256771895506'))
      .toBe('256771895506')
  })

  it('normalizes 9 digit mobile format', () => {
    expect(normalizeUgandaPhone('771895506'))
      .toBe('256771895506')
  })

  it('formats canonical number for display', () => {
    expect(formatUgandaPhone('256771895506'))
      .toBe('0771895506')
  })

  it('rejects invalid numbers', () => {
    expect(() => normalizeUgandaPhone('07001234'))
      .toThrow()
  })
})
