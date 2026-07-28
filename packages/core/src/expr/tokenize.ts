/**
 * 字句解析。
 *
 * 全角・記号のゆれ（×÷−π√）はここで吸収して、パーサから先は正規化された形だけを見る。
 */

import { pow10 } from '../util/bigint.js';
import { rat, type Rational } from '../value/rational.js';

export type OpText = '+' | '-' | '*' | '/' | '^' | '√';

export type Token =
  | { readonly type: 'number'; readonly text: string; readonly value: Rational; readonly pos: number }
  | { readonly type: 'ident'; readonly text: string; readonly pos: number }
  | { readonly type: 'op'; readonly text: OpText; readonly pos: number }
  | { readonly type: 'lparen'; readonly pos: number }
  | { readonly type: 'rparen'; readonly pos: number }
  | { readonly type: 'eof'; readonly pos: number };

export class ParseError extends Error {
  readonly pos: number;
  constructor(message: string, pos: number) {
    super(message);
    this.name = 'ParseError';
    this.pos = pos;
  }
}

/** 見た目が同じ別の文字を、内部で使う 1 種類に寄せる。 */
const NORMALIZE: Record<string, string> = {
  '×': '*',
  '✕': '*',
  '⋅': '*',
  '·': '*',
  '÷': '/',
  '−': '-', // U+2212 MINUS SIGN
  'ー': '-',
  '（': '(',
  '）': ')',
  '　': ' ',
};

const OPS = new Set<string>(['+', '-', '*', '/', '^', '√']);

const isDigit = (ch: string): boolean => ch >= '0' && ch <= '9';
const isAlpha = (ch: string): boolean => /[A-Za-z]/.test(ch);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const raw = input.charAt(i);
    const ch = NORMALIZE[raw] ?? raw;

    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i += 1;
      continue;
    }

    // π は識別子 pi として扱う
    if (raw === 'π') {
      tokens.push({ type: 'ident', text: 'pi', pos: i });
      i += 1;
      continue;
    }

    if (isDigit(ch) || (ch === '.' && isDigit(input.charAt(i + 1)))) {
      const start = i;
      while (isDigit(input.charAt(i))) i += 1;
      let fracDigits = 0;
      if (input.charAt(i) === '.') {
        i += 1;
        if (!isDigit(input.charAt(i))) {
          throw new ParseError('小数点のあとに数字がありません', i);
        }
        while (isDigit(input.charAt(i))) {
          i += 1;
          fracDigits += 1;
        }
      }
      const text = input.slice(start, i);
      const digits = text.replace('.', '');
      tokens.push({
        type: 'number',
        text,
        value: rat(BigInt(digits), pow10(fracDigits)),
        pos: start,
      });
      continue;
    }

    if (isAlpha(ch)) {
      const start = i;
      while (isAlpha(input.charAt(i))) i += 1;
      tokens.push({ type: 'ident', text: input.slice(start, i), pos: start });
      continue;
    }

    if (OPS.has(ch)) {
      tokens.push({ type: 'op', text: ch as OpText, pos: i });
      i += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', pos: i });
      i += 1;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen', pos: i });
      i += 1;
      continue;
    }

    throw new ParseError(`使えない文字です: ${raw}`, i);
  }

  tokens.push({ type: 'eof', pos: input.length });
  return tokens;
}
