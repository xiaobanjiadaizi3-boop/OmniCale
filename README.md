# OmniCale

多機能電卓アプリ。「答えだけ出す電卓」ではなく、**解き方をフォルダツリーで掘れる電卓**を目指す。

現在 **Phase 1（値の表現）** まで実装済み。設計と全体計画は [`docs/design.md`](docs/design.md) を参照。

## 構成

```
packages/core   計算エンジン。UI に一切依存しない
apps/web        Web UI（React + Vite）
```

## 開発

```bash
npm install
npm test          # core のテスト
npm run typecheck # 全体の型チェック
npm run dev       # Web を http://localhost:5173 で起動
```

## Phase 1 でできること

√ や π を含む値は表示形が 1 つに決まらないため、**厳密値のまま保持しておき、表示の直前にすべての表し方を展開する**。

```ts
import { representations, sqrtRational, rat } from '@omnicale/core';

representations(sqrtRational(rat(8n))!);
// 厳密値   = 2√2
// 小数     ≈ 2.8284271247
// 近似分数 ≈ 2786/985
// 科学表記 ≈ 2.828427125×10⁰
```

各表現は `isExact` を持ち、UI は `=`（誤差なし）と `≈`（近似）を厳密に使い分ける。

対応している値は有理数・二次無理数 `a + b√c`・π の有理数倍。複素数や `√2 + √3` のような異なる √ の和は Phase 2 の記号式層で扱う。
