import { describe, expect, it } from 'vitest';
import { ZERO, rat } from '../src/value/rational.js';
import {
  EXACT_ONE,
  addExact,
  divExact,
  exactEquals,
  exactInt,
  exactPi,
  exactRational,
  exactSign,
  makeRadical,
  mulExact,
  powExact,
  sqrtExact,
  sqrtRational,
  subExact,
  type Exact,
} from '../src/value/exact.js';
import { formatExact } from '../src/representation/format.js';

const show = (v: Exact | null): string => (v === null ? 'null' : formatExact(v));

describe('√ の正規化', () => {
  it('平方因子を外に出す: √8 → 2√2', () => {
    expect(show(sqrtRational(rat(8n)))).toBe('2√2');
  });

  it('完全平方は有理数に落ちる: √9 → 3', () => {
    expect(show(sqrtRational(rat(9n)))).toBe('3');
    expect(show(sqrtRational(rat(4n, 9n)))).toBe('2/3');
  });

  it('分母の根号は自動的に有理化される: √(1/2) → √2/2', () => {
    expect(show(sqrtRational(rat(1n, 2n)))).toBe('√2/2');
  });

  it('√0 は 0', () => {
    expect(show(sqrtRational(ZERO))).toBe('0');
  });

  it('負の数は Phase 1 では扱わない', () => {
    expect(sqrtRational(rat(-1n))).toBeNull();
  });

  it('√ が消えたら有理数型になる', () => {
    const v = makeRadical(rat(1n), rat(2n), 4n); // 1 + 2√4 = 5
    expect(v.kind).toBe('rational');
    expect(show(v)).toBe('5');
  });
});

describe('二重根号の外し', () => {
  it('√(3 + 2√2) = 1 + √2', () => {
    const inner = makeRadical(rat(3n), rat(2n), 2n);
    expect(show(sqrtExact(inner))).toBe('1 + √2');
  });

  it('√(3 - 2√2) = -1 + √2', () => {
    const inner = makeRadical(rat(3n), rat(-2n), 2n);
    const result = sqrtExact(inner);
    expect(show(result)).toBe('-1 + √2');
    expect(exactSign(result as Exact)).toBe(1);
  });

  it('外せない二重根号は null を返す', () => {
    expect(sqrtExact(makeRadical(rat(1n), rat(1n), 2n))).toBeNull();
  });
});

describe('厳密値の符号判定', () => {
  it('近似せずに符号を決める', () => {
    expect(exactSign(makeRadical(rat(-3n), rat(2n), 2n))).toBe(-1); // -3 + 2√2 ≈ -0.172
    expect(exactSign(makeRadical(rat(-1n), rat(1n), 2n))).toBe(1); // -1 + √2 ≈ 0.414
    expect(exactSign(makeRadical(rat(-2n), rat(1n), 4n))).toBe(0); // -2 + √4 = 0
    expect(exactSign(exactPi(rat(-1n)))).toBe(-1);
  });
});

describe('厳密値の四則演算', () => {
  it('同じ √ どうしは足せる', () => {
    const a = makeRadical(rat(1n), rat(1n), 2n);
    const b = makeRadical(rat(2n), rat(3n), 2n);
    expect(show(addExact(a, b))).toBe('3 + 4√2');
  });

  it('共役どうしの積は有理数になる', () => {
    const a = makeRadical(rat(1n), rat(1n), 2n);
    const b = makeRadical(rat(1n), rat(-1n), 2n);
    expect(show(mulExact(a, b))).toBe('-1'); // 1 - 2
  });

  it('割り算は共役で有理化される: 1/(1+√2) = -1 + √2', () => {
    const d = makeRadical(rat(1n), rat(1n), 2n);
    expect(show(divExact(EXACT_ONE, d))).toBe('-1 + √2');
  });

  it('1/√2 は √2/2 に有理化される', () => {
    const root2 = makeRadical(ZERO, rat(1n), 2n);
    expect(show(divExact(EXACT_ONE, root2))).toBe('√2/2');
  });

  it('(1+√2)^2 = 3 + 2√2', () => {
    const a = makeRadical(rat(1n), rat(1n), 2n);
    expect(show(powExact(a, 2))).toBe('3 + 2√2');
  });

  it('π は有理数倍のあいだで閉じている', () => {
    expect(show(mulExact(exactPi(rat(1n, 6n)), exactInt(3n)))).toBe('π/2');
    expect(show(addExact(exactPi(rat(1n, 6n)), exactPi(rat(1n, 3n))))).toBe('π/2');
  });

  it('型で閉じない演算は null を返す（Phase 2 の記号式に委ねる）', () => {
    expect(addExact(exactPi(rat(1n)), exactInt(1n))).toBeNull(); // 1 + π
    expect(mulExact(exactPi(rat(1n)), exactPi(rat(1n)))).toBeNull(); // π²
    expect(addExact(makeRadical(ZERO, rat(1n), 2n), makeRadical(ZERO, rat(1n), 3n))).toBeNull(); // √2 + √3
  });

  it('0 で割ると例外', () => {
    expect(() => divExact(EXACT_ONE, exactRational(ZERO))).toThrow();
  });
});

describe('等値判定', () => {
  it('正規化されているので構造比較でよい', () => {
    expect(exactEquals(sqrtRational(rat(8n)) as Exact, makeRadical(ZERO, rat(2n), 2n))).toBe(true);
    expect(exactEquals(exactInt(2n), makeRadical(ZERO, rat(1n), 2n))).toBe(false);
  });

  it('subExact は addExact + negExact と一致する', () => {
    const a = makeRadical(rat(5n), rat(2n), 3n);
    const b = makeRadical(rat(1n), rat(1n), 3n);
    expect(show(subExact(a, b))).toBe('4 + √3');
  });
});
