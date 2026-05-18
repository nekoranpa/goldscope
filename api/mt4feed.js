//+------------------------------------------------------------------+
//|  GoldScopeFeed.mq4                                               |
//|  XAUUSD リアルタイムデータを Vercel API に送信する EA             |
//|  設置場所: MT4 → Experts フォルダに入れてコンパイル              |
//+------------------------------------------------------------------+
#property copyright "GoldScope Vision"
#property version   "1.00"
#property strict

//--- 設定パラメータ
extern string VercelEndpoint = "https://goldscope.vercel.app/api/mt4feed";
extern string SecretKey      = "YOUR_SECRET_KEY_HERE"; // Vercel環境変数と合わせる
extern int    SendIntervalSec = 5;   // 送信間隔（秒）
extern int    BarCount        = 300; // 送信するバー数（ヒストリカル）
extern string Symbol_         = "XAUUSD"; // 対象シンボル（HFMの正確な名前に合わせる）

//--- 内部変数
datetime lastSendTime = 0;
int      winsock      = 0;

//+------------------------------------------------------------------+
int OnInit(){
   Print("[GoldScopeFeed] 起動。送信先: ", VercelEndpoint);
   Print("[GoldScopeFeed] シンボル: ", Symbol_, " 間隔: ", SendIntervalSec, "秒");
   EventSetTimer(SendIntervalSec);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason){
   EventKillTimer();
   Print("[GoldScopeFeed] 停止。理由コード: ", reason);
}

//+------------------------------------------------------------------+
void OnTimer(){
   SendData();
}

// チャートのティック更新でも送信（より即時性が高い）
void OnTick(){
   if(TimeCurrent() - lastSendTime >= SendIntervalSec){
      SendData();
   }
}

//+------------------------------------------------------------------+
void SendData(){
   lastSendTime = TimeCurrent();

   // ── 現在価格 ──
   double bid   = MarketInfo(Symbol_, MODE_BID);
   double ask   = MarketInfo(Symbol_, MODE_ASK);
   double mid   = (bid + ask) / 2.0;
   double spread= (ask - bid) / Point;

   // ── 直近バーのOHLCV（確定済み + 形成中）──
   // M5（5分足）を基準に送信
   int bars = MathMin(BarCount, iBars(Symbol_, PERIOD_M5));

   string ohlcv = "";
   for(int i = bars - 1; i >= 0; i--){
      double o = iOpen (Symbol_, PERIOD_M5, i);
      double h = iHigh (Symbol_, PERIOD_M5, i);
      double l = iLow  (Symbol_, PERIOD_M5, i);
      double c = iClose(Symbol_, PERIOD_M5, i);
      long   v = iVolume(Symbol_, PERIOD_M5, i);
      datetime t = iTime(Symbol_, PERIOD_M5, i);

      // i=0は形成中バー（フラグ付き）
      string forming = (i == 0) ? "1" : "0";
      ohlcv += IntegerToString((int)t) + "," +
               DoubleToStr(o, 2) + "," +
               DoubleToStr(h, 2) + "," +
               DoubleToStr(l, 2) + "," +
               DoubleToStr(c, 2) + "," +
               IntegerToString(v) + "," +
               forming + ";";
   }

   // ── JSONペイロード組み立て ──
   string json = "{";
   json += "\"key\":\"" + SecretKey + "\",";
   json += "\"symbol\":\"" + Symbol_ + "\",";
   json += "\"bid\":"  + DoubleToStr(bid, 2)  + ",";
   json += "\"ask\":"  + DoubleToStr(ask, 2)  + ",";
   json += "\"mid\":"  + DoubleToStr(mid, 2)  + ",";
   json += "\"spread\":" + DoubleToStr(spread, 1) + ",";
   json += "\"ts\":"   + IntegerToString((int)TimeCurrent()) + ",";
   json += "\"ohlcv\":\"" + ohlcv + "\"";
   json += "}";

   // ── HTTP POST ──
   // MT4のWebRequest（許可リストにVercelドメインを追加すること）
   // MT4: ツール → オプション → エキスパートアドバイザー → WebRequest許可URLに追加
   // 追加URL: https://goldscope.vercel.app

   char   post[];
   char   result[];
   string headers = "Content-Type: application/json\r\n";
   string resultStr;
   int    timeout = 3000; // 3秒タイムアウト

   StringToCharArray(json, post, 0, StringLen(json));

   int res = WebRequest(
      "POST",
      VercelEndpoint,
      headers,
      timeout,
      post,
      result,
      resultStr
   );

   if(res == 200){
      // 成功（ログ量削減のためコメントアウト推奨）
      // Print("[GoldScopeFeed] 送信成功: $", DoubleToStr(mid, 2));
   } else if(res == -1){
      Print("[GoldScopeFeed] WebRequest失敗。URLが許可リストにあるか確認してください。");
      Print("[GoldScopeFeed] MT4: ツール→オプション→エキスパートアドバイザー→WebRequest許可URL");
      Print("[GoldScopeFeed] 追加URL: https://goldscope.vercel.app");
   } else {
      Print("[GoldScopeFeed] HTTPエラー: ", res, " | ", resultStr);
   }
}
//+------------------------------------------------------------------+
