# OmniCale

多機能電卓アプリ。「答えだけ出す電卓」ではなく、**解き方をフォルダツリーで掘れる電卓**を目指す。

**公開先: https://xiaobanjiadaizi3-boop.github.io/OmniCale/**

現在 **Phase 2（式の入力と評価）** まで実装済み。設計と全体計画は [`docs/design.md`](docs/design.md) を参照。

## 構成

```
packages/core   計算エンジン。UI に一切依存しない
apps/web        Web UI（React + Vite）
index.html      GitHub Pages 用のビルド結果（自動生成・直接編集しない）
assets/         同上
```

## 開発

```bash
npm install
npm test          # core のテスト
npm run typecheck # 全体の型チェック
npm run dev       # Web を http://localhost:5173 で起動
```

## 公開（GitHub Pages）

Pages の設定は「Deploy from a branch → `main` / `(root)`」なので、
ビルド結果をリポジトリ直下に置いて main に push すると反映される。

```bash
npm run build:pages   # ビルドしてリポジトリ直下に配置
git add -A && git commit -m "..." && git push
```

`vite.config.ts` の `base` は Pages の URL に合わせて `/OmniCale/` にしてある。
リポジトリ名を変えるとここも直す必要がある。

## できること

式を打つと、厳密な形にまとめられるものは厳密値で答え、まとめられないものは高精度の小数で答える。

```ts
import { calculate } from '@omnicale/core';

calculate('√8 + √2');   // 厳密値 = 3√2
calculate('√2 × √3');   // 厳密値 = √6
calculate('1/√2');      // 厳密値 = √2/2   （分母が有理化される）
calculate('√(3 + 2√2)');// 厳密値 = 1 + √2 （二重根号が外れる）
calculate('π/6 + π/3'); // 厳密値 = π/2、度数法 = 90°
calculate('0.1 + 0.2'); // 厳密値 = 3/10、小数 = 0.3（誤差なし）
calculate('√2 + √3');   // 小数   ≈ 3.1462643699（厳密な形にまとめられないため）
```

√ や π を含む値は表示形が 1 つに決まらないため、**厳密値のまま保持しておき、表示の直前にすべての表し方を展開する**。各表現は `isExact` を持ち、UI は `=`（誤差なし）と `≈`（近似）を厳密に使い分ける。

使える記法: `+ - × ÷ ^ ( )`、`√`、`π`、小数、暗黙の掛け算（`2(3+4)`、`2π`、`2√3`）。
`sin` / `log` などの関数、変数を含む式、複素数は今後のフェーズで対応する。
