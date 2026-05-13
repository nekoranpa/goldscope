export default async function handler(req, res) {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: 'ALPHA_VANTAGE_KEY is not set'
    });
  }

  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'CURRENCY_EXCHANGE_RATE');
  url.searchParams.set('from_currency', 'XAU');
  url.searchParams.set('to_currency', 'USD');
  url.searchParams.set('apikey', apiKey);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' }
    });

    const json = await response.json();
    const rate = json['Realtime Currency Exchange Rate'];

    if (!rate) {
      return res.status(502).json({
        ok: false,
        source: 'Alpha Vantage',
        raw: json,
        error: 'Invalid Alpha Vantage response'
      });
    }

    const exchangeRate = Number(rate['5. Exchange Rate']);
    const bid = Number(rate['8. Bid Price']) || exchangeRate;
    const ask = Number(rate['9. Ask Price']) || exchangeRate;
    const mid = bid && ask ? (bid + ask) / 2 : exchangeRate;

    return res.status(200).json({
      ok: true,
      symbol: 'XAU/USD',
      rate: exchangeRate,
      bid,
      ask,
      mid,
      lastRefreshed: rate['6. Last Refreshed'],
      timeZone: rate['7. Time Zone'],
      source: 'Alpha Vantage'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      source: 'Alpha Vantage',
      error: error.message
    });
  }
}
