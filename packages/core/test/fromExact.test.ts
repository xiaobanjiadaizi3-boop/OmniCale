import { describe, expect, it } from 'vitest';
import { calculate } from '../src/calculate.js';
import { exactToExpr } from '../src/expr/fromExact.js';
import { printExpr } from '../src/expr/print.js';
import { formatExact } from '../src/representation/format.js';

/** 式に戻して表示したもの。2 次元表示もこの Expr から描く。 */
const back = (input: string): string => {
  const r = calculate(input);
  if (r.kind !== 'exact') throw new Error(`厳密値になりませんでした: ${input}`);
  return printExpr(exactToExpr(r.value));
};

/** 文字列表示（formatExact）と食い違っていないか。 */
const both = (input: string): [string, string] => {
  const r = calculate(input);
  if (r.kind !== 'exact') throw new Error(`厳密値になりませんでした: ${input}`);
  return [printExpr(exactToExpr(r.value)), formatExact(r.value)];
};

describe('厳密値を式に戻す', () => {
  it('整数', () => {
    expect(back('2 + 3')).toBe('5');
    expect(back('2 - 5')).toBe('-3');
  });

  it('分数は div になる（2 次元表示で分数として描ける）', () => {
    expect(back('1/3')).toBe('1/3');
    expect(back('-1/3')).toBe('-1/3');
  });

  it('√', () => {
    expect(back('√8')).toBe('2·√2');
    expect(back('1/√2')).toBe('√2/2');
    expect(back('√8 - √2')).toBe('√2');
  });

  it('√ を含む和', () => {
    expect(back('(1+√2)^2')).toBe('3 + 2·√2');
    expect(back('1/(1+√2)')).toBe('-1 + √2');
  });

  it('分母つきの √（解の公式の形）', () => {
    expect(back('(-3 + √5)/2')).toBe('(-3 + √5)/2');
  });

  it('π', () => {
    expect(back('π')).toBe('π');
    expect(back('2π')).toBe('2·π');
    expect(back('π/6')).toBe('π/6');
    expect(back('-π/6')).toBe('-π/6');
    expect(back('3π/2')).toBe('3·π/2');
  });
});

describe('文字列表示と食い違わない', () => {
  const cases = ['5', '1/3', '√8', '1/√2', '(1+√2)^2', '(-3 + √5)/2', 'π/6', '3π/2', '-π/6'];

  for (const input of cases) {
    it(input, () => {
      const [fromExpr, fromValue] = both(input);
      // Expr 側は掛け算に · を入れるので、そこだけ揃えて比較する
      expect(fromExpr.replace(/·/g, '')).toBe(fromValue);
    });
  }
});
