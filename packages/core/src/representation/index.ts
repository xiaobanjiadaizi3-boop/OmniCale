/**
 * 1 つの値に対する「すべての表し方」を列挙する層。
 *
 * √ や π を含む値は表示形が一意に決まらないので、UI は主表現を 1 つ選び、
 * 残りを「他の表し方」として展開できるようにする。
 * 誤差があるものは isExact = false になり、UI 側で = ではなく ≈ を付ける。
 */

import {
  decimalIsExact,
  formatRepeating,
  formatScaled,
  repeatingDecimal,
  toDecimalString,
  toEngineering,
  toScientific,
} from '../numeric/decimal.js';
import { bestApproximation } from '../numeric/continuedFraction.js';
import {
  ONE,
  isZero,
  rat,
  ratAbs,
  ratCmp,
  ratFloor,
  ratMul,
  ratScaled,
  ratSign,
  ratSub,
  terminatingDecimalPlaces,
  type Rational,
} from '../value/rational.js';
import type { Exact } from '../value/exact.js';
import { formatExact, formatMixed, formatRational, PI, SQRT, superscript } from './format.js';
import { LABELS, type Locale, type RepresentationId } from './labels.js';

export type Representation = {
  readonly id: RepresentationId;
  readonly label: string;
  readonly display: string;
  /** false の場合、display は近似値。UI は = ではなく ≈ を使う。 */
  readonly isExact: boolean;
  readonly note?: string;
};

export type FormatSettings = {
  /** 小数表示の小数点以下桁数 */
  decimalDigits: number;
  /** 科学表記・工学表記の有効桁数 */
  significantDigits: number;
  /** 近似分数の分母の上限 */
  maxApproxDenominator: bigint;
  locale: Locale;
};

export const DEFAULT_SETTINGS: FormatSettings = {
  decimalDigits: 10,
  significantDigits: 10,
  maxApproxDenominator: 1000n,
  locale: 'ja',
};

const DEGREE = '°';
const MINUTE = '′';
const SECOND = '″';

function formatRationalDecimal(r: Rational, digits: number): string {
  return formatScaled(ratScaled(r, digits), digits);
}

/** 有限小数なら小数で、そうでなければ分数で表示する。 */
function formatRationalSmart(r: Rational, digits: number): string {
  const places = terminatingDecimalPlaces(r);
  if (places !== null && places <= digits) return formatRationalDecimal(r, digits);
  return formatRational(r);
}

function toDms(deg: Rational): { sign: -1 | 0 | 1; d: bigint; m: bigint; s: Rational } {
  const sign = ratSign(deg);
  const abs = ratAbs(deg);
  const d = ratFloor(abs);
  const remD = ratSub(abs, rat(d));
  const minutes = ratMul(remD, rat(60n));
  const m = ratFloor(minutes);
  const s = ratMul(ratSub(minutes, rat(m)), rat(60n));
  return { sign, d, m, s };
}

