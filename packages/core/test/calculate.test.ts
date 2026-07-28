import { describe, expect, it } from 'vitest';
import { calculate } from '../src/calculate.js';
import { formatExact } from '../src/representation/format.js';

/** 厳密値に畳めた場合の厳密形を取り出す。畳めなければテストを落とす。 */
const exact = (input: string): string => {
  const r = calculate(input);
  if (r.kind !== 'exact') throw new Error(`厳密値になりませんでした: ${input} → ${r.kind}`);
  return formatExact(r.value);
};

const approx = (input: string): string => {
  const r = calculate(input);
  if (r.kind !== 'approx') throw new Error(`近似になりませんでした: ${input} → ${r.kind}`);
  return r.display;
};

const error = (input: string): string => {
  const r = calculate(input);
  if (r.kind !== 'error') throw new Error(`エラーになりませんでした: ${input} → ${r.kind}`);
  return r.message;
};

describe('四則演算', () => {
  it('整数', () => {
    expect(exact('1 + 2')).toBe('3');
    expect(exact('10 - 3 - 2')).toBe('5');
    expect(exact('2 * 3 * 4')).toBe('24');
  });

  it('割り算は分数のまま厳密に持つ', () => {
    expect(exact('1 / 3')).toBe('1/3');
    expect(exact('8 / 4 / 2')).toBe('1');
  });

  it('小数は誤差なく計算される', () => {
    // 浮動小数点なら 0.1 + 0.2 = 0.30000000000000004 になるところ
    expect(exact('0.1 + 0.2')).toBe('3/10');
    const r = calculate('0.1 + 0.2');
    if (r.kind !== 'exact') throw new Error('exact ではありません');
    const decimal = r.representations.find((x) => x.id === 'decimal');
    expect(decimal?.display).toBe('0.3');
    expect(decimal?.isExact).toBe(true);
  });

  it('優先順位が反映される', () => {
    expect(exact('1 + 2 * 3')).toBe('7');
    expect(exact('(1 + 2) * 3')).toBe('9');
  });

  it('累乗', () => {
    expect(exact('2^10')).toBe('1024');
    expect(exact('2^-2')).toBe('1/4');
    expect(exact('2^3^2')).toBe('512'); // 右結合なので 2^(3^2)
    expect(exact('-2^2')).toBe('-4');
    expect(exact('(-2)^2')).toBe('4');
  });

  it('暗黙の掛け算', () => {
    expect(exact('2(3+4)')).toBe('14');
    expect(exact('(1+2)(3+4)')).toBe('21');
  });
});

describe('√ を含む計算', () => {
  it('簡約される', () => {
    expect(exact('√8')).toBe('2√2');
    expect(exact('√9')).toBe('3');
  });

  it('同じ √ どうしは足せる', () => {
    expect(exact('√8 + √2')).toBe('3√2');
    expect(exact('√8 - √2')).toBe('√2');
  });

  it('根号どうしの掛け算は中身を掛ける', () => {
    expect(exact('√2 * √3')).toBe('√6');
    expect(exact('√2 * √2')).toBe('2');
  });

  it('分母の √ は有理化される', () => {
    expect(exact('1/√2')).toBe('√2/2');
    expect(exact('1/(1+√2)')).toBe('-1 + √2');
    expect(exact('√2/√3')).toBe('√6/3');
  });

  it('展開できる', () => {
    expect(exact('(1+√2)^2')).toBe('3 + 2√2');
    expect(exact('(1+√2)(1-√2)')).toBe('-1');
  });

  it('二重根号が外れる', () => {
    expect(exact('√(3 + 2√2)')).toBe('1 + √2');
  });

  it('二次方程式の解の形', () => {
    expect(exact('(-3 + √5) / 2')).toBe('(-3 + √5)/2');
  });
});

describe('π を含む計算', () => {
  it('有理数倍は厳密に持つ', () => {
    expect(exact('π/6')).toBe('π/6');
    expect(exact('2π')).toBe('2π');
    expect(exact('π/6 + π/3')).toBe('π/2');
  });

  it('度数法などの表現が付いてくる', () => {
    const r = calculate('π/6');
    if (r.kind !== 'exact') throw new Error('exact ではありません');
    const ids = r.representations.map((x) => x.id);
    expect(ids).toContain('degree');
    expect(r.representations.find((x) => x.id === 'degree')?.display).toBe('30°');
  });
});

describe('厳密に畳めない式は小数で答える', () => {
  it('異なる √ の和', () => {
    expect(approx('√2 + √3')).toBe('3.1462643699');
  });

  it('π と有理数の和', () => {
    expect(approx('1 + π')).toBe('4.1415926536');
  });

  it('π の 2 乗', () => {
    expect(approx('π^2')).toBe('9.8696044011');
  });

  it('入れ子でも計算できる', () => {
    // √(1+π) = 2.03509033057252602103…
    expect(approx('√(1 + π)')).toBe('2.0350903306');
  });

  it('近似であることが note に書かれる', () => {
    const r = calculate('√2 + √3');
    if (r.kind !== 'approx') throw new Error('approx ではありません');
    expect(r.note).toContain('小数');
  });

  it('桁数を変えられる', () => {
    const r = calculate('√2 + √3', { decimalDigits: 30 });
    if (r.kind !== 'approx') throw new Error('approx ではありません');
    // 真値は …0657155704… なので、30 桁目は切り捨てず繰り上がる
    expect(r.display).toBe('3.146264369941972342329135065716');
  });
});

describe('エラー', () => {
  it('0 除算', () => {
    expect(error('1/0')).toBe('0 で割ることはできません');
    expect(error('1/(2-2)')).toBe('0 で割ることはできません');
  });

  it('負の数の平方根', () => {
    expect(error('√(-1)')).toContain('負の数の平方根');
  });

  it('変数を含む式', () => {
    expect(error('2x + 1')).toContain('変数を含む式');
  });

  it('構文エラーは位置を返す', () => {
    const r = calculate('1 + 2)');
    if (r.kind !== 'error') throw new Error('error ではありません');
    expect(r.pos).toBe(5);
  });
});

describe('入力の表示', () => {
  it('打った形が printed に残る', () => {
    const r = calculate('√8');
    if (r.kind !== 'exact') throw new Error('exact ではありません');
    expect(r.printed).toBe('√8'); // 値は 2√2 だが、入力の形は保たれる
    expect(formatExact(r.value)).toBe('2√2');
  });
});
