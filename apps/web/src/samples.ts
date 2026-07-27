/**
 * Phase 1 時点ではパーサ (Phase 2) がまだないので、代表的な値をコードで組み立てて見せる。
 * label は「ユーザーがこう入力したつもり」の見た目で、値そのものは正規化済み。
 */
import {
  exactPi,
  exactRational,
  makeRadical,
  rat,
  sqrtExact,
  sqrtRational,
  type Exact,
} from '@omnicale/core';

export type Sample = { label: string; value: Exact };

const must = (v: Exact | null, what: string): Exact => {
  if (v === null) throw new Error(`サンプルの構築に失敗しました: ${what}`);
  return v;
};

export const SAMPLES: Sample[] = [
  { label: '√8', value: must(sqrtRational(rat(8n)), '√8') },
  { label: '1/√2', value: makeRadical(rat(0n), rat(1n, 2n), 2n) },
  { label: '1 + √2', value: makeRadical(rat(1n), rat(1n), 2n) },
  {
    label: '√(3 + 2√2)',
    value: must(sqrtExact(makeRadical(rat(3n), rat(2n), 2n)), '√(3+2√2)'),
  },
  { label: '(-3 + √5) / 2', value: makeRadical(rat(-3n, 2n), rat(1n, 2n), 5n) },
  { label: 'π', value: exactPi(rat(1n)) },
  { label: 'π/6', value: exactPi(rat(1n, 6n)) },
  { label: 'π/8', value: exactPi(rat(1n, 8n)) },
  { label: '1/7', value: exactRational(rat(1n, 7n)) },
  { label: '22/7', value: exactRational(rat(22n, 7n)) },
  { label: '1/4', value: exactRational(rat(1n, 4n)) },
  { label: '123456', value: exactRational(rat(123456n)) },
];
