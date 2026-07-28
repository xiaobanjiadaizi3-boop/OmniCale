/**
 * 式の評価。2 段構えになっている。
 *
 *   1. 厳密評価: Exact に畳めるならそうする (√8 + √2 → 3√2)
 *   2. 数値評価: 畳めないものは高精度の固定小数点で計算する (√2 + √3 ≈ 3.1462643699)
 *
 * Phase 1 の Exact は 3 種類しか持たないので、厳密評価だけだと
 * 「この式は扱えません」が頻発する。行き止まりを作らないための 2 段目。
 */

import { divRound, isqrt, pow10 } from '../util/bigint.js';
import { isInteger, ratScaled } from '../value/rational.js';
import {
  EXACT_PI,
  addExact,
  divExact,
  exactRational,
  exactSign,
  isExactZero,
  mulExact,
  negExact,
  powExact,
  sqrtExact,
  type Exact,
} from '../value/exact.js';
import { piScaled } from '../numeric/pi.js';
import { hasVariable, type Expr } from './ast.js';

/** 計算そのものが成立しない場合（0 除算など）。厳密評価の失敗とは区別する。 */
export class MathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MathError';
  }
}

/** 指数に使える整数を取り出す。整数でなければ null。 */
function integerExponent(v: Exact): number | null {
  if (v.kind !== 'rational' || !isInteger(v.value)) return null;
  const n = v.value.n;
  if (n > 4096n || n < -4096n) return null; // 現実的な範囲に制限する
  return Number(n);
}

/**
 * 厳密評価。Exact に畳めなければ null を返す（エラーではない）。
 * 計算自体が不正な場合だけ MathError を投げる。
 */
export function evaluateExact(e: Expr): Exact | null {
  switch (e.kind) {
    case 'number':
      return exactRational(e.value);

    case 'constant':
      return EXACT_PI;

    case 'variable':
      return null;

    case 'neg': {
      const v = evaluateExact(e.operand);
      return v === null ? null : negExact(v);
    }

    case 'add': {
      let acc: Exact | null = null;
      for (const term of e.terms) {
        const v = evaluateExact(term);
        if (v === null) return null;
        acc = acc === null ? v : addExact(acc, v);
        if (acc === null) return null;
      }
      return acc;
    }

    case 'mul': {
      let acc: Exact | null = null;
      for (const factor of e.factors) {
        const v = evaluateExact(factor);
        if (v === null) return null;
        acc = acc === null ? v : mulExact(acc, v);
        if (acc === null) return null;
      }
      return acc;
    }

    case 'div': {
      const d = evaluateExact(e.denominator);
      if (d !== null && isExactZero(d)) throw new MathError('0 で割ることはできません');
      const n = evaluateExact(e.numerator);
      if (n === null || d === null) return null;
      return divExact(n, d);
    }

    case 'pow': {
      const exponent = evaluateExact(e.exponent);
      if (exponent === null) return null;
      const k = integerExponent(exponent);
      if (k === null) return null; // 整数以外の指数は数値評価にまわす
      const base = evaluateExact(e.base);
      if (base === null) return null;
      if (k < 0 && isExactZero(base)) throw new MathError('0 で割ることはできません');
      return powExact(base, k);
    }

    case 'sqrt': {
      const v = evaluateExact(e.operand);
      if (v === null) return null;
      if (exactSign(v) < 0) {
        throw new MathError('負の数の平方根は扱えません（複素数は未対応）');
      }
      return sqrtExact(v);
    }
  }
}

/** 内部計算で余分に取る桁数。 */
const GUARD = 25;

/** 固定小数点（10^scale 倍の整数）で評価する。 */
function numericAt(e: Expr, scale: number): bigint {
  const unit = pow10(scale);

  switch (e.kind) {
    case 'number':
      return ratScaled(e.value, scale);

    case 'constant':
      return piScaled(scale);

    case 'variable':
      throw new MathError(`変数 ${e.name} には値がありません`);

    case 'neg':
      return -numericAt(e.operand, scale);

    case 'add': {
      let acc = 0n;
      for (const term of e.terms) acc += numericAt(term, scale);
      return acc;
    }

    case 'mul': {
      let acc = unit;
      for (const factor of e.factors) {
        acc = divRound(acc * numericAt(factor, scale), unit);
      }
      return acc;
    }

    case 'div': {
      const d = numericAt(e.denominator, scale);
      if (d === 0n) throw new MathError('0 で割ることはできません');
      return divRound(numericAt(e.numerator, scale) * unit, d);
    }

    case 'pow': {
      const exponent = evaluateExact(e.exponent);
      const k = exponent === null ? null : integerExponent(exponent);
      if (k === null) throw new MathError('指数は整数のみ対応しています');
      const base = numericAt(e.base, scale);
      if (k === 0) return unit;
      let acc = unit;
      for (let i = 0; i < Math.abs(k); i += 1) {
        acc = divRound(acc * base, unit);
      }
      if (k > 0) return acc;
      if (acc === 0n) throw new MathError('0 で割ることはできません');
      return divRound(unit * unit, acc);
    }

    case 'sqrt': {
      const v = numericAt(e.operand, scale);
      if (v < 0n) throw new MathError('負の数の平方根は扱えません（複素数は未対応）');
      return isqrt(v * unit);
    }
  }
}

/** 数値評価。結果は 10^digits 倍された整数。 */
export function evaluateNumeric(e: Expr, digits: number): bigint {
  if (hasVariable(e)) {
    throw new MathError('変数を含む式は計算できません（Phase 4 で対応予定）');
  }
  return divRound(numericAt(e, digits + GUARD), pow10(GUARD));
}
