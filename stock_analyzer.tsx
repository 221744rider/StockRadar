import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, TrendingUp, BarChart3, DollarSign, Activity,
  ShieldAlert, ShieldCheck, Target, Loader2, X, ChevronRight,
  PieChart, ArrowUpRight, ArrowDownRight, Key, Building2,
  AlertTriangle, CheckCircle2, RefreshCw, Info, Zap
} from 'lucide-react';

// ==================== 类型定义 ====================
interface PredictionResult {
  total_score: number;
  growth_probability: number;
  rating: string;
  label_zh: string;
  label_en: string;
  breakdown: { category: string; score: number; max: number }[];
  strengths: string[];
  risks: string[];
  debt_to_equity: number;
  current_ratio: number;
}

interface CompanyInfo {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: string;
  pe_ratio: string;
  eps: string;
  profit_margin: string;
  roe: string;
  rev_growth: string;
  description: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
}

interface FinancialData {
  income: any[];
  balance: any[];
  cashflow: any[];
}

// ==================== 后端通信 ====================
const API = 'http://127.0.0.1:8001';

const api = {
  health: () => fetch(`${API}/api/health`).then(r => r.json()),
  setKey: (key: string) =>
    fetch(`${API}/api/config/key`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    }).then(r => r.json()),
  search: (q: string) =>
    fetch(`${API}/api/search?q=${encodeURIComponent(q)}`).then(r => r.json()),
  predict: (symbol: string) =>
    fetch(`${API}/api/predict/${symbol}`).then(r => r.json()),
  financials: (symbol: string) =>
    fetch(`${API}/api/financials/${symbol}`).then(r => r.json()),
};

// ==================== 工具函数 ====================
const fmtNum = (val: any, decimals = 2) => {
  const n = parseFloat(val);
  if (isNaN(n)) return '--';
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(decimals) + 'T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(decimals) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(decimals) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(decimals) + 'K';
  return n.toFixed(decimals);
};

const fmtPct = (val: any) => {
  const n = parseFloat(val);
  if (isNaN(n)) return '--';
  return (n * 100).toFixed(2) + '%';
};

