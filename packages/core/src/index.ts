/**
 * @omnicale/core
 *
 * 計算エンジン。UI には一切依存しない。
 * Phase 1 の範囲は「値の表現」まで。式・パーサ・評価器は Phase 2、
 * 書き換えエンジンと解き方ツリーは Phase 4 で追加する。
 */

export * from './util/bigint.js';
export * from './value/rational.js';
export * from './value/exact.js';
export * from './numeric/pi.js';
export * from './numeric/decimal.js';
export * from './numeric/continuedFraction.js';
export * from './representation/index.js';
