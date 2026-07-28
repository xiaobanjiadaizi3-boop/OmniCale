/**
 * 「√ や π が付いた値で、出せる表現をすべて出す」という要件のテスト。
 * 設計時に洗い出した表のパターンをここで固定する。
 */
import { describe, expect, it } from 'vitest';
import { rat } from '../src/value/rational.js';
import {
  exactInt,
  exactPi,
  exactRational,
  makeRadical,
  sqrtRational,
  type Exact,
} from '../src/value/exact.js';
import { representations, type Representation } from '../src/representation/index.js';

const byId = (reps: Representation[]): Record<string, Representation> =>
  Object.fromEntries(reps.map((r) => [r.id, r]));

const ids = (v: Exact): string[] => representations(v).map((r) => r.id);
const get = (v: Exact, id: string): Representation | undefined => byId(representations(v))[id];

describe('√8', () => {
  const v = sqrtRational(rat(8n)) as Exact;

  it('厳密値は簡約された 2√2', () => {
    expect(get(v, 'exact')?.display).toBe('2√2');
    expect(get(v, 'exact')?.isExact).toBe(true);
  });

  it('小数は近似値として出る', () => {
    expect(get(v, 'decimal')?.display).toBe('2.8284271247');
    expect(get(v, 'decimal')?.isExact).toBe(false);
  });

  it('近似分数が出る', () => {
    expect(get(v, 'approxFraction')?.isExact).toBe(false);
    expect(get(v, 'approxFraction')?.display).toMatch(/^\d+\/\d+$/);
  });

  it('有理化する前の形は出さない（2√2 は分母に √ が来ない）', () => {
    expect(ids(v)).not.toContain('unrationalized');
  });

  it('指数が 0 のときは指数表記を出さない（×10⁰ は情報がない）', () => {
    expect(ids(v)).not.toContain('scientific');
    expect(ids(v)).not.toContain('engineering');
  });
});

describe('1/√2', () => {
  // 値としては √2/2 に正規化される
  const v = makeRadical(rat(0n), rat(1n, 2n), 2n);

  it('厳密値は有理化された √2/2', () => {
    expect(get(v, 'exact')?.display).toBe('√2/2');
  });

  it('有理化する前の形 1/√2 も出せる', () => {
    expect(get(v, 'unrationalized')?.display).toBe('1/√2');
    expect(get(v, 'unrationalized')?.isExact).toBe(true);
  });

  it('小数', () => {
    expect(get(v, 'decimal')?.display).toBe('0.7071067812');
  });
});

describe('(-3 + √5)/2', () => {
  const v = makeRadical(rat(-3n, 2n), rat(1n, 2n), 5n);

  it('分数を含む厳密形が読める形で出る', () => {
    expect(get(v, 'exact')?.display).toBe('(-3 + √5)/2');
  });

  it('小数', () => {
    expect(get(v, 'decimal')?.display).toBe('-0.3819660113');
  });
});

describe('π/6', () => {
  const v = exactPi(rat(1n, 6n));

  it('厳密値', () => {
    expect(get(v, 'exact')?.display).toBe('π/6');
  });

  it('度数法で 30°', () => {
    expect(get(v, 'degree')?.display).toBe('30°');
    expect(get(v, 'degree')?.isExact).toBe(true);
  });

  it('度分秒で 30°0′0″', () => {
    expect(get(v, 'dms')?.display).toBe('30°0′0″');
    expect(get(v, 'dms')?.isExact).toBe(true);
  });

  it('π 倍表記は割り切れないので近似', () => {
    expect(get(v, 'piCoeffDecimal')?.display).toBe('0.1666666667π');
    expect(get(v, 'piCoeffDecimal')?.isExact).toBe(false);
  });

  it('小数', () => {
    expect(get(v, 'decimal')?.display).toBe('0.5235987756');
    expect(get(v, 'decimal')?.isExact).toBe(false);
  });
});

describe('π/8 は割り切れない度数になる', () => {
  const v = exactPi(rat(1n, 8n));

  it('22.5°', () => {
    expect(get(v, 'degree')?.display).toBe('22.5°');
  });

  it('度分秒は 22°30′0″', () => {
    expect(get(v, 'dms')?.display).toBe('22°30′0″');
  });
});

describe('π/7 は度数が分数になる', () => {
  const v = exactPi(rat(1n, 7n));

  it('分数のまま括弧で囲って出す', () => {
    expect(get(v, 'degree')?.display).toBe('(180/7)°');
    expect(get(v, 'degree')?.isExact).toBe(true);
  });
});

describe('π 自身', () => {
  const v = exactPi(rat(1n));

  it('180°', () => {
    expect(get(v, 'degree')?.display).toBe('180°');
  });

  it('近似分数は 355/113', () => {
    expect(get(v, 'approxFraction')?.display).toBe('355/113');
  });
});

