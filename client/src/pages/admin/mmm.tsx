import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Clock,
  TrendingUp,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// ---- Types (mirror server/storage.ts + shared/schema.ts) ----
interface CreativeRow {
  compoundKey: string;
  platform: string;
  adName: string | null;
  campaignName: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  imsRevenue: number;
  aoRevenue: number;
  totalRevenue: number;
  adjustedRevenue: number;
  day0Roas: number | null;
  adjustedRoas: number | null;
  activeDays: number;
}

interface DailyTotal {
  date: string;
  creativeSpend: number;
  googleSpend: number;
  taboolaSpend: number;
  totalSpend: number;
  creativeRevenue: number;
  sourceRevenue: number;
  combinedRevenue: number;
  adjustedRevenue: number;
  roas: number | null;
  adjustedRoas: number | null;
}

interface PerformanceRow {
  date: string;
  compoundKey: string;
  platform: string;
  adName: string | null;
  spend: number;
  impressions: number;
  totalRevenue: number;
  adjustedRevenue: number;
  day0Roas: number | null;
  adjustedRoas: number | null;
}

interface PerformanceResponse {
  days: number;
  creatives: CreativeRow[];
  dailyTotals: DailyTotal[];
  rows: PerformanceRow[];
}

interface DetailRow {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  imsRevenue: number;
  aoRevenue: number;
  totalRevenue: number;
  adjustedRevenue: number;
  day0Roas: number | null;
  adjustedRoas: number | null;
}

interface DetailResponse {
  compoundKey: string;
  days: number;
  detail: DetailRow[];
}

interface RunLog {
  id: number;
  runType: string;
  runDate: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  metaRows: number;
  googleRows: number;
  imsRows: number;
  aoRows: number;
  joinedRows: number;
  totalSpend: number;
  combinedRevenue: number;
  sources: unknown;
  errors: unknown;
  aiSummary: string | null;
}

interface RunsResponse {
  runs: RunLog[];
  latest: RunLog | null;
}