// ==================== 主应用 ====================
export default function StockAnalyzer() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [settingKey, setSettingKey] = useState(false);
  const [keyError, setKeyError] = useState('');

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [financials, setFinancials] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'predict' | 'income' | 'balance' | 'cashflow'>('predict');
  const [toast, setToast] = useState('');

  // 初始化检查 Key
  useEffect(() => {
    api.health().then(d => setHasKey(d.has_key)).catch(() => setHasKey(false));
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // 设置 API Key
  const handleSetKey = async () => {
    setSettingKey(true); setKeyError('');
    try {
      await api.setKey(apiKeyInput);
      setHasKey(true);
      showToast('✅ API Key 验证通过');
    } catch (e: any) {
      setKeyError('验证失败，请检查 Key 是否正确');
    }
    setSettingKey(false);
  };

  // 搜索
  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 1) { setSearchResults([]); setShowResults(false); return; }
    if (q.length < 2) return;
    setSearching(true);
    try {
      const res = await api.search(q);
      if (res.status === 'success') {
        setSearchResults(res.data);
        setShowResults(true);
      }
    } catch (e) {
      setError('搜索失败，请检查后端服务');
    }
    setSearching(false);
  }, []);

  // 选择公司并运行预测
  const selectCompany = async (symbol: string, name?: string) => {
    setSelectedSymbol(symbol);
    setShowResults(false);
    setQuery(name || symbol);
    setError('');
    setCompany(null);
    setPrediction(null);
    setLoading(true);

    try {
      const [predRes, finRes] = await Promise.all([
        api.predict(symbol),
        api.financials(symbol),
      ]);

      if (predRes.status === 'success') {
        setCompany(predRes.data.company);
        setPrediction(predRes.data.prediction);
      } else {
        setError(predRes.message || '预测失败');
      }

      if (finRes.status === 'success') {
        setFinancials(finRes.data);
      }
    } catch (e: any) {
      if (e.message?.includes('401')) {
        setHasKey(false);
        setError('API Key 未配置或已失效');
      } else {
        setError('网络请求失败，请检查后端是否运行在 8001 端口');
      }
    }
    setLoading(false);
  };

  // 得分颜色
  const scoreColor = (s: number) => {
    if (s >= 16) return 'bg-emerald-500';
    if (s >= 12) return 'bg-blue-500';
    if (s >= 8) return 'bg-yellow-500';
    if (s >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const ratingColor = (rating: string) => {
    switch (rating) {
      case 'STRONG_BUY': return 'from-emerald-500 to-teal-400';
      case 'BUY': return 'from-blue-500 to-cyan-400';
      case 'HOLD': return 'from-yellow-500 to-amber-400';
      case 'CAUTION': return 'from-orange-500 to-red-400';
      default: return 'from-red-600 to-rose-500';
    }
  };

  // ==================== API Key 设置页面 ====================
  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-[#0A0F14] text-gray-300 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-[#111820] border border-[#1E2B31] rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
              <Key className="text-blue-400 w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-100">配置 Alpha Vantage Key</h1>
          </div>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            需要一个免费的 Alpha Vantage API Key 来获取财报数据。
            <br />
            <a href="https://www.alphavantage.co/support/#api-key"
               target="_blank" className="text-blue-400 underline ml-1">
              点此免费获取 (30秒搞定)
            </a>
          </p>
          <input
            type="text"
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            placeholder="粘贴你的 API Key..."
            className="w-full bg-[#0B1113] border border-[#1E2B31] rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500/50 mb-4"
            onKeyDown={e => e.key === 'Enter' && handleSetKey()}
          />
          {keyError && (
            <p className="text-red-400 text-xs mb-4 flex items-center gap-1">
              <AlertTriangle size={14} /> {keyError}
            </p>
          )}
          <button
            onClick={handleSetKey}
            disabled={settingKey || apiKeyInput.length < 10}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            {settingKey ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
            验证并保存
          </button>
        </div>
      </div>
    );
  }

  if (hasKey === null) return null;

  // ==================== 主界面 ====================
  return (
    <div className="min-h-screen bg-[#0A0F14] text-gray-300 font-sans">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#131B1E] border border-emerald-500/30 px-6 py-3 rounded-xl shadow-2xl text-sm font-bold">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="h-16 border-b border-[#1E2B31] bg-[#0E1518] px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
            <TrendingUp className="text-blue-400 w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-gray-100">
            Stock Analyzer
            <span className="text-xs text-blue-400 font-bold border border-blue-500/20 bg-blue-500/5 px-2 py-0.5 rounded ml-2 uppercase">
              v1.0
            </span>
          </h1>
        </div>

        {/* Search */}
        <div className="relative w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            placeholder="输入公司名或代码搜索 (如 Apple, TSLA, 微软)..."
            className="w-full bg-[#0B1113] border border-[#1E2B31] rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500/50"
          />
          {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />}

          {/* Search dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-[#111820] border border-[#1E2B31] rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onMouseDown={() => selectCompany(r.symbol, r.name)}
                  className="w-full text-left px-4 py-3 hover:bg-[#1A2E26] border-b border-[#1E2B31]/50 flex items-center justify-between group"
                >
                  <div>
                    <span className="font-bold text-gray-200">{r.symbol}</span>
                    <span className="text-xs text-gray-500 ml-3">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{r.region}</span>
                    <ChevronRight size={14} className="text-gray-600 group-hover:text-blue-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto p-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <Loader2 size={48} className="animate-spin text-blue-400 mx-auto mb-4" />
              <p className="text-gray-400 font-bold">正在获取财报数据并运行预测模型...</p>
              <p className="text-xs text-gray-600 mt-2">首次查询可能需要几秒</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-[#131B1E] border border-red-500/20 rounded-2xl p-8 text-center">
            <AlertTriangle size={40} className="text-red-400 mx-auto mb-3" />
            <p className="text-red-400 font-bold">{error}</p>
          </div>
        )}

        {/* Results */}
        {company && prediction && !loading && (
          <div className="space-y-6">
            {/* Company Header */}
            <div className="bg-[#111820] border border-[#1E2B31] rounded-2xl p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 size={20} className="text-blue-400" />
                    <h2 className="text-2xl font-black text-gray-100">{company.name}</h2>
                    <span className="text-lg font-bold text-blue-400 font-mono">{company.symbol}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                    <span className="bg-gray-800 px-2 py-1 rounded">{company.sector}</span>
                    <span className="bg-gray-800 px-2 py-1 rounded">{company.industry}</span>
                    {company.market_cap && <span>市值: {fmtNum(company.market_cap)}</span>}
                  </div>
                  {company.description && (
                    <p className="text-gray-400 text-sm mt-3 leading-relaxed line-clamp-2">{company.description}</p>
                  )}
                </div>

                {/* Quick Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ['P/E', company.pe_ratio],
                    ['EPS', company.eps],
                    ['ROE', fmtPct(company.roe)],
                    ['利润率', fmtPct(company.profit_margin)],
                  ].map(([label, val], i) => (
                    <div key={i} className="bg-[#0B1113] border border-[#1E2B31] rounded-xl px-4 py-3 text-center min-w-[100px]">
                      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
                      <p className="text-lg font-bold text-gray-200">{fmtNum(val)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prediction Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Card */}
              <div className="bg-[#111820] border border-[#1E2B31] rounded-2xl p-6 flex flex-col items-center">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">增长概率评分</p>
                {/* Circular Score */}
                <div className="relative w-40 h-40 mb-3">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#1E2B31" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke={`url(#scoreGradient)`}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${prediction.total_score / 100 * 327} 327`}
                    />
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={
                          prediction.total_score >= 65 ? '#10b981' :
                          prediction.total_score >= 45 ? '#3b82f6' :
                          prediction.total_score >= 25 ? '#f59e0b' : '#ef4444'
                        } />
                        <stop offset="100%" stopColor={
                          prediction.total_score >= 65 ? '#14b8a6' :
                          prediction.total_score >= 45 ? '#06b6d4' :
                          prediction.total_score >= 25 ? '#f97316' : '#dc2626'
                        } />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-gray-100">{prediction.total_score}</span>
                    <span className="text-[10px] text-gray-500">/ 100</span>
                  </div>
                </div>
                <span className={`text-lg font-black bg-gradient-to-r ${ratingColor(prediction.rating)} bg-clip-text text-transparent`}>
                  {prediction.label_zh}
                </span>
                <span className="text-sm text-gray-400 mt-1">
                  增长概率: <span className="font-bold text-blue-400">{prediction.growth_probability}%</span>
                </span>
              </div>

              {/* Breakdown */}
              <div className="bg-[#111820] border border-[#1E2B31] rounded-2xl p-6">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <PieChart size={14} /> 评分明细
                </p>
                <div className="space-y-3">
                  {prediction.breakdown.map((b, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{b.category}</span>
                        <span className="font-bold text-gray-200">{b.score}/{b.max}</span>
                      </div>
                      <div className="h-2 bg-[#0B1113] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${scoreColor(b.score)}`}
                          style={{ width: `${(b.score / b.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Risks */}
              <div className="bg-[#111820] border border-[#1E2B31] rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CheckCircle2 size={14} /> 优势
                  </p>
                  {prediction.strengths.length === 0 ? (
                    <p className="text-xs text-gray-600">暂无明显优势指标</p>
                  ) : (
                    <ul className="space-y-2">
                      {prediction.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-emerald-400/80 flex items-start gap-2">
                          <span className="mt-0.5">▸</span> {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="border-t border-[#1E2B31] pt-4">
                  <p className="text-xs text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} /> 风险
                  </p>
                  {prediction.risks.length === 0 ? (
                    <p className="text-xs text-gray-600">未检测到明显风险</p>
                  ) : (
                    <ul className="space-y-2">
                      {prediction.risks.map((s, i) => (
                        <li key={i} className="text-xs text-red-400/80 flex items-start gap-2">
                          <span className="mt-0.5">▸</span> {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs: Financial Statements */}
            <div className="bg-[#111820] border border-[#1E2B31] rounded-2xl overflow-hidden">
              <div className="flex border-b border-[#1E2B31] bg-[#0A0F14]">
                {[
                  ['predict', '📊 预测总览'],
                  ['income', '📋 利润表'],
                  ['balance', '⚖️ 资产负债表'],
                  ['cashflow', '💵 现金流量表'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`px-6 py-3 text-sm font-bold transition-colors ${
                      activeTab === key
                        ? 'bg-blue-500/10 text-blue-400 border-b-2 border-blue-500'
                        : 'text-gray-500 hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'predict' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      ['综合评分', `${prediction.total_score}/100`],
                      ['增长概率', `${prediction.growth_probability}%`],
                      ['建议评级', prediction.label_zh],
                      ['负债率', `${prediction.debt_to_equity}%`],
                      ['流动比率', prediction.current_ratio.toFixed(2)],
                      ['收入增长', fmtPct(company.rev_growth)],
                      ['P/E 比率', company.pe_ratio || '--'],
                      ['ROE', fmtPct(company.roe)],
                    ].map(([label, val], i) => (
                      <div key={i} className="bg-[#0B1113] border border-[#1E2B31] rounded-xl p-4">
                        <p className="text-[10px] text-gray-500 uppercase mb-1">{label}</p>
                        <p className="text-lg font-bold text-gray-200">{val}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Financial Table */}
                {activeTab !== 'predict' && financials && (
                  <FinancialTable
                    data={activeTab === 'income' ? financials.income : activeTab === 'balance' ? financials.balance : financials.cashflow}
                    type={activeTab}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!company && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <BarChart3 size={64} className="text-gray-700 mb-6" />
            <p className="text-lg text-gray-500 font-bold mb-2">搜索一家公司开始分析</p>
            <p className="text-sm text-gray-600 max-w-md">
              支持美股和全球主要市场股票。输入公司名称或股票代码，
              系统将自动获取财报并进行多因子基本面评分。
            </p>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1E2B31; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #2A3B44; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}} />
    </div>
  );
}

// ==================== 财报表格子组件 ====================
function FinancialTable({ data, type }: { data: any[]; type: string }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-600 text-center py-8">暂无数据</p>;
  }

  const columns = data.slice(0, 6).map(d => d.date?.slice(0, 7) || '--');

  const rows: { label: string; key: string }[] = type === 'income' ? [
    { label: '总收入', key: 'totalRevenue' },
    { label: '营收成本', key: 'costOfRevenue' },
    { label: '毛利润', key: 'grossProfit' },
    { label: '运营利润', key: 'operatingIncome' },
    { label: '净利润', key: 'netIncome' },
    { label: 'EBITDA', key: 'ebitda' },
    { label: 'EPS', key: 'eps' },
    { label: '研发费用', key: 'researchAndDevelopment' },
  ] : type === 'balance' ? [
    { label: '总资产', key: 'totalAssets' },
    { label: '流动资产', key: 'totalCurrentAssets' },
    { label: '总负债', key: 'totalLiabilities' },
    { label: '流动负债', key: 'totalCurrentLiabilities' },
    { label: '股东权益', key: 'totalShareholderEquity' },
    { label: '总债务', key: 'shortLongTermDebtTotal' },
    { label: '长期债务', key: 'longTermDebt' },
    { label: '现金及等价物', key: 'cashAndShortTermInvestments' },
  ] : [
    { label: '经营现金流', key: 'operatingCashflow' },
    { label: '资本支出', key: 'capitalExpenditures' },
    { label: '投资现金流', key: 'cashflowFromInvestment' },
    { label: '融资现金流', key: 'cashflowFromFinancing' },
    { label: '净利润', key: 'profitLoss' },
    { label: '现金变动', key: 'changeInCash' },
  ];

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#1E2B31]">
            <th className="text-left py-3 pr-4 text-gray-400 font-bold sticky left-0 bg-[#111820]">项目</th>
            {columns.map((c, i) => (
              <th key={i} className="text-right py-3 px-3 text-gray-400 font-bold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[#1E2B31]/50 hover:bg-white/[0.02]">
              <td className="py-3 pr-4 text-gray-400 sticky left-0 bg-[#111820]">{row.label}</td>
              {data.slice(0, 6).map((d, ci) => (
                <td key={ci} className="py-3 px-3 text-right font-mono text-gray-300">
                  {fmtNum(d[row.key], 1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
