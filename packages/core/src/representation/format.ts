/**
 * 厳密値の表示文字列。
 *
 * 「入力どおりの形」(√8 と書いたのに 2√2 と出る、1/√2 と書いたのに √2/2 と出る) は
 * 値からは復元できない。それは Phase 2 の Expr 層が保持する責務。
 * ここが担うのは正規化された値そのものの表示。
 */

import { babs, blcm } from '../util/bigint.js';
import { toMixed, type Rational } from '../value/rational.js';
import type { Exact } from '../value/exact.js';

export const SQRT = '√';
export const PI = 'π';

export function formatRational(r: Rational): string {
  return r.d === 1n ? r.n.toString() : `${r.n}/${r.d}`;
}

/** 帯分数。1 未満の値や整数はそのまま分数・整数表示に落ちる。 */
export function formatMixed(r: Rational): string {
  const { sign, whole, n, d } = toMixed(r);
  const s = sign < 0 ? '-' : '';
  if (n === 0n) return `${s}${whole}`;
  if (whole === 0n) return `${s}${n}/${d}`;
  return `${s}${whole} ${n}/${d}`;
}

function radicalTerm(coeff: bigint, c: bigint): string {
  if (coeff === 1n) return `${SQRT}${c}`;
  if (coeff === -1n) return `-${SQRT}${c}`;
  return `${coeff}${SQRT}${c}`;
}

/** a + b√c を (A + B√c)/D の形で表示する。 */
export function formatRadical(a: Rational, b: Rational, c: bigint): string {
  const den = blcm(a.d, b.d);
  const A = a.n * (den / a.d);
  const B = b.n * (den / b.d);

  if (A === 0n) {
    const body = radicalTerm(B, c);
    return den === 1n ? body : `${body}/${den}`;
  }

  const sign = B > 0n ? '+' : '-';
  const body = `${A} ${sign} ${radicalTerm(babs(B), c)}`;
  return den === 1n ? body : `(${body})/${den}`;
}

export function formatPiMultiple(coeff: Rational): string {
  if (coeff.d === 1n) {
    if (coeff.n === 1n) return PI;
    if (coeff.n === -1n) return `-${PI}`;
    return `${coeff.n}${PI}`;
  }
  if (coeff.n === 1n) return `${PI}/${coeff.d}`;
  if (coeff.n === -1n) return `-${PI}/${coeff.d}`;
  return `${coeff.n}${PI}/${coeff.d}`;
}

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
};

/** 指数を上付き文字にする。10^-1 ではなく 10⁻¹ と出すため。 */
export function superscript(n: number): string {
  return Array.from(String(n))
    .map((ch) => SUPERSCRIPT[ch] ?? ch)
    .join('');
}

export function formatExact(v: Exact): string {
  switch (v.kind) {
    case 'rational':
      return formatRational(v.value);
    case 'radical':
      return formatRadical(v.a, v.b, v.c);
    case 'pi':
      return formatPiMultiple(v.coeff);
  }
}
