import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Users, 
  TrendingUp,
  Settings,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

interface PostbackStats {
  totalPostbacks: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  totalRevenuePostedBack: number;
  successRate: number;
}

interface PostbackWithUser {
  id: string;
  endUserId: string;
  totalRevenue: string;
  threshold: string;
  status: string;
  affiliateResponse?: string;
  firedAt?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    source: string;
  } | null;
}

interface PendingUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  source: string;
  totalRevenue: string;
  progress: number;
  threshold: number;
}

interface ThresholdConfig {
  defaultThreshold: string;
  sourceThresholds: { source: string; threshold: string }[];
}

interface PostbackConfig {
  postbackUrl: string;
  isConfigured: boolean;
}

export default function Postbacks() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showUrl, setShowUrl] = useState(false);
  const [newSource, setNewSource] = useState("");
  const [newThreshold, setNewThreshold] = useState("");
  const [postbackUrl, setPostbackUrl] = useState("");
  const [defaultThreshold, setDefaultThreshold] = useState("3.00");

  const { data: stats, isLoading: statsLoading } = useQuery<PostbackStats>({
    queryKey: ['/api/postbacks/stats'],
  });

  const { data: postbacks, isLoading: postbacksLoading } = useQuery<PostbackWithUser[]>({
    queryKey: ['/api/postbacks', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'all' 
        ? '/api/postbacks' 
        : `/api/postbacks?status=${statusFilter}`;
      const res = await fetch(url, { credentials: 'include' });
      return res.json();
    },
  });

  const { data: pendingUsers, isLoading: pendingLoading } = useQuery<PendingUser[]>({
    queryKey: ['/api/postbacks/pending-users'],
  });

  const { data: thresholds, isLoading: thresholdsLoading } = useQuery<ThresholdConfig>({
    queryKey: ['/api/postbacks/thresholds'],
  });

  const { data: config, isLoading: configLoading } = useQuery<PostbackConfig>({
    queryKey: ['/api/postbacks/config'],
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (url: string) => {
      return apiRequest('PUT', '/api/postbacks/config', { postbackUrl: url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/postbacks/config'] });
      toast({ title: "Postback URL updated" });
    },
    onError: () => {
      toast({ title: "Failed to update postback URL", variant: "destructive" });
    },
  });

  const updateDefaultThresholdMutation = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest('PUT', '/api/settings/default_threshold', { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/postbacks/thresholds'] });
      toast({ title: "Default threshold updated" });
    },
    onError: () => {
      toast({ title: "Failed to update threshold", variant: "destructive" });
    },
  });

  const addSourceThresholdMutation = useMutation({
    mutationFn: async ({ source, threshold }: { source: string; threshold: string }) => {
      return apiRequest('POST', '/api/postbacks/thresholds/source', { source, threshold });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/postbacks/thresholds'] });
      setNewSource("");
      setNewThreshold("");
      toast({ title: "Source threshold added" });
    },
    onError: () => {
      toast({ title: "Failed to add source threshold", variant: "destructive" });
    },
  });

  const deleteSourceThresholdMutation = useMutation({
    mutationFn: async (source: string) => {
      return apiRequest('DELETE', `/api/postbacks/thresholds/source/${source}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/postbacks/thresholds'] });
      toast({ title: "Source threshold deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete source threshold", variant: "destructive" });
    },
  });

  const manualPostbackMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('POST', `/api/postback/manual/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/postbacks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/postbacks/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/postbacks/pending-users'] });
      toast({ title: "Postback fired successfully" });
    },
    onError: () => {
      toast({ title: "Failed to fire postback", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
      case 'success':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Postback Management</h1>
          <p className="text-muted-foreground">Configure and monitor affiliate postbacks</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/postbacks'] });
            queryClient.invalidateQueries({ queryKey: ['/api/postbacks/stats'] });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {!config?.isConfigured && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900">Postback URL Not Configured</p>
                <p className="text-sm text-orange-700">Set your Tune postback URL in the Configuration tab to enable automatic postbacks.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Postbacks</p>
                <p className="text-2xl font-bold">{stats?.totalPostbacks || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats?.successRate?.toFixed(1) || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue Posted</p>
                <p className="text-2xl font-bold">${stats?.totalRevenuePostedBack?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats?.pendingCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Postback History</TabsTrigger>
          <TabsTrigger value="pending">Pending Users</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Postback History</CardTitle>
                  <CardDescription>All fired postbacks with status and response</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {postbacksLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : postbacks && postbacks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fired At</TableHead>
                      <TableHead>Response</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {postbacks.map((postback) => (
                      <TableRow key={postback.id}>
                        <TableCell>
                          {postback.user ? (
                            <div>
                              <p className="font-medium">{postback.user.firstName} {postback.user.lastName}</p>
                              <p className="text-xs text-muted-foreground">{postback.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{postback.user?.source || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">${parseFloat(postback.totalRevenue).toFixed(2)}</TableCell>
                        <TableCell>${parseFloat(postback.threshold).toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(postback.status)}</TableCell>
                        <TableCell>
                          {postback.firedAt 
                            ? format(new Date(postback.firedAt), 'MMM d, yyyy HH:mm')
                            : format(new Date(postback.createdAt), 'MMM d, yyyy HH:mm')
                          }
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {postback.affiliateResponse || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No postbacks fired yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Users Approaching Threshold</CardTitle>
              <CardDescription>Users at 80%+ of revenue threshold who haven't triggered postback yet</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : pendingUsers && pendingUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.source || 'Direct'}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${parseFloat(user.totalRevenue).toFixed(2)} / ${user.threshold.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={user.progress} className="w-24" />
                            <span className="text-sm">{user.progress.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => manualPostbackMutation.mutate(user.id)}
                            disabled={manualPostbackMutation.isPending}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Fire Manually
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No users near threshold
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="thresholds">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Default Threshold</CardTitle>
                <CardDescription>Revenue threshold before firing postback to affiliate network</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label>Default Threshold ($)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    className="w-32"
                    defaultValue={thresholds?.defaultThreshold || '3.00'}
                    onChange={(e) => setDefaultThreshold(e.target.value)}
                  />
                  <Button 
                    onClick={() => updateDefaultThresholdMutation.mutate(defaultThreshold)}
                    disabled={updateDefaultThresholdMutation.isPending}
                  >
                    Save
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Users must generate ${thresholds?.defaultThreshold || '3.00'} in revenue before a postback is fired.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Source-Specific Thresholds</CardTitle>
                <CardDescription>Override default threshold for specific traffic sources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Source name" 
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="flex-1"
                  />
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="$" 
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="w-24"
                  />
                  <Button 
                    onClick={() => addSourceThresholdMutation.mutate({ source: newSource, threshold: newThreshold })}
                    disabled={!newSource || !newThreshold || addSourceThresholdMutation.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {thresholds?.sourceThresholds && thresholds.sourceThresholds.length > 0 ? (
                  <div className="space-y-2">
                    {thresholds.sourceThresholds.map((st) => (
                      <div key={st.source} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{st.source}</Badge>
                          <span className="font-medium">${parseFloat(st.threshold).toFixed(2)}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteSourceThresholdMutation.mutate(st.source)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No source-specific thresholds set</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Postback Configuration</CardTitle>
              <CardDescription>Configure your affiliate network postback URL</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tune Postback URL</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input 
                      type={showUrl ? "text" : "password"}
                      placeholder="https://yournetwork.go2cloud.org/aff_lsr?transaction_id={user_id}&amount={revenue}"
                      defaultValue={config?.postbackUrl || ''}
                      onChange={(e) => setPostbackUrl(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setShowUrl(!showUrl)}>
                    {showUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    onClick={() => updateConfigMutation.mutate(postbackUrl)}
                    disabled={updateConfigMutation.isPending}
                  >
                    Save
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Available placeholders: {'{user_id}'}, {'{revenue}'}, {'{source}'}, {'{sub_source}'}, {'{session_id}'}
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Status</h4>
                {config?.isConfigured ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Postback URL is configured</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>Postback URL not configured - postbacks will not fire</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
