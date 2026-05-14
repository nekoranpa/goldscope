# Vercel API 設定手順

## GitHubに置くファイル構成

```
goldscope.ai/
├── index.html          ← メイン画面
├── admin.html          ← 管理者ログイン
├── api/
│   └── gold.js         ← 価格取得API（このファイル）
├── vercel.json         ← Vercel設定（このファイル）
└── package.json        ← 不要（Serverless Functionのみなら不要）
```

## Vercel環境変数設定

Vercel Dashboard → Project → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `ALPHA_VANTAGE_KEY` | `KQ0JM9V617AQX62W` |

## gold-api.com が失敗する原因

Vercel Serverless からの外部fetch が失敗するケース:
1. `export default` は正しい ✅
2. Node.js 18以上では `fetch` がビルトイン ✅  
3. **よくある原因**: `vercel.json` の runtime 指定が古い → nodejs20.x に更新
4. **確認方法**: Vercel Dashboard → Functions → Logs でエラー確認

## ログイン変更

admin.html のログイン条件を変更してください：
```javascript
// 変更前
if(id === 'admin' && pw === 'goldscope')
// 変更後  
if(id === 'soundterrace' && pw === '0000')
```
