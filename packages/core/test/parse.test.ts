import { describe, expect, it } from 'vitest';
import { parse } from '../src/expr/parse.js';
import { printExpr } from '../src/expr/print.js';
import { ParseError, tokenize } from '../src/expr/tokenize.js';
import { hasVariable } from '../src/expr/ast.js';
import { rat } from '../src/value/rational.js';

/** パース結果を表示形に戻して構造を確認する。括弧の付き方が優先順位を表す。 */
const round = (input: string): string => printExpr(parse(input));

describe('字句解析', () => {
  it('小数を厳密な分数として読む', () => {
    const tokens = tokenize('1.5');
    expect(tokens[0]).toMatchObject({ type: 'number', text: '1.5', value: rat(3n, 2n) });
  });

  it('0.1 は 1/10 になる（浮動小数点を経由しない）', () => {
    const tokens = tokenize('0.1');
    expect(tokens[0]).toMatchObject({ value: rat(1n, 10n) });
  });

  it('記号のゆれを吸収する', () => {
    expect(round('2×3')).toBe('2·3');
    expect(round('6÷3')).toBe('6/3');
    expect(round('1−2')).toBe('1 - 2');
    expect(round('（1+2）')).toBe('1 + 2');
  });

  it('π を定数として読む', () => {
    expect(round('π')).toBe('π');
    expect(round('pi')).toBe('π');
  });

  it('使えない文字は位置つきで拒否する', () => {
    expect(() => tokenize('1 @ 2')).toThrow(ParseError);
    try {
      tokenize('1 @ 2');
    } catch (e) {
      expect((e as ParseError).pos).toBe(2);
    }
  });
});

describe('優先順位', () => {
  it('掛け算は足し算より強い', () => {
    expect(round('1 + 2 * 3')).toBe('1 + 2·3');
    expect(round('(1 + 2) * 3')).toBe('(1 + 2)·3');
  });

  it('累乗は掛け算より強い', () => {
    expect(round('2 * 3 ^ 2')).toBe('2·3^2');
  });

  it('累乗は右結合', () => {
    expect(round('2^3^2')).toBe('2^3^2');
    expect(round('(2^3)^2')).toBe('(2^3)^2');
  });

  it('単項マイナスは累乗より弱い（-2^2 は -(2^2)）', () => {
    expect(round('-2^2')).toBe('-2^2');
    expect(round('(-2)^2')).toBe('(-2)^2');
  });

  it('負の指数が書ける', () => {
    expect(round('2^-1')).toBe('2^-1');
  });

  it('引き算は左から順に', () => {
    expect(round('10 - 3 - 2')).toBe('10 - 3 - 2');
  });

  it('割り算は左から順に', () => {
    expect(round('8 / 4 / 2')).toBe('8/4/2');
    expect(round('8 / (4 / 2)')).toBe('8/(4/2)');
  });
});

describe('暗黙の掛け算', () => {
  it('数と変数', () => {
    expect(round('2x')).toBe('2·x');
  });

  it('数と括弧', () => {
    expect(round('2(3+4)')).toBe('2·(3 + 4)');
  });

  it('括弧どうし', () => {
    expect(round('(1+2)(3+4)')).toBe('(1 + 2)·(3 + 4)');
  });

  it('数と π', () => {
    expect(round('2π')).toBe('2·π');
  });

  it('数と √', () => {
    expect(round('2√3')).toBe('2·√3');
  });

  it('引き算は暗黙の掛け算にならない', () => {
    expect(round('2 - 3')).toBe('2 - 3');
  });
});

describe('√ の結合', () => {
  it('√ は次の原子ひとつに掛かる', () => {
    expect(round('√8')).toBe('√8');
    expect(round('√8 + 1')).toBe('√8 + 1');
    expect(round('√2x')).toBe('√2·x');
  });

  it('括弧を書けば中身全体に掛かる', () => {
    expect(round('√(3 + 2√2)')).toBe('√(3 + 2·√2)');
  });

  it('関数形でも書ける', () => {
    expect(round('sqrt(2)')).toBe('√2');
  });

  it('√ のあとに累乗が来ると (√2)^2 になる', () => {
    expect(round('√2^2')).toBe('√2^2');
  });
});

describe('入力どおりの形を保つ', () => {
  it('小数は小数のまま表示される（3/2 にならない）', () => {
    expect(round('1.5')).toBe('1.5');
    expect(round('1.5 + 0.25')).toBe('1.5 + 0.25');
  });

  it('√8 は 2√2 に簡約されずそのまま', () => {
    expect(round('√8')).toBe('√8');
  });
});

describe('由来 ID', () => {
  it('全ノードに付き、パースは決定的', () => {
    const serialize = (e: unknown): string =>
      JSON.stringify(e, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
    expect(serialize(parse('(x+5)(x+2)'))).toBe(serialize(parse('(x+5)(x+2)')));
  });

  it('同じ式の中でノードごとに異なる', () => {
    const e = parse('x + x');
    const origins = e.kind === 'add' ? e.terms.map((t) => t.origin) : [];
    expect(origins).toHaveLength(2);
    expect(origins[0]).not.toBe(origins[1]);
  });
});

describe('変数の検出', () => {
  it('変数を含むか判定できる', () => {
    expect(hasVariable(parse('2x + 1'))).toBe(true);
    expect(hasVariable(parse('2 + 1'))).toBe(false);
  });
});

describe('構文エラー', () => {
  const cases: [string, string][] = [
    ['', '式が空です'],
    ['1 +', '式が途中で終わっています'],
    ['1 + * 2', '演算子 * の右側に式がありません'],
    ['(1 + 2', '閉じ括弧がありません'],
    ['1 + 2)', '式の解釈が途中で止まりました'],
    ['1.', '小数点のあとに数字がありません'],
    ['sqrt 2', 'sqrt のあとに ( がありません'],
  ];

  for (const [input, message] of cases) {
    it(`${JSON.stringify(input)} → ${message}`, () => {
      expect(() => parse(input)).toThrow(message);
    });
  }
});
