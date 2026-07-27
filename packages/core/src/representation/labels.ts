/**
 * 表現のラベル辞書。
 *
 * 表示文字列をロジックに直書きしないための層。多言語化と表現のブレ防止を兼ねる。
 * 新しい表現を足すときは RepresentationId と全ロケールのラベルを同時に追加する
 * (Record 型なので、片方だけ足すと型エラーになる)。
 */

export type RepresentationId =
  | 'exact'
  | 'mixed'
  | 'decimal'
  | 'repeating'
  | 'percent'
  | 'scientific'
  | 'engineering'
  | 'degree'
  | 'dms'
  | 'piCoeffDecimal'
  | 'unrationalized'
  | 'approxFraction';

export type Locale = 'ja' | 'en';

export const LABELS: Record<Locale, Record<RepresentationId, string>> = {
  ja: {
    exact: '厳密値',
    mixed: '帯分数',
    decimal: '小数',
    repeating: '循環小数',
    percent: '百分率',
    scientific: '科学表記',
    engineering: '工学表記',
    degree: '度数法',
    dms: '度分秒',
    piCoeffDecimal: 'π 倍表記',
    unrationalized: '有理化する前',
    approxFraction: '近似分数',
  },
  en: {
    exact: 'Exact',
    mixed: 'Mixed number',
    decimal: 'Decimal',
    repeating: 'Repeating decimal',
    percent: 'Percent',
    scientific: 'Scientific',
    engineering: 'Engineering',
    degree: 'Degrees',
    dms: 'DMS',
    piCoeffDecimal: 'Multiple of π',
    unrationalized: 'Before rationalizing',
    approxFraction: 'Rational approximation',
  },
};
