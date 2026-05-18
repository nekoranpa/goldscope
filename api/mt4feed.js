let cache = {
  bid:0,ask:0,mid:0,spread:0,symbol:'XAUUSD',
  ts:0,ohlcv:[],updatedAt:0,
};
const SECRET_KEY = process.env.MT4_SECRET_KEY || 'YOUR_SECRET_KEY_HERE';
const CACHE_TTL = 30000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();

  if(req.method==='POST'){
    try{
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
      if(body.key!==SECRET_KEY) return res.status(401).json({error:'Unauthorized'});
      const mid=parseFloat(body.mid);
      if(!mid||isNaN(mid)||mid<1000||mid>20000)
        return res.status(400).json({error:'Invalid price: '+body.mid});
      const bars=[];
      if(body.ohlcv){
        const entries=body.ohlcv.split(';').filter(s=>s.length>5);
        for(const e of entries){
          const p=e.split(',');
          if(p.length<6) continue;
          bars.push({t:parseInt(p[0])*1000,o:parseFloat(p[1]),h:parseFloat(p[2]),
            l:parseFloat(p[3]),c:parseFloat(p[4]),v:parseInt(p[5]),forming:p[6]==='1'});
        }
      }
      cache={
        bid:parseFloat(body.bid)||mid-0.3,
        ask:parseFloat(body.ask)||mid+0.3,
        mid,spread:parseFloat(body.spread)||0,
        symbol:body.symbol||'XAUUSD',
        ts:parseInt(body.ts)||Math.floor(Date.now()/1000),
        ohlcv:bars,updatedAt:Date.now(),source:'MT4/HFM',live:true,
      };
      return res.status(200).json({ok:true,mid:cache.mid,bars:bars.length});
    }catch(e){
      return res.status(500).json({error:e.message});
    }
  }

  if(req.method==='GET'){
    const age=Date.now()-cache.updatedAt;
    if(!cache.mid||age>CACHE_TTL)
      return res.status(503).json({
        error:'MT4 data unavailable',age,
        message:'MT4接続なし。EAが動作しているか確認してください。'
      });
    return res.status(200).json({
      bid:cache.bid,ask:cache.ask,mid:cache.mid,spread:cache.spread,
      symbol:cache.symbol,ts:cache.ts,ohlcv:cache.ohlcv,
      source:'MT4/HFM',live:true,ageMs:age,
      lastRefreshed:new Date(cache.updatedAt).toLocaleTimeString('ja-JP'),
    });
  }

  return res.status(405).json({error:'Method not allowed'});
}
