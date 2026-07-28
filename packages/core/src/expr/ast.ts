/**
 * 式のツリー (Expr)。
 *
 * 値 (Exact) が「計算結果そのもの」なのに対して、Expr は「書かれた形」を保つ。
 * √8 と打ったら √8 のまま、1.5 と打ったら 1.5 のまま表示できるのはこの層の責務。
 *
 * ## origin（由来 ID）について
 *
 * 全ノードが origin を持つ。これは「その項がもとの式のどこから来たか」を示す識別子で、
 * 書き換え (Phase 4) のときに引き継ぐ。
 *
 *   (x+5)(x+2) → x·x + x·2 + 5·x + 5·2
 *
 * を展開したとき、各項を「どの括弧の、どの項から来たか」で色分けするために使う。
 * 後付けが極めて面倒なので、Expr を定義するこの時点で入れてある。
 *
 * add と mul は n 項にしてある。「同類項をまとめる」「展開する」といった書き換えが
 * 二分木だと結合の入れ替えだらけになるため。
 */

import type { Rational } from '../value/rational.js';

export type NumberExpr = {
  readonly kind: 'number';
  readonly value: Rational;
  /** 入力された literal そのもの。1.5 を 3/2 と表示しないために保持する。 */
  readonly text?: string;
  readonly origin: string;
};

export type ConstantExpr = { readonly kind: 'constant'; readonly name: 'pi'; readonly origin: string };
export type VariableExpr = { readonly kind: 'variable'; readonly name: string; readonly origin: string };
export type NegExpr = { readonly kind: 'neg'; readonly operand: Expr; readonly origin: string };
export type AddExpr = { readonly kind: 'add'; readonly terms: readonly Expr[]; readonly origin: string };
export type MulExpr = { readonly kind: 'mul'; readonly factors: readonly Expr[]; readonly origin: string };
export type DivExpr = {
  readonly kind: 'div';
  readonly numerator: Expr;
  readonly denominator: Expr;
  readonly origin: string;
};
export type PowExpr = {
  readonly kind: 'pow';
  readonly base: Expr;
  readonly exponent: Expr;
  readonly origin: string;
};
export type SqrtExpr = { readonly kind: 'sqrt'; readonly operand: Expr; readonly origin: string };

export type Expr =
  | NumberExpr
  | ConstantExpr
  | VariableExpr
  | NegExpr
  | AddExpr
  | MulExpr
  | DivExpr
  | PowExpr
  | SqrtExpr;

let autoCounter = 0;
/** パーサ以外で式を組み立てるときの由来 ID。 */
export function autoOrigin(): string {
  autoCounter += 1;
  return `a${autoCounter}`;
}

export const num = (value: Rational, origin = autoOrigin(), text?: string): NumberExpr =>
  text === undefined ? { kind: 'number', value, origin } : { kind: 'number', value, text, origin };

export const pi = (origin = autoOrigin()): ConstantExpr => ({ kind: 'constant', name: 'pi', origin });

export const variable = (name: string, origin = autoOrigin()): VariableExpr => ({
  kind: 'variable',
  name,
  origin,
});

export const neg = (operand: Expr, origin = autoOrigin()): NegExpr => ({
  kind: 'neg',
  operand,
  origin,
});

export const add = (terms: readonly Expr[], origin = autoOrigin()): AddExpr => ({
  kind: 'add',
  terms,
  origin,
});

export const mul = (factors: readonly Expr[], origin = autoOrigin()): MulExpr => ({
  kind: 'mul',
  factors,
  origin,
});

export const div = (numerator: Expr, denominator: Expr, origin = autoOrigin()): DivExpr => ({
  kind: 'div',
  numerator,
  denominator,
  origin,
});

export const pow = (base: Expr, exponent: Expr, origin = autoOrigin()): PowExpr => ({
  kind: 'pow',
  base,
  exponent,
  origin,
});

export const sqrt = (operand: Expr, origin = autoOrigin()): SqrtExpr => ({
  kind: 'sqrt',
  operand,
  origin,
});

export function children(e: Expr): readonly Expr[] {
  switch (e.kind) {
    case 'number':
    case 'constant':
    case 'variable':
      return [];
    case 'neg':
    case 'sqrt':
      return [e.kind === 'neg' ? e.operand : e.operand];
    case 'add':
      return e.terms;
    case 'mul':
      return e.factors;
    case 'div':
      return [e.numerator, e.denominator];
    case 'pow':
      return [e.base, e.exponent];
  }
}

/** 式が変数を含むか。含む式は Phase 2 では数値評価できない。 */
export function hasVariable(e: Expr): boolean {
  return e.kind === 'variable' || children(e).some(hasVariable);
}
