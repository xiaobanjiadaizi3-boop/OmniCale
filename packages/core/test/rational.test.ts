import { describe, expect, it } from 'vitest';
import {
  rat,
  ratAdd,
  ratCmp,
  ratDiv,
  ratFloor,
  ratMul,
  ratPow,
  ratSub,
  ratToString,
  terminatingDecimalPlaces,
  toMixed,
} from '../src/value/rational.js';

describe('Rational の正規化', () => {
  it('約分される', () => {
    expect(ratToString(rat(6n, 4n))).toBe('3/2');
    expect(ratToString(rat(10n, 5n))).toBe('2');
  });

  it('符号は分子に寄る', () => {
    expect(rat(1n, -2n)).toEqual({ n: -1n, d: 2n });
    expect(rat(-1n, -2n)).toEqual({ n: 1n, d: 2n });
  });

  it('同じ値は同じ表現になるので構造比較できる', () => {
    expect(rat(2n, 4n)).toEqual(rat(1n, 2n));
  });

  it('分母 0 は拒否する', () => {
    expect(() => rat(1n, 0n)).toThrow();
  });
});

describe('Rational の四則演算', () => {
  it('加減乗除', () => {
    expect(ratAdd(rat(1n, 3n), rat(1n, 6n))).toEqual(rat(1n, 2n));
    expect(ratSub(rat(1n, 2n), rat(1n, 3n))).toEqual(rat(1n, 6n));
    expect(ratMul(rat(2n, 3n), rat(3n, 4n))).toEqual(rat(1n, 2n));
    expect(ratDiv(rat(1n, 2n), rat(2n, 3n))).toEqual(rat(3n, 4n));
  });

  it('巨大な数でも誤差が出ない', () => {
    const big = rat(10n ** 30n + 1n, 3n);
    expect(ratMul(big, rat(3n)).n).toBe(10n ** 30n + 1n);
  });

  it('負の指数', () => {
    expect(ratPow(rat(2n, 3n), -2)).toEqual(rat(9n, 4n));
  });

  it('比較と床関数', () => {
    expect(ratCmp(rat(1n, 3n), rat(1n, 2n))).toBe(-1);
    expect(ratFloor(rat(-1n, 2n))).toBe(-1n);
    expect(ratFloor(rat(5n, 2n))).toBe(2n);
  });
});

describe('有限小数の判定', () => {
  it('分母が 2 と 5 だけなら有限小数', () => {
    expect(terminatingDecimalPlaces(rat(1n, 8n))).toBe(3);
    expect(terminatingDecimalPlaces(rat(1n, 20n))).toBe(2);
    expect(terminatingDecimalPlaces(rat(3n, 1n))).toBe(0);
  });

  it('それ以外は循環小数', () => {
    expect(terminatingDecimalPlaces(rat(1n, 3n))).toBeNull();
    expect(terminatingDecimalPlaces(rat(1n, 7n))).toBeNull();
  });
});

describe('帯分数', () => {
  it('分解できる', () => {
    expect(toMixed(rat(22n, 7n))).toEqual({ sign: 1, whole: 3n, n: 1n, d: 7n });
    expect(toMixed(rat(-22n, 7n))).toEqual({ sign: -1, whole: 3n, n: 1n, d: 7n });
  });
});
