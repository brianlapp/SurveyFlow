import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Target,
  Play,
  Settings,
  Download,
  AlertTriangle,
  FileText,
  CheckCircle2,
  XCircle
} from "lucide-react";

export default function Revenue() {
  const [manualPostbackUserId, setManualPostbackUserId] = useState('');
  const [coregStartDate, setCoregStartDate] = useState('');
  const [coregStartTime, setCoregStartTime] = useState('00:00');
  const [coregEndDate, setCoregEndDate] = useState('');
  const [coregEndTime, setCoregEndTime] = useState('23:59');
  const [coregReport, setCoregReport] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: metrics } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
  });

  const manualPostbackMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('POST', `/api/postback/manual/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Manual postback fired successfully",
      });
      setManualPostbackUserId('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleManualPostback = () => {
    if (!manualPostbackUserId.trim()) return;
    manualPostbackMutation.mutate(manualPostbackUserId);
  };

  const coregReportMutation = useMutation({
    mutationFn: async ({ startDateTime, endDateTime }: { startDateTime: string; endDateTime: string }) => {
      return await apiRequest('POST', '/api/revenue/coreg-report', { startDateTime, endDateTime });
    },
    onSuccess: (data) => {
      setCoregReport(data);
      toast({
        title: "Success",
        description: "Coreg revenue report fetched successfully",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.details || error.message || "Failed to fetch revenue report";
      toast({
        title: "TMG API Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleFetchCoregReport = () => {
    if (!coregStartDate || !coregEndDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    // Format dates to MM/dd/yyyy HH:mm
    const formatDate = (date: string, time: string) => {
      const [year, month, day] = date.split('-');
      return `${month}/${day}/${year} ${time}`;
    };

    const startDateTime = formatDate(coregStartDate, coregStartTime);
    const endDateTime = formatDate(coregEndDate, coregEndTime);

    coregReportMutation.mutate({ startDateTime, endDateTime });
  };

  return (
    <div className="p-6 space-y-6" data-testid="revenue-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Revenue Tracking</h2>
          <p className="text-muted-foreground">Monitor revenue thresholds and postback management</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" data-testid="button-export-revenue">
            <Download className="h-4 w-4 mr-2" />
            Export Revenue Data
          </Button>
          <Button data-testid="button-revenue-settings">
            <Settings className="h-4 w-4 mr-2" />
            Revenue Settings
          </Button>
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold text-green-600" data-testid="metric-today-revenue">
                  ${metrics?.todayRevenue?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-green-600 mt-1">↑ vs yesterday</p>
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
                <p className="text-sm text-muted-foreground">Avg Revenue/User</p>
                <p className="text-2xl font-bold" data-testid="metric-avg-revenue">
                  ${metrics?.avgRevenue?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Target: $3.00+</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Postback Rate</p>
                <p className="text-2xl font-bold" data-testid="metric-postback-rate">
                  {metrics?.conversionRate?.toFixed(1) || '0.0'}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Users reaching threshold</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Growth</p>
                <p className="text-2xl font-bold text-green-600" data-testid="metric-revenue-growth">
                  +12.5%
                </p>
                <p className="text-xs text-green-600 mt-1">vs last week</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Postback Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Postback */}
        <Card data-testid="card-manual-postback">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Manual Postback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manually trigger a postback for a specific user ID. Use this for testing or when automatic postbacks fail.
            </p>
            
            <div className="flex space-x-3">
              <Input
                placeholder="Enter User ID"
                value={manualPostbackUserId}
                onChange={(e) => setManualPostbackUserId(e.target.value)}
                data-testid="input-manual-postback-user"
              />
              <Button 
                onClick={handleManualPostback}
                disabled={!manualPostbackUserId.trim() || manualPostbackMutation.isPending}
                data-testid="button-fire-postback"
              >
                {manualPostbackMutation.isPending ? 'Firing...' : 'Fire Postback'}
              </Button>
            </div>
            
            <div className="p-3 bg-orange-50 rounded-md flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-xs text-orange-800">
                <p className="font-medium">Warning</p>
                <p>Manual postbacks bypass normal revenue threshold checks. Use carefully.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Thresholds */}
        <Card data-testid="card-revenue-thresholds">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Revenue Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-accent rounded-md">
                <span className="text-sm font-medium">Default Threshold</span>
                <Badge variant="default">$3.00</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-accent rounded-md">
                <span className="text-sm font-medium">Facebook Ads</span>
                <Badge variant="secondary">$3.50</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-accent rounded-md">
                <span className="text-sm font-medium">Google Ads</span>
                <Badge variant="secondary">$2.75</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-accent rounded-md">
                <span className="text-sm font-medium">Organic</span>
                <Badge variant="secondary">$3.25</Badge>
              </div>
            </div>
            
            <Button variant="outline" className="w-full" data-testid="button-manage-thresholds">
              Manage Thresholds
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Postbacks */}
      <Card data-testid="card-recent-postbacks">
        <CardHeader>
          <CardTitle>Recent Postbacks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">User ID</th>
                  <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Revenue</th>
                  <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Threshold</th>
                  <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Fired At</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-3 font-mono text-sm">7829...4567</td>
                  <td className="py-3 px-3 text-green-600 font-medium">$3.25</td>
                  <td className="py-3 px-3">$3.00</td>
                  <td className="py-3 px-3">
                    <Badge className="status-active">Sent</Badge>
                  </td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">2 min ago</td>
                </tr>
                
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-3 font-mono text-sm">7828...3456</td>
                  <td className="py-3 px-3 text-green-600 font-medium">$3.10</td>
                  <td className="py-3 px-3">$3.00</td>
                  <td className="py-3 px-3">
                    <Badge className="status-active">Sent</Badge>
                  </td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">5 min ago</td>
                </tr>
                
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-3 font-mono text-sm">7827...2345</td>
                  <td className="py-3 px-3 text-orange-600 font-medium">$2.85</td>
                  <td className="py-3 px-3">$3.00</td>
                  <td className="py-3 px-3">
                    <Badge className="status-paused">Pending</Badge>
                  </td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">8 min ago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Performance Chart */}
      <Card data-testid="card-revenue-chart">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Performance (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 bg-gradient-to-br from-green-50 to-blue-50 rounded-md flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Revenue Chart Implementation</p>
              <p className="text-xs opacity-75">Daily revenue and postback trends</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coreg Revenue Report */}
      <Card data-testid="card-coreg-report">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Coreg Revenue Report (TMG)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Fetch revenue data from TMG coreg system for a specific date range.
          </p>
          
          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date & Time</label>
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={coregStartDate}
                  onChange={(e) => setCoregStartDate(e.target.value)}
                  data-testid="input-coreg-start-date"
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={coregStartTime}
                  onChange={(e) => setCoregStartTime(e.target.value)}
                  data-testid="input-coreg-start-time"
                  className="w-28"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date & Time</label>
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={coregEndDate}
                  onChange={(e) => setCoregEndDate(e.target.value)}
                  data-testid="input-coreg-end-date"
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={coregEndTime}
                  onChange={(e) => setCoregEndTime(e.target.value)}
                  data-testid="input-coreg-end-time"
                  className="w-28"
                />
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleFetchCoregReport}
            disabled={coregReportMutation.isPending}
            data-testid="button-fetch-coreg-report"
          >
            {coregReportMutation.isPending ? 'Fetching...' : 'Fetch Report'}
          </Button>
          
          {/* Report Results */}
          {coregReport && (
            <div className="mt-6 space-y-4">
              {/* Summary */}
              <div className="p-4 bg-accent rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Report Summary</h3>
                  {coregReport.summary?.is_authenticated ? (
                    <Badge className="status-active flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Authenticated
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Not Authenticated
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Publisher ID</p>
                    <p className="font-medium" data-testid="text-publisher-id">
                      {coregReport.summary?.publisher_id || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Publisher Name</p>
                    <p className="font-medium" data-testid="text-publisher-name">
                      {coregReport.summary?.publisher_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Records</p>
                    <p className="font-medium" data-testid="text-record-count">
                      {coregReport.summary?.no_of_records || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Start Date</p>
                    <p className="font-medium text-xs">
                      {coregReport.summary?.start_date_time || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">End Date</p>
                    <p className="font-medium text-xs">
                      {coregReport.summary?.end_date_time || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Placements Table */}
              {coregReport.placements && coregReport.placements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Placement</th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Clicks</th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Conversions</th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coregReport.placements.map((placement: any, index: number) => (
                        <tr key={index} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-3 text-sm">{placement.name || 'N/A'}</td>
                          <td className="py-3 px-3 text-sm">{placement.clicks || 0}</td>
                          <td className="py-3 px-3 text-sm">{placement.conversions || 0}</td>
                          <td className="py-3 px-3 text-sm font-medium text-green-600">
                            ${placement.revenue?.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-muted/50 rounded-md text-center">
                  <p className="text-sm text-muted-foreground">No placement data available for this date range</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
