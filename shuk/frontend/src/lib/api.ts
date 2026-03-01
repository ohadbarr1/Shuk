/**
 * Typed API client for the Shuk backend.
 * All monetary values are in ILS (₪).
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Company {
  id: number;
  symbol: string;
  name_he: string;
  name_en: string | null;
  sector: string | null;
  industry: string | null;
  market_cap_ils: number | null;
  description_he: string | null;
  listing_date: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface Metrics {
  symbol: string;
  revenue_cagr_5y: number | null;
  eps_cagr_5y: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  roic: number | null;
  fcf_yield: number | null;
  trailing_dividend_yield: number | null;
  pe_ratio: number | null;
  ev_to_ebitda: number | null;
}

export interface DCFRequest {
  base_fcf: number;
  growth_rates: number[];
  terminal_growth: number;
  discount_rate: number;
  terminal_multiple: number | null;
  shares_outstanding: number;
  net_debt: number;
  current_price: number | null;
}

export interface DCFResponse {
  intrinsic_value: number;
  intrinsic_value_per_share: number;
  upside_pct: number | null;
  projected_fcfs: number[];
  pv_fcfs: number[];
  terminal_value: number;
  pv_terminal_value: number;
  total_pv: number;
  assumptions: Record<string, unknown>;
  sensitivity: Array<{
    discount_rate: number;
    terminal_multiple: number | null;
    intrinsic_value_per_share: number;
  }>;
}

export interface PricePoint {
  trade_date: string;
  close_price: string | null;
  adjusted_close: string | null;
  volume: number | null;
}

export interface DividendRecord {
  ex_date: string;
  payment_date: string | null;
  amount_ils: string;
  dividend_yield: string | null;
  dividend_type: string;
}

export interface ScreenerFilters {
  sector?: string[];
  market_cap_min?: number;
  market_cap_max?: number;
  pe_max?: number;
  net_margin_min?: number;
  revenue_cagr_min?: number;
  dividend_yield_min?: number;
}

export interface ScreenerItem {
  symbol: string;
  name_he: string;
  sector: string | null;
  market_cap_ils: number | null;
  pe_ratio: number | null;
  net_margin: number | null;
  revenue_cagr_5y: number | null;
  dividend_yield: number | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  companies: {
    list: (params?: { q?: string; sector?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams();
      if (params?.q) qs.set("q", params.q);
      if (params?.sector) qs.set("sector", params.sector);
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.offset) qs.set("offset", String(params.offset));
      return request<Company[]>(`/api/v1/companies?${qs}`);
    },
    get: (symbol: string) => request<Company>(`/api/v1/companies/${symbol}`),
    metrics: (symbol: string) => request<Metrics>(`/api/v1/companies/${symbol}/metrics`),
    dcf: (symbol: string, body: DCFRequest) =>
      request<DCFResponse>(`/api/v1/companies/${symbol}/dcf`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    prices: (symbol: string, from?: string, to?: string) => {
      const qs = new URLSearchParams();
      if (from) qs.set("from_date", from);
      if (to) qs.set("to_date", to);
      return request<PricePoint[]>(`/api/v1/companies/${symbol}/prices?${qs}`);
    },
    dividends: (symbol: string) =>
      request<DividendRecord[]>(`/api/v1/companies/${symbol}/dividends`),
  },

  screener: (filters: ScreenerFilters) =>
    request<ScreenerItem[]>("/api/v1/screener", {
      method: "POST",
      body: JSON.stringify(filters),
    }),
};
