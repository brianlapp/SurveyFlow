import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign,
  Download,
  Calendar,
  Target,
  Activity
} from "lucide-react";
import { addDays } from "date-fns";

export default function Analytics() {
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const { data: dailyStats, isLoading } = useQuery({
    queryKey: ['/api/analytics/daily-stats', dateRange.from.toISOString(), dateRange.to.toISOString()],
  });

  const { data: metrics } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
  });

  const totalStats = dailyStats?.reduce((acc: any, day: any) => ({
    totalUsers: acc.totalUsers + (day.totalUsers || 0),
    completedSurveys: acc.completedSurveys + (day.completedSurveys || 0),
    totalRevenue: acc.totalRevenue + parseFloat(day.totalRevenue || '0'),
    postbacksFired: acc.postbacksFired + (day.postbacksFired || 0),
  }), { totalUsers: 0, completedSurveys: 0, totalRevenue: 0, postbacksFired: 0 }) || {};

  return (
    <div className="p-6 space-y-6" data-testid="analytics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics & Reports</h2>
          <p className="text-muted-foreground">Analyze performance metrics and trends</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" data-testid="button-export-report">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button data-testid="button-schedule-report">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Date Range</h3>
              <p className="text-sm text-muted-foreground">Select date range for analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              <DatePickerWithRange
                date={dateRange}
                onDateChange={(range) => range && setDateRange(range)}
                data-testid="date-range-picker"
              />
              <Select defaultValue="daily">
                <SelectTrigger className="w-32" data-testid="select-granularity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold" data-testid="metric-total-users">
                  {totalStats.totalUsers?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-blue-600 mt-1">Current period</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Surveys</p>
                <p className="text-2xl font-bold" data-testid="metric-completed-surveys">
                  {totalStats.completedSurveys?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {totalStats.totalUsers > 0 
                    ? `${((totalStats.completedSurveys / totalStats.totalUsers) * 100).toFixed(1)}% completion rate`
                    : '0% completion rate'
                  }
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600" data-testid="metric-total-revenue">
                  ${totalStats.totalRevenue?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Avg: ${totalStats.completedSurveys > 0 
                    ? (totalStats.totalRevenue / totalStats.completedSurveys).toFixed(2)
                    : '0.00'
                  } per user
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Postbacks Fired</p>
                <p className="text-2xl font-bold" data-testid="metric-postbacks">
                  {totalStats.postbacksFired?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {totalStats.completedSurveys > 0 
                    ? `${((totalStats.postbacksFired / totalStats.completedSurveys) * 100).toFixed(1)}% conversion rate`
                    : '0% conversion rate'
                  }
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <Card data-testid="card-revenue-trend">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72" />
            ) : (
              <div className="h-72 bg-gradient-to-br from-primary/20 to-primary/5 rounded-md flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Revenue Chart</p>
                  <p className="text-xs opacity-75">Daily revenue over selected period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card data-testid="card-conversion-funnel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                  <span className="text-sm font-medium">Users Started</span>
                  <span className="text-lg font-bold text-blue-600">
                    {totalStats.totalUsers?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                  <span className="text-sm font-medium">Surveys Completed</span>
                  <span className="text-lg font-bold text-green-600">
                    {totalStats.completedSurveys?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-md">
                  <span className="text-sm font-medium">Postbacks Fired</span>
                  <span className="text-lg font-bold text-purple-600">
                    {totalStats.postbacksFired?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-md">
                  <span className="text-sm font-medium">Avg Revenue/User</span>
                  <span className="text-lg font-bold text-orange-600">
                    ${totalStats.completedSurveys > 0 
                      ? (totalStats.totalRevenue / totalStats.completedSurveys).toFixed(2)
                      : '0.00'
                    }
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source Performance */}
      <Card data-testid="card-source-performance">
        <CardHeader>
          <CardTitle>Source Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Source</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Users</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Completed</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Revenue</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Avg/User</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-3 font-medium">Facebook Ads</td>
                    <td className="py-3">1,234</td>
                    <td className="py-3">987</td>
                    <td className="py-3 text-green-600">$2,961.00</td>
                    <td className="py-3">$3.00</td>
                    <td className="py-3">79.9%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 font-medium">Google Ads</td>
                    <td className="py-3">856</td>
                    <td className="py-3">723</td>
                    <td className="py-3 text-green-600">$2,169.00</td>
                    <td className="py-3">$3.00</td>
                    <td className="py-3">84.5%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 font-medium">Organic</td>
                    <td className="py-3">432</td>
                    <td className="py-3">389</td>
                    <td className="py-3 text-green-600">$1,167.00</td>
                    <td className="py-3">$3.00</td>
                    <td className="py-3">90.0%</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Direct</td>
                    <td className="py-3">198</td>
                    <td className="py-3">178</td>
                    <td className="py-3 text-green-600">$534.00</td>
                    <td className="py-3">$3.00</td>
                    <td className="py-3">89.9%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
