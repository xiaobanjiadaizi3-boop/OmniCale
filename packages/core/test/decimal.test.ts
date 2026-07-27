import { describe, expect, it } from 'vitest';
import { ZERO, rat } from '../src/value/rational.js';
import { exactInt, exactPi, exactRational, makeRadical, sqrtRational } from '../src/value/exact.js';
import type { Exact } from '../src/value/exact.js';
import {
  decimalIsExact,
  formatRepeating,
  repeatingDecimal,
  toDecimalString,
  toEngineering,
  toScientific,
} from '../src/numeric/decimal.js';
import { piScaled } from '../src/numeric/pi.js';
import { bestApproximation, convergents } from '../src/numeric/continuedFraction.js';
import { formatRational } from '../src/representation/format.js';

// 切り捨てた 50 桁。piScaled はこちら（内部表現なので切り捨て）。
const PI_50_TRUNCATED = '3.14159265358979323846264338327950288419716939937510';
// 四捨五入した 50 桁。toDecimalString はこちら（表示なので丸める）。
// √2 = 1.414…7694|8073…  π = 3.141…7510|5820…  いずれも次の桁で繰り上がる。
const SQRT2_50 = '1.41421356237309504880168872420969807856967187537695';
const PI_50 = '3.14159265358979323846264338327950288419716939937511';

describe('任意精度の π', () => {
  it('50 桁が既知の値と一致する', () => {
    expect(piScaled(50).toString()).toBe(PI_50_TRUNCATED.replace('.', ''));
  });

  it('100 桁の先頭が 50 桁と整合する', () => {
    expect(piScaled(100).toString().slice(0, 51)).toBe(PI_50_TRUNCATED.replace('.', ''));
  });

  it('桁数を減らす方向でも一貫している', () => {
    expect(piScaled(10).toString()).toBe('31415926535');
  });
});

describe('厳密値の小数化', () => {
  it('√2 を 50 桁まで正しく出せる（末尾は切り捨てず四捨五入する）', () => {
    expect(toDecimalString(sqrtRational(rat(2n)) as Exact, 50)).toBe(SQRT2_50);
  });

  it('π を 50 桁まで正しく出せる（末尾は切り捨てず四捨五入する）', () => {
    expect(toDecimalString(exactPi(rat(1n)), 50)).toBe(PI_50);
  });

  it('π/6 ≈ 0.5235987756', () => {
    expect(toDecimalString(exactPi(rat(1n, 6n)), 10)).toBe('0.5235987756');
  });

  it('2√2 ≈ 2.8284271247', () => {
    expect(toDecimalString(sqrtRational(rat(8n)) as Exact, 10)).toBe('2.8284271247');
  });

  it('(-3 + √5)/2 ≈ -0.3819660113', () => {
    const v = makeRadical(rat(-3n, 2n), rat(1n, 2n), 5n);
    expect(toDecimalString(v, 10)).toBe('-0.3819660113');
  });

  it('有限小数は末尾の 0 を落とす', () => {
    expect(toDecimalString(exactRational(rat(1n, 4n)), 10)).toBe('0.25');
    expect(toDecimalString(exactInt(3n), 10)).toBe('3');
  });

  it('負の値の丸めが 0 から遠ざかる向きになる', () => {
    expect(toDecimalString(exactRational(rat(-1n, 8n)), 2)).toBe('-0.13');
  });

  it('0 は 0', () => {
    expect(toDecimalString(exactRational(ZERO), 10)).toBe('0');
  });
});

describe('誤差の有無', () => {
  it('有限小数のみ厳密', () => {
    expect(decimalIsExact(exactRational(rat(1n, 4n)), 10)).toBe(true);
    expect(decimalIsExact(exactRational(rat(1n, 3n)), 10)).toBe(false);
    expect(decimalIsExact(sqrtRational(rat(2n)) as Exact, 50)).toBe(false);
    expect(decimalIsExact(exactPi(rat(1n)), 50)).toBe(false);
  });

  it('桁数が足りなければ厳密ではない', () => {
    expect(decimalIsExact(exactRational(rat(1n, 8n)), 3)).toBe(true);
    expect(decimalIsExact(exactRational(rat(1n, 8n)), 2)).toBe(false);
  });
});

