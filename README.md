# GoldScope Vision Hotfix Preview

## ファイル

- index.html
- api/gold.js

## Vercelでの使い方

1. GitHubのリポジトリにこの2つを追加します。
2. Vercelの Environment Variables に追加します。

ALPHA_VANTAGE_KEY=あなたのAlpha Vantage APIキー

3. 再デプロイします。
4. https://goldscope.ai を開いて価格が表示されるか確認します。

## 確認

DevTools → Network で `apikey` を検索し、Alpha Vantage APIキーが見えなければOKです。
