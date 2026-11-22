[![Competition](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![Rank](https://make.fun/badge/token-radar-01/Yakik2014/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01)
[![Reward](https://make.fun/badge/token-radar-01/Yakik2014/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

# トークン・ローンチ・レーダー（make.fun token-radar-01 / v3）

make.fun バウンティ「Build the best token launch radar」（賞金 $1,325、締切 2026-12-14 10:00 UTC）への提出物です。

DefiLlama の封印スナップショット（`snapshot.json`）を読み、「まだトークンを記録していない」プロトコルを抽出し、ローンチした場合の推定価値でランキングしたボードと、ファーム手順つきダッシュボードを生成します。v3 は公式キットのスターター構成（`main.ts` / `lib/model.ts` / `vendor/makefun-board.ts`）を土台に、評価モデルを自前のピア中央値モデルへ差し替えた版です。`vendor/makefun-board.ts` はキット原本そのまま（sha256: `9ca51b6e5cd84fe46cb0efa61e2ea99365a1fb0e21f2b75e6007f977f0dc326e`、kit.json の記載と一致）。

## 入力（スナップショット形式）

グレーダーが `/input/snapshot.json` を渡します（`--input <file|dir>` でも指定可）。

- `as_of` / `source` / `floor_usd`（このスナップショットでは $50,000,000）
- `protocols[]`: 全プロトコル（TVL $5M 以上）。フィールドは `slug, name, category, chains, tvl_usd, change_7d, mcap_usd, listed_at, gecko_id, symbol` の10件のみ
- `watchlist[]`: ハウス定義のウォッチリスト（TVL がフロア以上、トークン無し、版数名でない、Bridge / Canonical Bridge / Liquid Staking / Liquid Restaking / Restaked BTC / CEX でない、名前に wrapped / staked / staking を含まず取引所名で始まらない）の slug 一覧

ボードはウォッチリスト全件を必ず含み（フロアは下限であって上限ではない）、さらにフロア未満の未発行プロトコルを TVL 順に最大160件「アーリー」として追加します（全200行）。

## 評価モデル（peer-median-3）

推定価値はスナップショット自身の数字だけで決まります。名前による特別扱いはしません。

1. ピア = トークンを記録したプロトコル（`mcap_usd > 0` かつ `tvl_usd > 0`）。倍率 = `mcap_usd / tvl_usd`
2. カテゴリ倍率 = そのカテゴリのピア倍率の**中央値**。ピアが8件未満のカテゴリは、件数に応じて全体中央値へ縮小（シュリンケージ）。ピア0件なら全体中央値
3. 倍率は **×0.02〜×2.5** にクランプ
4. 推定価値 = `TVL × カテゴリ倍率 × 成長倍率 × 成熟度倍率`
   - 成長倍率: 7日変化を -60%〜+120% にクランプし、重み 0.5
   - 成熟度倍率: 追跡開始からの日数で 0.6〜1.0（1095日で上限、開始日不明は365日として計算）

## 実行方法

```
node main.ts --input <snapshot.json>
# 入力: /input/snapshot.json（既定）または --input
# 出力: $MAKEFUN_OUTPUT_DIR（無ければ /output）に board.json / data.js / dashboard/ / screenshots/ / dossier.json
```

- Node 22.18+ 前提の素の TypeScript（型ストリッピングで実行、ビルド不要）。ネットワーク不使用、決定的（時刻・乱数なし）
- `board.json` は `{"rows": [...]}` 形式。全行に推定価値とファーム計画（手順・コスト・所要時間）が入ります
- `dossier.json` は最後に `vendor/makefun-board.ts` の `buildDossier` で生成します（スコアラーが再生成してバイト単位で照合します）

## ファイル構成

| パス | 内容 |
| --- | --- |
| `main.ts` | エントリポイント（入力読込 → ゲート確認 → 出力、dossier は最後） |
| `lib/model.ts` | モデル v3（ピア中央値倍率、ボード生成、ゲート `boardIssue`、ファーム計画） |
| `vendor/makefun-board.ts` | make.fun 公式 dossier ライブラリ（キット原本、無改変） |
| `board.json` / `dossier.json` | キット同梱スナップショットでの生成結果（提出用コピー） |
| `dashboard/` | オフライン動作する静的ダッシュボード（`index.html` / `app.css` / `app.js`、生成された `data.js` を読む） |
| `screenshots/` | ダッシュボードのスクリーンショット3枚（**v3 の画面で撮り直し予定**。現在はキットスターターのプレースホルダ） |
| `LICENSE` | MIT（SPDX 行つき） |

## 本提出までに残っていること

1. スクリーンショット3枚を v3 ダッシュボードで撮り直す（ボード／詳細／フィルター適用後）
2. キット CLI によるトランスクリプト bundle の作成
3. Solana ウォレットでのエントリーメッセージ署名と make.fun への提出
4. GitHub About への website（make.fun）と topic `makefun` の設定
