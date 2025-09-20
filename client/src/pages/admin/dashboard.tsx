import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/admin/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Target,
  ChartArea,
  Trophy,
  Clock
} from "lucide-react";

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
  });

  const { data: topOffers, isLoading: offersLoading } = useQuery({
    queryKey: ['/api/dashboard/top-offers'],
  });

  const { data: recentCompletions, isLoading: completionsLoading } = useQuery({
    queryKey: ['/api/dashboard/recent-completions'],
  });

  if (metricsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Today's Revenue"
          value={`$${metrics?.todayRevenue?.toFixed(2) || '0.00'}`}
          change="+12.5%"
          changeType="positive"
          icon={DollarSign}
          data-testid="metric-revenue"
        />
        
        <MetricCard
          title="Active Users"
          value={metrics?.activeUsers?.toString() || '0'}
          change="+8.3%"
          changeType="positive"
          icon={Users}
          data-testid="metric-users"
        />
        
        <MetricCard
          title="Conversion Rate"
          value={`${metrics?.conversionRate?.toFixed(2) || '0.00'}%`}
          change="-2.1%"
          changeType="negative"
          icon={TrendingUp}
          data-testid="metric-conversion"
        />
        
        <MetricCard
          title="Avg Revenue/User"
          value={`$${metrics?.avgRevenue?.toFixed(2) || '0.00'}`}
          change="Target: $3.00+"
          changeType="neutral"
          icon={Target}
          data-testid="metric-avg-revenue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card data-testid="card-revenue-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartArea className="h-5 w-5" />
              Revenue Trend (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 bg-gradient-to-br from-primary/20 to-primary/5 rounded-md flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ChartArea className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chart Implementation Required</p>
                <p className="text-xs opacity-75">Integrate with Recharts library</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Offers */}
        <Card data-testid="card-top-offers">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Top Performing Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {offersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {topOffers?.map((offer: any, index: number) => (
                  <div 
                    key={offer.id} 
                    className="flex items-center justify-between p-3 bg-accent rounded-md"
                    data-testid={`offer-${offer.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{offer.name}</p>
                        <p className="text-xs text-muted-foreground">{offer.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600 text-sm">
                        ${offer.totalRevenue || '0.00'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {offer.totalConversions || 0} conversions
                      </p>
                    </div>
                  </div>
                ))}
                
                {(!topOffers || topOffers.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No offers available</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card data-testid="card-recent-activity">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent User Completions
            </CardTitle>
            <Button variant="ghost" size="sm" data-testid="button-view-all">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {completionsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Source</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Revenue</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Completed</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCompletions?.map((user: any) => (
                    <tr 
                      key={user.id} 
                      className="border-b border-border hover:bg-muted/50"
                      data-testid={`completion-${user.id}`}
                    >
                      <td className="py-3 px-3">
                        <div>
                          <p className="text-sm font-medium">{user.email}</p>
                          <p className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}</p>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm">{user.source || 'Direct'}</td>
                      <td className="py-3 px-3 text-sm font-medium text-green-600">
                        ${user.totalRevenue || '0.00'}
                      </td>
                      <td className="py-3 px-3 text-sm text-muted-foreground">
                        {new Date(user.updatedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          {user.postbackFired ? 'Completed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  
                  {(!recentCompletions || recentCompletions.length === 0) && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No recent completions</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
