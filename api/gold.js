export default async function handler(req, res) {
  try {
    const goldRes = await fetch('https://gold-api.com/price/XAU', {
      headers: { Accept: 'application/json' }
    });

    if (!goldRes.ok) {
      throw new Error('gold-api.com failed');
    }

    const goldJson = await goldRes.json();
    const price = Number(goldJson.price);

    if (!price || Number.isNaN(price)) {
      throw new Error('Invalid gold-api.com response');
    }

    return res.status(200).json({
      ok: true,
      symbol: 'XAU/USD',
      rate: price,
      bid: price - 0.5,
      ask: price + 0.5,
      mid: price,
      lastRefreshed: new Date().toISOString(),
      timeZone: 'UTC',
      source: 'gold-api.com'
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      source: 'gold-api.com',
      error: error.message
    });
  }
}