export function representations(
  value: Exact,
  overrides: Partial<FormatSettings> = {},
): Representation[] {
  const settings: FormatSettings = { ...DEFAULT_SETTINGS, ...overrides };
  const labels = LABELS[settings.locale];
  const { decimalDigits, significantDigits, maxApproxDenominator } = settings;
  const out: Representation[] = [];

  const push = (
    id: RepresentationId,
    display: string,
    isExact: boolean,
    note?: string,
  ): void => {
    out.push(note === undefined
      ? { id, label: labels[id], display, isExact }
      : { id, label: labels[id], display, isExact, note });
  };

  // --- 厳密形（全種類共通） ---
  push('exact', formatExact(value), true);

  // --- 有理数固有 ---
  if (value.kind === 'rational') {
    const r = value.value;

    if (r.d !== 1n && ratCmp(ratAbs(r), ONE) > 0) {
      push('mixed', formatMixed(r), true);
    }

    const places = terminatingDecimalPlaces(r);
    if (places === null) {
      const rd = repeatingDecimal(r);
      if (rd !== null) {
        push('repeating', formatRepeating(rd), true, `循環節 ${rd.repeating.length} 桁`);
      }
    }

    // 整数の百分率 (14 → 1400%) は情報がないので出さない
    if (r.d !== 1n) {
      const pct = ratMul(r, rat(100n));
      const pctPlaces = terminatingDecimalPlaces(pct);
      push(
        'percent',
        `${formatRationalDecimal(pct, decimalDigits)}%`,
        pctPlaces !== null && pctPlaces <= decimalDigits,
      );
    }
  }

  // --- 二次無理数固有 ---
  if (value.kind === 'radical' && isZero(value.a) && ratCmp(ratAbs(value.b), ONE) < 0) {
    // b√c の b が 1 未満のときは k/√c の形が「有理化する前」の自然な姿
    const k = ratMul(value.b, rat(value.c));
    if (k.d === 1n) {
      push('unrationalized', `${k.n}/${SQRT}${value.c}`, true);
    }
  }

  // --- π 固有 ---
  if (value.kind === 'pi') {
    const deg = ratMul(value.coeff, rat(180n));
    const degPlaces = terminatingDecimalPlaces(deg);
    const degBody = formatRationalSmart(deg, decimalDigits);
    push(
      'degree',
      degPlaces === null ? `(${degBody})${DEGREE}` : `${degBody}${DEGREE}`,
      true,
    );

    const { sign, d, m, s } = toDms(deg);
    const secPlaces = terminatingDecimalPlaces(s);
    const secExact = secPlaces !== null && secPlaces <= 4;
    push(
      'dms',
      `${sign < 0 ? '-' : ''}${d}${DEGREE}${m}${MINUTE}${formatRationalDecimal(s, 4)}${SECOND}`,
      secExact,
    );

    const coeffPlaces = terminatingDecimalPlaces(value.coeff);
    push(
      'piCoeffDecimal',
      `${formatRationalDecimal(value.coeff, decimalDigits)}${PI}`,
      coeffPlaces !== null && coeffPlaces <= decimalDigits,
    );
  }

  // --- 小数（全種類共通） ---
  push(
    'decimal',
    toDecimalString(value, decimalDigits),
    decimalIsExact(value, decimalDigits),
    `小数点以下 ${decimalDigits} 桁`,
  );

  // --- 近似分数（無理数のみ。有理数はそれ自体が分数なので出さない） ---
  if (value.kind !== 'rational') {
    const approx = bestApproximation(value, maxApproxDenominator);
    if (approx !== null && approx.d !== 1n) {
      push('approxFraction', formatRational(approx), false, `分母 ${maxApproxDenominator} 以下`);
    }
  }

  // --- 指数表記 ---
  // 値が 0 のときは指数が定まらない。指数が 0 のとき (×10⁰) は情報がないので出さない。
  const sci = toScientific(value, significantDigits);
  if (sci !== null && sci.exponent !== 0) {
    const sigExact = decimalIsExact(value, Math.max(0, significantDigits - 1 - sci.exponent));
    push('scientific', `${sci.mantissa}×10${superscript(sci.exponent)}`, sigExact);
    const eng = toEngineering(value, significantDigits);
    const engDisplay = eng === null ? null : `${eng.mantissa}×10${superscript(eng.exponent)}`;
    // 指数が 3 の倍数のときは科学表記と同じ文字列になるので、重複した行は出さない
    if (engDisplay !== null && engDisplay !== `${sci.mantissa}×10${superscript(sci.exponent)}`) {
      push('engineering', engDisplay, sigExact);
    }
  }

  return out;
}

/** 主表現 (厳密値) を 1 つだけ取り出す。 */
export function primaryRepresentation(
  value: Exact,
  overrides: Partial<FormatSettings> = {},
): Representation {
  return representations(value, overrides)[0] as Representation;
}

export * from './format.js';
export * from './labels.js';
