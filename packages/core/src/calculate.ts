/**
 * 文字列を入れると結果が返る、UI 向けの窓口。
 *
 * Phase 3 の電卓 UI もここを呼ぶ。UI が parse / evaluate / representations の
 * 組み合わせ方を知らずに済むようにしておく。
 */

import { formatScaled } from './numeric/decimal.js';
import {
  DEFAULT_SETTINGS,
  representations,
  type FormatSettings,
  type Representation,
} from './representation/index.js';
import type { Exact } from './value/exact.js';
import { MathError, evaluateExact, evaluateNumeric } from './expr/evaluate.js';
import { parse } from './expr/parse.js';
import { ParseError } from './expr/tokenize.js';
import { printExpr } from './expr/print.js';
import type { Expr } from './expr/ast.js';

export type CalcOutcome =
  /** 厳密値に畳めた。全表現を出せる。 */
  | {
      readonly kind: 'exact';
      readonly expr: Expr;
      readonly printed: string;
      readonly value: Exact;
      readonly representations: readonly Representation[];
    }
  /** 厳密値には畳めないので小数で答えた。 */
  | {
      readonly kind: 'approx';
      readonly expr: Expr;
      readonly printed: string;
      readonly display: string;
      readonly note: string;
    }
  | { readonly kind: 'error'; readonly message: string; readonly pos: number | null };

export function calculate(
  input: string,
  overrides: Partial<FormatSettings> = {},
): CalcOutcome {
  const settings: FormatSettings = { ...DEFAULT_SETTINGS, ...overrides };

  let expr: Expr;
  try {
    expr = parse(input);
  } catch (error) {
    if (error instanceof ParseError) return { kind: 'error', message: error.message, pos: error.pos };
    throw error;
  }

  const printed = printExpr(expr);

  try {
    const exact = evaluateExact(expr);
    if (exact !== null) {
      return {
        kind: 'exact',
        expr,
        printed,
        value: exact,
        representations: representations(exact, settings),
      };
    }

    const digits = settings.decimalDigits;
    return {
      kind: 'approx',
      expr,
      printed,
      display: formatScaled(evaluateNumeric(expr, digits), digits),
      note: `厳密な形にまとめられないため小数で計算（小数点以下 ${digits} 桁）`,
    };
  } catch (error) {
    if (error instanceof MathError) return { kind: 'error', message: error.message, pos: null };
    throw error;
  }
}
