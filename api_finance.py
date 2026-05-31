"""
Stock Financial Analyzer API v4 — 纯评分引擎 + Yahoo代理
数据由后端通过Clash代理抓取 Yahoo Finance, 浏览器无需翻墙
启动: python api_finance.py [端口]  默认 9000
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse
from pathlib import Path
import math
import requests as req_lib
import json

app = FastAPI(title="财报分析系统 v4")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

PROXY_URL = "http://127.0.0.1:17897"
PROXY_DICT = {"http": PROXY_URL, "https": PROXY_URL}

def sf(v, d=0.0):
    """安全转float, 处理 '27.15%', '4.54T' 等格式"""
    if v is None or v == "" or v == "N/A": return d
    s = str(v).replace(",", "").replace("$", "").replace(" ", "")
    if s.endswith("%"): return float(s[:-1]) / 100.0
    if s.endswith("T"): return float(s[:-1]) * 1e12
    if s.endswith("B"): return float(s[:-1]) * 1e9
    if s.endswith("M"): return float(s[:-1]) * 1e6
    if s.endswith("K"): return float(s[:-1]) * 1e3
    try: return float(s)
    except: return d

def predict_growth(data):
    scores, st, rs = {}, [], []

    qr = sf(data.get("revGrowth"))
    if qr > 0.20: rs2 = 20
    elif qr > 0.10: rs2 = 16
    elif qr > 0.05: rs2 = 12
    elif qr > 0: rs2 = 8
    elif qr > -0.05: rs2 = 4
    else: rs2 = 0
    if rs2 >= 16: st.append(f"营收同比+{qr*100:.1f}%，扩张强劲")
    elif rs2 <= 4 and qr <= 0: rs.append(f"营收仅+{qr*100:.1f}%，关注天花板")
    scores["收入增长"] = rs2

    pm = sf(data.get("profitMargin"))
    qe = sf(data.get("earnGrowth"))
    if pm > 0.20 and qe > 0.15: es = 20
    elif pm > 0.10 and qe > 0.05: es = 16
    elif pm > 0.05: es = 12
    elif pm > 0: es = 6
    else: es = 0
    if es >= 16: st.append(f"净利润率{pm*100:.1f}%，盈利优秀")
    if pm < 0: rs.append(f"亏损中（利润率{pm*100:.1f}%）")
    scores["盈利质量"] = es

    de_pct = sf(data.get("debtEquity"))
    cr_val = sf(data.get("currentRatio"))
    if de_pct < 50 and cr_val > 1.5: hs = 20; st.append(f"负债率{de_pct:.0f}%，现金充裕")
    elif de_pct < 100 and cr_val > 1.0: hs = 14
    elif de_pct < 150: hs = 8
    else: hs = 2; rs.append(f"负债率{de_pct:.0f}%，杠杆风险偏高")
    scores["财务健康"] = hs

    roe = sf(data.get("roe"))
    if roe > 0.20: ef = 20
    elif roe > 0.15: ef = 16
    elif roe > 0.10: ef = 12
    elif roe > 0.05: ef = 8
    elif roe > 0: ef = 4
    else: ef = 0
    if roe > 0.15: st.append(f"ROE {roe*100:.1f}%，回报卓越")
    if roe < 0.05: rs.append(f"ROE仅{roe*100:.1f}%，回报偏低")
    scores["回报效率"] = ef

    pe = sf(data.get("trailingPE"))
    pg = sf(data.get("pegRatio"))
    if pg > 0 and pg < 1.5: vs = 20; st.append(f"PEG {pg:.2f}，估值偏低")
    elif pg > 0 and pg < 2.5: vs = 16
    elif pe > 0 and pe < 15: vs = 14; st.append(f"P/E {pe:.1f}，低位")
    elif pe > 50: vs = 4; rs.append(f"P/E高{pe:.1f}，估值偏高")
    elif pe == 0: vs = 6
    else: vs = 10
    scores["估值合理性"] = vs

    ts = sum(scores.values())
    if ts >= 80: rt, zh = "STRONG_BUY", "强力看涨"; pr = min(95, 55 + ts * 0.45)
    elif ts >= 65: rt, zh = "BUY", "偏多看好"; pr = 45 + (ts - 65) * 0.6
    elif ts >= 45: rt, zh = "HOLD", "中性持有"; pr = 30 + (ts - 45) * 0.5
    elif ts >= 25: rt, zh = "CAUTION", "谨慎观望"; pr = 15 + (ts - 25) * 0.5
    else: rt, zh = "AVOID", "建议规避"; pr = max(0, ts * 0.5)

    return {
        "total_score": ts, "growth_probability": round(pr, 1),
        "rating": rt, "label_zh": zh,
        "breakdown": [{"category": k, "score": v, "max": 20} for k, v in scores.items()],
        "strengths": st, "risks": rs,
        "debt_to_equity": round(de_pct, 1), "current_ratio": round(cr_val, 2)
    }

# ===== API =====

@app.get("/api/proxy")
async def yahoo_proxy(url: str = Query(...)):
    """代理抓取 Yahoo Finance 页面 (通过Clash)"""
    try:
        r = req_lib.get(url,
            proxies=PROXY_DICT,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
            },
            timeout=20)
        return PlainTextResponse(content=r.text, status_code=r.status_code)
    except Exception as e:
        raise HTTPException(502, f"代理请求失败: {str(e)[:200]}")

@app.get("/api/quotes")
async def quotes(symbols: str = Query(...)):
    """批量获取股价 (通过Yahoo v8 chart API)"""
    syms = [s.strip().upper() for s in symbols.split(",") if s.strip()][:80]
    results = []
    for sym in syms:
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=5d"
            r = req_lib.get(url, proxies=PROXY_DICT,
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=10)
            if r.status_code == 200:
                d = r.json()
                meta = d.get("chart",{}).get("result",[{}])[0].get("meta",{})
                results.append({
                    "symbol": sym,
                    "price": meta.get("regularMarketPrice"),
                    "change": meta.get("regularMarketPrice",0) - meta.get("previousClose",0) if meta.get("regularMarketPrice") else None,
                    "changePct": meta.get("regularMarketPrice",0)/meta.get("previousClose",1)*100-100 if meta.get("previousClose") else None,
                    "currency": meta.get("currency","USD")
                })
            else:
                results.append({"symbol": sym, "price": None, "error": f"HTTP {r.status_code}"})
        except Exception as e:
            results.append({"symbol": sym, "price": None, "error": str(e)[:80]})
    return {"status": "success", "data": results}

@app.get("/api/chart/{symbol}")
async def chart_data(symbol: str, rng: str = "3mo"):
    """获取K线数据 (Yahoo v8 chart API)"""
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range={rng}&includePrePost=false"
        r = req_lib.get(url, proxies=PROXY_DICT, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
        if r.status_code != 200:
            raise HTTPException(502, f"Yahoo HTTP {r.status_code}")
        d = r.json()
        result = d.get("chart",{}).get("result",[{}])[0]
        timestamps = result.get("timestamp",[])
        quotes = result.get("indicators",{}).get("quote",[{}])[0]
        meta = result.get("meta",{})
        candles = []
        for i in range(len(timestamps)):
            candles.append({
                "t": timestamps[i], "o": quotes.get("open",[None])[i],
                "h": quotes.get("high",[None])[i], "l": quotes.get("low",[None])[i],
                "c": quotes.get("close",[None])[i], "v": quotes.get("volume",[None])[i],
            })
        return {"status":"success","data":{"symbol":symbol,"currency":meta.get("currency","USD"),
            "price":meta.get("regularMarketPrice"),"prevClose":meta.get("previousClose"),"candles":candles}}
    except HTTPException: raise
    except Exception as e: raise HTTPException(502, str(e)[:200])

@app.post("/api/score")
async def score(data: dict):
    try:
        pr = predict_growth(data)
        return {"status": "success", "data": {"prediction": pr}}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(500, str(e))

HTML_FILE = Path(__file__).parent / "stock_analyzer.html"

@app.get("/", response_class=HTMLResponse)
async def root():
    return HTML_FILE.read_text(encoding="utf-8") if HTML_FILE.exists() else "not found"

if __name__ == "__main__":
    import uvicorn, sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9000
    print(f"\n{'='*50}")
    print(f"  财报分析系统 v4.0")
    print(f"  数据: 后端通过Clash代理抓取Yahoo Finance")
    print(f"  访问: http://127.0.0.1:{port}")
    print(f"{'='*50}\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