describe('循環小数', () => {
  it('1/7 の循環節は 142857', () => {
    const d = repeatingDecimal(rat(1n, 7n));
    expect(d).not.toBeNull();
    expect(d?.intPart).toBe('0');
    expect(d?.nonRepeating).toBe('');
    expect(d?.repeating).toBe('142857');
  });

  it('1/6 は循環しない部分を持つ', () => {
    const d = repeatingDecimal(rat(1n, 6n));
    expect(d?.nonRepeating).toBe('1');
    expect(d?.repeating).toBe('6');
  });

  it('有限小数は循環節が空になる', () => {
    const d = repeatingDecimal(rat(1n, 4n));
    expect(d?.nonRepeating).toBe('25');
    expect(d?.repeating).toBe('');
  });

  it('循環節の最初と最後に点が付く', () => {
    const DOT = '̇'; // 上付きの点（結合文字）
    expect(formatRepeating(repeatingDecimal(rat(1n, 7n))!)).toBe(`0.1${DOT}42857${DOT}`);
    expect(formatRepeating(repeatingDecimal(rat(1n, 3n))!)).toBe(`0.3${DOT}`);
    expect(formatRepeating(repeatingDecimal(rat(1n, 6n))!)).toBe(`0.16${DOT}`);
  });

  it('負の値', () => {
    expect(formatRepeating(repeatingDecimal(rat(-1n, 3n))!)).toBe(`-0.3̇`);
  });
});

describe('近似分数（連分数）', () => {
  it('π の主近似分数に 22/7 と 355/113 が現れる', () => {
    const list = convergents(exactPi(rat(1n))).map(formatRational);
    expect(list).toContain('22/7');
    expect(list).toContain('355/113');
  });

  it('√2 の主近似分数に 99/70 が現れる', () => {
    const list = convergents(sqrtRational(rat(2n)) as Exact).map(formatRational);
    expect(list).toContain('99/70');
    expect(list).toContain('577/408');
  });

  it('分母の上限で最良近似を選べる', () => {
    expect(formatRational(bestApproximation(exactPi(rat(1n)), 1000n)!)).toBe('355/113');
    expect(formatRational(bestApproximation(exactPi(rat(1n)), 100n)!)).toBe('22/7');
    expect(formatRational(bestApproximation(sqrtRational(rat(2n)) as Exact, 100n)!)).toBe('99/70');
  });
});

describe('科学表記・工学表記', () => {
  it('科学表記', () => {
    expect(toScientific(exactRational(rat(123456n)), 4)).toEqual({
      mantissa: '1.235',
      exponent: 5,
    });
    expect(toScientific(exactRational(rat(1n, 8000n)), 3)).toEqual({
      mantissa: '1.25',
      exponent: -4,
    });
  });

  it('丸め上がりで桁が増える場合も指数が正しい', () => {
    expect(toScientific(exactRational(rat(99999n)), 3)).toEqual({ mantissa: '1', exponent: 5 });
  });

  it('工学表記は指数が 3 の倍数になる', () => {
    expect(toEngineering(exactRational(rat(123456n)), 4)).toEqual({
      mantissa: '123.5',
      exponent: 3,
    });
    expect(toEngineering(exactRational(rat(1n, 8000n)), 3)).toEqual({
      mantissa: '125',
      exponent: -6,
    });
  });

  it('0 は指数が定まらないので null', () => {
    expect(toScientific(exactRational(ZERO), 5)).toBeNull();
  });

  it('無理数でも扱える', () => {
    expect(toScientific(exactPi(rat(1n)), 5)).toEqual({ mantissa: '3.1416', exponent: 0 });
  });
});
