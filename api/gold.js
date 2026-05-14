/**
 * api/gold.js — Vercel Serverless Function
 * XAU/USD価格取得API
 * 
 * 優先順位:
 * 1. gold-api.com（無料・CORSなし問題なし・サーバー側なのでOK）
 * 2. Alpha Vantage CURRENCY_EXCHANGE_RATE
 * 3. fallback固定価格（緊急時）
 * 
 * Vercel対応: Node.js 18.x / Edge不可（fetchが動く標準Node）
 */

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || 'KQ0JM9V617AQX62W';

// gold-api.com から取得
async function fetchGoldAPI() {
  const res = await fetch('https://gold-api.com/price/XAU', {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'GoldScope/1.0'
    },
    // Vercel Serverless: cache制御
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`gold-api.com HTTP ${res.status}`);
  const data = await res.json();
  const price = Number(data.price);
  if (!price || isNaN(price) || price < 100) throw new Error(`Invalid price: ${data.price}`);
  return {
    ok: true,
    symbol: 'XAU/USD',
    rate: price,
    bid: price - 0.5,
    ask: price + 0.5,
    mid: price,
    prev_close: Number(data.prev_close) || price,
    lastRefreshed: new Date().toISOString(),
    timeZone: 'UTC',
    source: 'gold-api.com'
  };
}

// Alpha Vantage から取得（バックアップ）
async function fetchAlphaVantage() {
  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=USD&apikey=${ALPHA_VANTAGE_KEY}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`AV HTTP ${res.status}`);
  const data = await res.json();
  
  if (data.Information || data.Note) throw new Error('AV rate limit');
  if (data['Error Message']) throw new Error(data['Error Message']);
  
  const r = data['Realtime Currency Exchange Rate'];
  if (!r) throw new Error('AV: no data');
  
  const rate = parseFloat(r['5. Exchange Rate']);
  const bid = parseFloat(r['8. Bid Price']);
  const ask = parseFloat(r['9. Ask Price']);
  const mid = (bid + ask) / 2;
  
  return {
    ok: true,
    symbol: 'XAU/USD',
    rate: isNaN(mid) ? rate : mid,
    bid: isNaN(bid) ? rate - 0.5 : bid,
    ask: isNaN(ask) ? rate + 0.5 : ask,
    mid: isNaN(mid) ? rate : mid,
    lastRefreshed: r['6. Last Refreshed'],
    timeZone: r['7. Time Zone'],
    source: 'Alpha Vantage'
  };
}

export default async function handler(req, res) {
  // CORS設定（goldscope.aiとlocalhost許可）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const errors = [];

  // 1. gold-api.com を試す
  try {
    const data = await fetchGoldAPI();
    console.log(`[gold.js] gold-api.com OK: ${data.mid}`);
    return res.status(200).json(data);
  } catch (e) {
    errors.push(`gold-api.com: ${e.message}`);
    console.warn(`[gold.js] gold-api.com failed: ${e.message}`);
  }

  // 2. Alpha Vantage を試す
  try {
    const data = await fetchAlphaVantage();
    console.log(`[gold.js] Alpha Vantage OK: ${data.mid}`);
    return res.status(200).json(data);
  } catch (e) {
    errors.push(`AlphaVantage: ${e.message}`);
    console.warn(`[gold.js] AV failed: ${e.message}`);
  }

  // 3. 全失敗 → fallback（UI表示は継続させる）
  console.error('[gold.js] All sources failed:', errors);
  return res.status(200).json({
    ok: false,
    symbol: 'XAU/USD',
    rate: null,
    mid: null,
    lastRefreshed: new Date().toISOString(),
    timeZone: 'UTC',
    source: 'fallback',
    errors
  });
}