// ---- Formatting helpers ----
const money = (n: number | null | undefined) =>
  `$${(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const num = (n: number | null | undefined) => (n ?? 0).toLocaleString();
const roasLabel = (r: number | null | undefined) =>
  r == null ? "—" : `${r.toFixed(2)}x`;

const roasCellClass = (r: number | null | undefined) => {
  if (r == null) return "bg-muted/30 text-muted-foreground";
  if (r >= 1.5) return "bg-green-500/10 text-green-600 dark:text-green-400";
  if (r >= 1.0) return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-red-500/10 text-red-600 dark:text-red-400";
};

const platformClass = (p: string) => {
  switch (p) {
    case "Meta":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "Google":
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    case "Taboola":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const shortDate = (d: string) => {
  try {
    return format(parseISO(d), "MMM d");
  } catch {
    return d;
  }
};

// A run stuck in "running" (e.g. the detached job was killed before it could
// write its finish state) should not disable Run Now or poll forever.
const RUN_STALE_MS = 30 * 60 * 1000;
const isRunActive = (run: RunLog | null | undefined) => {
  if (!run || run.status !== "running") return false;
  if (!run.startedAt) return false;
  return Date.now() - new Date(run.startedAt).getTime() < RUN_STALE_MS;
};

export default function Mmm() {
  const [days, setDays] = useState("30");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");

  const { data: perf, isLoading: perfLoading } = useQuery<PerformanceResponse>({
    queryKey: [`/api/mmm/performance?days=${days}`],
  });

  const { data: runsData, isLoading: runsLoading } = useQuery<RunsResponse>({
    queryKey: ["/api/mmm/runs?limit=50"],
    refetchInterval: (query) =>
      isRunActive((query.state.data as RunsResponse | undefined)?.latest)
        ? 4000
        : false,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery<DetailResponse>({
    queryKey: [`/api/mmm/creative/${encodeURIComponent(selectedKey ?? "")}?days=90`],
    enabled: !!selectedKey,
  });

  // Tick countdown to next scheduled intraday run (every 2 h on the UTC even-hour mark).
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const intervalMs = 2 * 3600_000;
      const msUntil = intervalMs - (now % intervalMs);
      const totalSec = Math.floor(msUntil / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setCountdown(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const creatives = perf?.creatives ?? [];
  const dailyTotals = perf?.dailyTotals ?? [];
  const perfRows = perf?.rows ?? [];

  // Topline aggregates over the selected window.
  const totalSpend = dailyTotals.reduce((s, d) => s + d.totalSpend, 0);
  const combinedRevenue = dailyTotals.reduce((s, d) => s + d.combinedRevenue, 0);
  const netProfit = combinedRevenue - totalSpend;
  const overallRoas = totalSpend > 0 ? combinedRevenue / totalSpend : null;

  const chartData = dailyTotals.map((d) => ({
    date: shortDate(d.date),
    Spend: Number(d.totalSpend.toFixed(2)),
    Revenue: Number(d.combinedRevenue.toFixed(2)),
  }));

  const detailChartData = (detailData?.detail ?? []).map((d) => ({
    date: shortDate(d.date),
    Spend: Number((d.spend ?? 0).toFixed(2)),
    Revenue: Number((d.totalRevenue ?? 0).toFixed(2)),
    ROAS: d.day0Roas == null ? null : Number(d.day0Roas.toFixed(2)),
  }));

  const latest = runsData?.latest;
  const runActive = isRunActive(latest);

  const dataRange = (() => {
    if (dailyTotals.length === 0) return null;
    const sorted = [...dailyTotals].map((d) => d.date).sort();
    const first = shortDate(sorted[0]);
    const last = shortDate(sorted[sorted.length - 1]);
    return first === last ? first : `${first} – ${last}`;
  })();

  const metaRows = creatives.filter((c) => c.platform === "Meta");
  const googleRows = creatives.filter((c) => c.platform === "Google");
  const metaSpendMissing = metaRows.length > 0 && metaRows.every((c) => c.spend === 0);
  const googleApiMissing = googleRows.length > 0 && googleRows.every((c) => c.impressions === 0);
  const showDataWarning = metaSpendMissing || googleApiMissing;

  return (
    <div className="p-6 space-y-6" data-testid="page-mmm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ad Revenue Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Creative-level spend vs. revenue across Meta, Google, and offer sources.
            {dataRange && (
              <span className="ml-2 font-medium text-foreground">Data: {dataRange}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32" data-testid="select-days">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <div
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            data-testid="next-run-countdown"
          >
            {runActive ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">Running now…</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Next run in</span>
                <span className="font-mono font-semibold tabular-nums">{countdown}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="performance">
        <TabsList>
          <TabsTrigger value="performance" data-testid="tab-performance">
            Performance
          </TabsTrigger>
          <TabsTrigger value="status" data-testid="tab-status">
            Pipeline Status
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Performance ---------------- */}
        <TabsContent value="performance" className="space-y-6 mt-6">
          {/* Topline cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-total-spend">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Total Spend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{money(totalSpend)}</div>
              </CardContent>
            </Card>
            <Card data-testid="card-combined-revenue">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Combined Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{money(combinedRevenue)}</div>
              </CardContent>
            </Card>
            <Card data-testid="card-roas">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Blended ROAS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    overallRoas == null
                      ? ""
                      : overallRoas >= 1
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {roasLabel(overallRoas)}
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-net-profit">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    netProfit >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {money(netProfit)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data quality notice — shown only when credentials are partially missing */}
          {showDataWarning && (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-sm space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Spend data is partially estimated — some ad platform credentials are not yet connected
              </div>
              <ul className="ml-6 space-y-1 text-amber-700 dark:text-amber-500 list-disc">
                {metaSpendMissing && (
                  <li>
                    <span className="font-medium">Meta spend shows $0</span> — the Meta access token is
                    expired or not set. Meta creatives are running but spend cannot be pulled until a
                    valid token is provided.
                  </li>
                )}
                {googleApiMissing && (
                  <li>
                    <span className="font-medium">Google &amp; Taboola spend is a rough estimate</span> —
                    the Google Ads API is not connected, so the daily sheet total is split across
                    creatives proportionally. Individual creative spend and ROAS figures are
                    approximations until Google Ads OAuth credentials are added.
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Daily trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spend vs. Revenue</CardTitle>
              <CardDescription>Daily totals over the selected window</CardDescription>
            </CardHeader>
            <CardContent>
              {perfLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : chartData.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
                  No data yet for this window.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={288}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(v: number) => money(v)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Spend"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Creative table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Creative Performance</CardTitle>
              <CardDescription>
                {`One row per creative per day. Click a row to see its full trend.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {perfLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : perfRows.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No creative data yet. Connect ad accounts and run the pipeline to
                  populate this table.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Creative</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead className="text-right">Spend</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Adj. Revenue</TableHead>
                        <TableHead className="text-right">ROAS</TableHead>
                        <TableHead className="text-right">Adj. ROAS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perfRows.map((r, i) => (
                        <TableRow
                          key={`${r.date}-${r.compoundKey}-${i}`}
                          className="cursor-pointer"
                          onClick={() => setSelectedKey(r.compoundKey)}
                          data-testid={`row-creative-${r.compoundKey}`}
                        >
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {shortDate(r.date)}
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            <div className="font-medium truncate">{r.compoundKey}</div>
                            {r.adName && (
                              <div className="text-xs text-muted-foreground truncate">{r.adName}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={platformClass(r.platform)}>
                              {r.platform}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{money(r.spend)}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(r.totalRevenue)}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(r.adjustedRevenue)}</TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-block px-2 py-0.5 rounded tabular-nums ${roasCellClass(r.day0Roas)}`}>
                              {roasLabel(r.day0Roas)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-block px-2 py-0.5 rounded tabular-nums ${roasCellClass(r.adjustedRoas)}`}>
                              {roasLabel(r.adjustedRoas)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Status ---------------- */}
        <TabsContent value="status" className="space-y-6 mt-6">
          {latest && (
            <Card data-testid="card-latest-run">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Latest Run
                  <RunStatusBadge status={latest.status} />
                </CardTitle>
                <CardDescription>
                  {latest.runType} · {latest.runDate} ·{" "}
                  {latest.startedAt
                    ? format(parseISO(latest.startedAt), "MMM d, h:mm a")
                    : "—"}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <RunStat label="Meta rows" value={num(latest.metaRows)} />
                <RunStat label="Google rows" value={num(latest.googleRows)} />
                <RunStat label="Joined rows" value={num(latest.joinedRows)} />
                <RunStat label="Total spend" value={money(latest.totalSpend)} />
                <RunStat
                  label="Combined revenue"
                  value={money(latest.combinedRevenue)}
                />
                <RunStat label="IMS rows" value={num(latest.imsRows)} />
                <RunStat label="AfterOffers rows" value={num(latest.aoRows)} />
              </CardContent>
              {Array.isArray(latest.errors) && latest.errors.length > 0 && (
                <CardContent className="pt-0">
                  <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      {(latest.errors as string[]).map((e, i) => (
                        <div key={i}>{e}</div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
              {latest.aiSummary && (
                <CardContent className="pt-0">
                  <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                    {latest.aiSummary}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Run History</CardTitle>
              <CardDescription>
                Daily and intraday pipeline runs. Runs also fire automatically on a
                schedule.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {runsLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (runsData?.runs ?? []).length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No pipeline runs yet. The pipeline runs automatically every 2 hours.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead className="text-right">Joined</TableHead>
                        <TableHead className="text-right">Spend</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(runsData?.runs ?? []).map((r) => (
                        <TableRow key={r.id} data-testid={`row-run-${r.id}`}>
                          <TableCell className="capitalize">{r.runType}</TableCell>
                          <TableCell>{r.runDate}</TableCell>
                          <TableCell>
                            <RunStatusBadge status={r.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.startedAt
                              ? format(parseISO(r.startedAt), "MMM d, h:mm a")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {num(r.joinedRows)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(r.totalSpend)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(r.combinedRevenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Creative detail dialog */}
      <Dialog
        open={!!selectedKey}
        onOpenChange={(open) => !open && setSelectedKey(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="break-all">{selectedKey}</DialogTitle>
            <DialogDescription>
              Daily spend, revenue, and ROAS (last 90 days)
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (detailData?.detail ?? []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No daily data for this creative.
            </div>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={detailChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis
                    yAxisId="left"
                    fontSize={12}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    fontSize={12}
                    tickFormatter={(v) => `${v}x`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="Spend"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="Revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="ROAS"
                    stroke="hsl(var(--chart-3, 220 70% 50%))"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailData?.detail ?? [])
                      .slice()
                      .reverse()
                      .map((d) => (
                        <TableRow key={d.date}>
                          <TableCell>{d.date}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(d.spend)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(d.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded tabular-nums ${roasCellClass(
                                d.day0Roas
                              )}`}
                            >
                              {roasLabel(d.day0Roas)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RunStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
        <CheckCircle className="h-3 w-3 mr-1" /> Success
      </Badge>
    );
  }
  if (status === "error" || status === "failed") {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
        <XCircle className="h-3 w-3 mr-1" /> Failed
      </Badge>
    );
  }
  if (status === "running") {
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground">
      {status}
    </Badge>
  );
}