describe('1/7', () => {
  const v = exactRational(rat(1n, 7n));

  it('厳密値は分数', () => {
    expect(get(v, 'exact')?.display).toBe('1/7');
  });

  it('循環小数が出る', () => {
    const DOT = '̇';
    expect(get(v, 'repeating')?.display).toBe(`0.1${DOT}42857${DOT}`);
    expect(get(v, 'repeating')?.isExact).toBe(true);
    expect(get(v, 'repeating')?.note).toBe('循環節 6 桁');
  });

  it('指定桁の小数は近似になる', () => {
    expect(get(v, 'decimal')?.display).toBe('0.1428571429');
    expect(get(v, 'decimal')?.isExact).toBe(false);
  });

  it('百分率', () => {
    expect(get(v, 'percent')?.display).toBe('14.2857142857%');
    expect(get(v, 'percent')?.isExact).toBe(false);
  });

  it('指数表記の指数は上付き文字になる', () => {
    expect(get(v, 'scientific')?.display).toBe('1.428571429×10⁻¹');
    expect(get(v, 'engineering')?.display).toBe('142.8571429×10⁻³');
  });

  it('有理数に近似分数は出さない（それ自体が分数なので）', () => {
    expect(ids(v)).not.toContain('approxFraction');
  });
});

describe('22/7', () => {
  const v = exactRational(rat(22n, 7n));

  it('帯分数が出る', () => {
    expect(get(v, 'mixed')?.display).toBe('3 1/7');
    expect(get(v, 'mixed')?.isExact).toBe(true);
  });
});

describe('1/4 は誤差なしで小数にできる', () => {
  const v = exactRational(rat(1n, 4n));

  it('小数が厳密として出る', () => {
    expect(get(v, 'decimal')?.display).toBe('0.25');
    expect(get(v, 'decimal')?.isExact).toBe(true);
  });

  it('百分率も厳密', () => {
    expect(get(v, 'percent')?.display).toBe('25%');
    expect(get(v, 'percent')?.isExact).toBe(true);
  });

  it('循環小数は出さない', () => {
    expect(ids(v)).not.toContain('repeating');
  });

  it('帯分数は出さない（1 未満なので）', () => {
    expect(ids(v)).not.toContain('mixed');
  });
});

describe('整数と 0', () => {
  it('整数', () => {
    expect(get(exactInt(5n), 'exact')?.display).toBe('5');
    expect(get(exactInt(5n), 'decimal')?.display).toBe('5');
  });

  it('整数に百分率は出さない（14 → 1400% は情報がない）', () => {
    expect(ids(exactInt(14n))).not.toContain('percent');
  });

  it('0 には指数表記を出さない', () => {
    expect(ids(exactInt(0n))).not.toContain('scientific');
    expect(get(exactInt(0n), 'decimal')?.display).toBe('0');
  });

  it('桁の大きい整数には指数表記が出る', () => {
    expect(get(exactRational(rat(123456n)), 'scientific')?.display).toBe('1.23456×10⁵');
    expect(get(exactRational(rat(123456n)), 'engineering')?.display).toBe('123.456×10³');
  });
});

describe('設定', () => {
  it('小数の桁数を変えられる', () => {
    const v = exactPi(rat(1n));
    expect(get(v, 'decimal')?.display).toBe('3.1415926536');
    const d20 = representations(v, { decimalDigits: 20 }).find((r) => r.id === 'decimal');
    expect(d20?.display).toBe('3.14159265358979323846');
  });

  it('近似分数の分母の上限を変えられる', () => {
    const v = exactPi(rat(1n));
    const r = representations(v, { maxApproxDenominator: 100n }).find(
      (x) => x.id === 'approxFraction',
    );
    expect(r?.display).toBe('22/7');
  });

  it('ラベルは辞書から引かれ、ロケールを切り替えられる', () => {
    const v = exactPi(rat(1n, 6n));
    expect(get(v, 'degree')?.label).toBe('度数法');
    const en = representations(v, { locale: 'en' }).find((r) => r.id === 'degree');
    expect(en?.label).toBe('Degrees');
  });
});

describe('表現の並び', () => {
  it('先頭は必ず厳密値', () => {
    for (const v of [
      exactInt(5n),
      exactRational(rat(1n, 7n)),
      sqrtRational(rat(8n)) as Exact,
      exactPi(rat(1n, 6n)),
    ]) {
      expect(representations(v)[0]?.id).toBe('exact');
    }
  });

  it('id が重複しない', () => {
    const list = ids(exactPi(rat(1n, 6n)));
    expect(new Set(list).size).toBe(list.length);
  });
});
