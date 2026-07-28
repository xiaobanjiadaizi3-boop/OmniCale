/**
 * GitHub Pages 用の配置スクリプト。
 *
 * Pages の設定が「Deploy from a branch → main / (root)」なので、
 * ビルド結果をリポジトリ直下に置く必要がある。
 * apps/web/dist をそのままコピーし、古いハッシュ付きアセットは毎回捨てる。
 */
import { existsSync } from 'node:fs';
import { cp, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'apps', 'web', 'dist');

if (!existsSync(dist)) {
  console.error('apps/web/dist がありません。先に npm run build を実行してください。');
  process.exit(1);
}

// ハッシュ付きファイル名なので、消さないと古い版が溜まり続ける
await rm(join(root, 'assets'), { recursive: true, force: true });
await cp(dist, root, { recursive: true });

// Jekyll に処理させない（Vite の出力をそのまま配信する）
await writeFile(join(root, '.nojekyll'), '');

const copied = await readdir(dist);
console.log(`リポジトリ直下に配置しました: ${copied.join(', ')}, .nojekyll`);
