/**
 * 厳密値 → 小数。
 *
 * ここが「厳密な世界」と「表示の世界」の境界。approxScaled より下流でだけ誤差が生じる。
 * 誤差が入った値は必ず isExact = false として扱い、表示では = ではなく ≈ を使う。
 */

import { babs, divRound, isqrt, pow10 } from '../util/bigint.js';
import {
  ratAbs,
  ratScaled,
  ratSign,
  terminatingDecimalPlaces,
  type Rational,
} from '../value/rational.js';
import type { Exact } from '../value/exact.js';
import { piScaled } from './pi.js';

/** 内部計算で余分に取る桁数。丸めが末尾桁に影響しないようにするため。 */
const GUARD = 20;

/** value × 10^scale を四捨五入した整数。scale ≥ 0。 */
export function approxScaled(v: Exact, scale: number): bigint {
  if (scale < 0) throw new RangeError('approxScaled: scale は 0 以上');
  switch (v.kind) {
    case 'rational':
      return ratScaled(v.value, scale);
    case 'radical': {
      const s = scale + GUARD;
      const root = isqrt(v.c * pow10(2 * s)); // √c × 10^s
      const b = ratScaled(v.b, s); // b × 10^s
      const bRoot = divRound(b * root, pow10(s)); // b√c × 10^s
      const a = ratScaled(v.a, s);
      return divRound(a + bRoot, pow10(GUARD));
    }
    case 'pi': {
      const s = scale + GUARD;
      const p = piScaled(s);
      const coeff = ratScaled(v.coeff, s);
      return divRound(divRound(coeff * p, pow10(s)), pow10(GUARD));
    }
  }
}

/** value × 10^place。place が負の場合も扱う。 */
export function scaledAtPlace(v: Exact, place: number): bigint {
  if (place >= 0) return approxScaled(v, place);
  const shift = -place;
  return divRound(approxScaled(v, GUARD), pow10(GUARD + shift));
}

/** scaled (= 値 × 10^digits) を小数文字列にする。 */
export function formatScaled(scaled: bigint, digits: number, trimTrailingZeros = true): string {
  const negative = scaled < 0n;
  let s = babs(scaled).toString();
  if (digits === 0) return (negative ? '-' : '') + s;
  if (s.length <= digits) s = '0'.repeat(digits - s.length + 1) + s;
  const intPart = s.slice(0, s.length - digits);
  let frac = s.slice(s.length - digits);
  if (trimTrailingZeros) frac = frac.replace(/0+$/, '');
  const body = frac.length > 0 ? `${intPart}.${frac}` : intPart;
  return (negative ? '-' : '') + body;
}

export function toDecimalString(v: Exact, digits: number, trimTrailingZeros = true): string {
  return formatScaled(approxScaled(v, digits), digits, trimTrailingZeros);
}

/** その桁数で小数が「誤差なし」に表せるか。無理数は常に false。 */
export function decimalIsExact(v: Exact, digits: number): boolean {
  if (v.kind !== 'rational') return false;
  const places = terminatingDecimalPlaces(v.value);
  return places !== null && places <= digits;
}

export type RepeatingDecimal = {
  readonly sign: -1 | 0 | 1;
  readonly intPart: string;
  /** 循環しない小数部 */
  readonly nonRepeating: string;
  /** 循環節。空文字なら有限小数。 */
  readonly repeating: string;
};

/**
 * 筆算を再現して循環節を求める。余りが再登場した時点が循環の開始。
 * 循環節が maxPeriod を超える場合は null (表示に適さないため)。
 */
export function repeatingDecimal(r: Rational, maxPeriod = 2000): RepeatingDecimal | null {
  const sign = ratSign(r);
  const a = ratAbs(r);
  const intPart = (a.n / a.d).toString();
  let rem = a.n % a.d;

  const seen = new Map<string, number>();
  const digits: string[] = [];
  let periodStart = -1;

  while (rem !== 0n) {
    const key = rem.toString();
    const prev = seen.get(key);
    if (prev !== undefined) {
      periodStart = prev;
      break;
    }
    seen.set(key, digits.length);
    rem *= 10n;
    digits.push((rem / a.d).toString());
    rem %= a.d;
    if (digits.length > maxPeriod) return null;
  }

  if (periodStart < 0) {
    return { sign, intPart, nonRepeating: digits.join(''), repeating: '' };
  }
  return {
    sign,
    intPart,
    nonRepeating: digits.slice(0, periodStart).join(''),
    repeating: digits.slice(periodStart).join(''),
  };
}

/** 循環節の最初と最後の数字の上に点を打つ (日本の教科書の記法)。 */
export function formatRepeating(d: RepeatingDecimal): string {
  const sign = d.sign < 0 ? '-' : '';
  if (d.repeating.length === 0) {
    return sign + d.intPart + (d.nonRepeating.length > 0 ? `.${d.nonRepeating}` : '');
  }
  const DOT_ABOVE = '̇';
  const p = d.repeating;
  const marked =
    p.length === 1
      ? p + DOT_ABOVE
      : p.charAt(0) + DOT_ABOVE + p.slice(1, -1) + p.charAt(p.length - 1) + DOT_ABOVE;
  return `${sign}${d.intPart}.${d.nonRepeating}${marked}`;
}

/** 10 の指数部。0 のときは null。 */
function decimalExponent(v: Exact): number | null {
  for (const probe of [40, 200]) {
    const s = approxScaled(v, probe);
    if (s !== 0n) return babs(s).toString().length - 1 - probe;
  }
  return null;
}

function trimMantissa(s: string): string {
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

/** 科学表記。1.23×10^5 の mantissa と exponent を返す。 */
export function toScientific(
  v: Exact,
  sigDigits: number,
): { mantissa: string; exponent: number } | null {
  const exp0 = decimalExponent(v);
  if (exp0 === null) return null;

  let exponent = exp0;
  let m = scaledAtPlace(v, sigDigits - 1 - exponent);
  // 9.99 → 10.0 のように丸め上がって桁が増えた場合は指数を繰り上げてやり直す
  if (babs(m).toString().length > sigDigits) {
    exponent += 1;
    m = scaledAtPlace(v, sigDigits - 1 - exponent);
  }

  const sign = m < 0n ? '-' : '';
  const s = babs(m).toString().padStart(sigDigits, '0');
  const mantissa = sigDigits === 1 ? s : `${s.slice(0, 1)}.${s.slice(1)}`;
  return { mantissa: sign + trimMantissa(mantissa), exponent };
}

/** 工学表記。指数を 3 の倍数に揃える。 */
export function toEngineering(
  v: Exact,
  sigDigits: number,
): { mantissa: string; exponent: number } | null {
  const sci = toScientific(v, sigDigits);
  if (sci === null) return null;

  const exponent = Math.floor(sci.exponent / 3) * 3;
  const intLen = sci.exponent - exponent + 1;
  const m = scaledAtPlace(v, sigDigits - 1 - sci.exponent);
  const sign = m < 0n ? '-' : '';
  const s = babs(m).toString().padStart(sigDigits, '0');
  const mantissa = s.length > intLen ? `${s.slice(0, intLen)}.${s.slice(intLen)}` : s;
  return { mantissa: sign + trimMantissa(mantissa), exponent };
}
