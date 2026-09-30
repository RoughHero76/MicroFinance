// Reports (A17), performance by employee (M-10), risk overview and the
// nightly run (A18, BE-9), and diagnostics (hidden, admin).

import {api} from '@/lib/api';
import {toISODate} from '@/lib/format';
import {downloadToApp, type AppFile} from '@/lib/files';

export interface ReportSummary {
  totalLoans: number;
  totalLoanAmount: number;
  totalPaidAmount: number;
  totalPenaltyAmount: number;
}
export interface Bucket {
  range: string;
  count: number;
}
export interface Report {
  summary: ReportSummary;
  loanAmounts: Bucket[];
  installmentAmounts: Bucket[];
}

export const reportKeys = {
  report: (from: string, to: string) => ['reports', from, to] as const,
  performance: (month: string) => ['reports', 'performance', month] as const,
  risk: ['risk'] as const,
  cron: ['risk', 'cron'] as const,
};

export async function getReport(from: Date, to: Date): Promise<Report> {
  const res = await api.get<{
    analysis: {summary: ReportSummary; graphData: {loanAmounts: Bucket[]; installmentAmounts: Bucket[]}};
  }>('/admin/loan/report', {format: 'raw', startDate: toISODate(from), endDate: toISODate(to)});
  return {
    summary: res.analysis.summary,
    loanAmounts: res.analysis.graphData.loanAmounts ?? [],
    installmentAmounts: res.analysis.graphData.installmentAmounts ?? [],
  };
}

export const REPORTS_FOLDER = 'reports';

export function downloadReport(
  type: 'pdf' | 'xlsx',
  from: Date,
  to: Date,
  onProgress?: (p: number) => void,
): Promise<AppFile> {
  const start = toISODate(from);
  const end = toISODate(to);
  const name = `report_${start}_to_${end}.${type}`;
  return downloadToApp(`/admin/loan/report?type=${type}&startDate=${start}&endDate=${end}`, REPORTS_FOLDER, name, {
    onProgress,
  });
}

export interface PerformanceRow {
  employee: {_id: string; uid: string; name: string; profilePic?: string | null};
  due: number;
  collected: number;
  percent: number | null;
  overdueLoans: number;
}
export interface Performance {
  rows: PerformanceRow[];
  totals: {due: number; collected: number; percent: number | null};
}

export async function getPerformance(month: string): Promise<Performance> {
  const res = await api.get<{data: Performance}>('/admin/loan/report/performance', {month});
  return res.data;
}

export interface RiskOverview {
  activeLoans: number;
  overdueLoans: number;
  totalOverdue: number;
  averageOverdue: number;
  buckets: Record<'sma0' | 'sma1' | 'sma2' | 'npa', {count: number; overdue: number}>;
  thresholds: {sma0: number; sma1: number; sma2: number};
  lastRun: {at: string; status: string; error?: string} | null;
}

export async function getRiskOverview(): Promise<RiskOverview> {
  const res = await api.get<{data: RiskOverview}>('/shared/loan/status/overview');
  return res.data;
}

export async function runSettlement(): Promise<{lastRunAt: string | null; lastStatus: string}> {
  const res = await api.post<{data: {lastRunAt: string | null; lastStatus: string}}>(
    '/shared/loan/repayment/schedule/update',
    {},
    {timeout: 120000},
  );
  return res.data;
}

// --- Diagnostics (hidden: 5 taps on the version in About)

export interface CronJob {
  name: string;
  schedule: string;
  status: string;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  durationMs: number | null;
  error: string | null;
}
export interface ClientError {
  _id: string;
  message: string;
  screen?: string;
  appVersion?: string;
  device?: string;
  role?: string;
  createdAt: string;
}

export async function getCronStatus(): Promise<CronJob[]> {
  const res = await api.get<{data: CronJob[]}>('/admin/system/cron-status');
  return res.data ?? [];
}

export async function getClientErrors(): Promise<ClientError[]> {
  const res = await api.get<{data: ClientError[]}>('/shared/client-errors', {limit: 50});
  return res.data ?? [];
}

export async function getLoanDiagnostics(): Promise<unknown> {
  return api.get('/admin/loan/diagnostic');
}
