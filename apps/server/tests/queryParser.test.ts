import { describe, expect, it } from 'vitest';
import { buildFtsQuery } from '../src/features/search/queryParser.js';

describe('buildFtsQuery', () => {
  it('uses implicit AND for multiple keywords', () => {
    expect(buildFtsQuery('wallet transaction')).toBe('"wallet"* AND "transaction"*');
  });

  it('uses prefix matching for partial words', () => {
    expect(buildFtsQuery('integ')).toBe('"integ"*');
  });

  it('preserves exact phrases', () => {
    expect(buildFtsQuery('"Bonus API"')).toBe('"Bonus API"');
  });

  it('supports AND, OR and binary NOT', () => {
    expect(buildFtsQuery('SDK AND token OR wallet NOT legacy'))
      .toBe('"SDK"* AND "token"* OR "wallet"* NOT "legacy"*');
  });

  it('normalizes AND NOT to FTS5 binary NOT', () => {
    expect(buildFtsQuery('API AND NOT legacy')).toBe('"API"* NOT "legacy"*');
  });

  it('rejects malformed boolean searches', () => {
    expect(() => buildFtsQuery('OR wallet')).toThrow(/start and end/i);
    expect(() => buildFtsQuery('wallet OR OR API')).toThrow(/operators/i);
  });
});
