import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Key, 
  DollarSign, 
  Settings as SettingsIcon, 
  Bell, 
  Save,
  Eye,
  EyeOff,
  TestTube,
  Mail
} from "lucide-react";

export default function Settings() {
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [settings, setSettings] = useState({
    tuneApiKey: '',
    openaiApiKey: '',
    defaultThreshold: '3.00',
    autoSaveInterval: '3',
    sessionTimeout: '30',
    timezone: 'America/Los_Angeles',
    enableFraud: true,
    enableAnalytics: true,
    notificationEmail: '',
    dailyReport: true,
    weeklyReport: true,
    alertsHigh: false,
    alertsLow: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['/api/settings'],
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await apiRequest('PUT', `/api/settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      // Test API connections
      const response = await apiRequest('POST', '/api/settings/test-connections');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Test",
        description: "All API connections tested successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/settings/test-email');
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: "Check your inbox for the test email",
      });
    },
    onError: (error) => {
      toast({
        title: "Email Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = async () => {
    try {
      await updateSettingMutation.mutateAsync({ key: 'default_threshold', value: settings.defaultThreshold });
      // Save other settings...
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Platform Settings</h2>
          <p className="text-muted-foreground">Configure platform parameters and integrations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Integrations */}
        <Card data-testid="card-api-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tune-api-key">Tune API Key</Label>
              <div className="flex mt-2">
                <Input
                  id="tune-api-key"
                  type={showApiKeys ? "text" : "password"}
                  value={settings.tuneApiKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, tuneApiKey: e.target.value }))}
                  placeholder="••••••••••••••••"
                  className="flex-1 rounded-r-none"
                  data-testid="input-tune-api-key"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKeys(!showApiKeys)}
                  className="rounded-l-none border-l-0"
                  data-testid="button-toggle-api-keys"
                >
                  {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="openai-api-key">OpenAI API Key</Label>
              <div className="flex mt-2">
                <Input
                  id="openai-api-key"
                  type={showApiKeys ? "text" : "password"}
                  value={settings.openaiApiKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                  placeholder="••••••••••••••••"
                  className="flex-1 rounded-r-none"
                  data-testid="input-openai-api-key"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKeys(!showApiKeys)}
                  className="rounded-l-none border-l-0"
                  data-testid="button-toggle-openai-keys"
                >
                  {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending}
                data-testid="button-test-connections"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testConnectionMutation.isPending ? 'Testing...' : 'Test Connections'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Configuration */}
        <Card data-testid="card-revenue-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="default-threshold">Default Postback Threshold</Label>
              <div className="flex items-center mt-2">
                <span className="mr-2">$</span>
                <Input
                  id="default-threshold"
                  type="number"
                  step="0.01"
                  value={settings.defaultThreshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultThreshold: e.target.value }))}
                  data-testid="input-default-threshold"
                />
              </div>
            </div>
            
            <div>
              <Label>Source-Specific Thresholds</Label>
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Source name" data-testid="input-source-name" />
                  <Input type="number" step="0.01" placeholder="Threshold ($)" data-testid="input-source-threshold" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <Badge variant="secondary">Facebook: $3.50</Badge>
                  <Badge variant="secondary">Google: $2.75</Badge>
                  <Badge variant="secondary">Organic: $3.25</Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-optimize"
                checked={true}
                data-testid="checkbox-auto-optimize"
              />
              <Label htmlFor="auto-optimize" className="text-sm">
                Auto-optimize thresholds based on performance
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card data-testid="card-system-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="auto-save-interval">Survey Auto-Save Interval</Label>
              <Select value={settings.autoSaveInterval} onValueChange={(value) => setSettings(prev => ({ ...prev, autoSaveInterval: value }))}>
                <SelectTrigger className="mt-2" data-testid="select-auto-save-interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every question</SelectItem>
                  <SelectItem value="3">Every 3 questions</SelectItem>
                  <SelectItem value="5">Every 5 questions</SelectItem>
                  <SelectItem value="10">Every 10 questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                className="mt-2"
                data-testid="input-session-timeout"
              />
            </div>
            
            <div>
              <Label htmlFor="timezone">Time Zone</Label>
              <Select value={settings.timezone} onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}>
                <SelectTrigger className="mt-2" data-testid="select-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
                  <SelectItem value="America/Denver">America/Denver (MST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-fraud"
                  checked={settings.enableFraud}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableFraud: !!checked }))}
                  data-testid="checkbox-enable-fraud"
                />
                <Label htmlFor="enable-fraud" className="text-sm">
                  Enable fraud detection
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-analytics"
                  checked={settings.enableAnalytics}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableAnalytics: !!checked }))}
                  data-testid="checkbox-enable-analytics"
                />
                <Label htmlFor="enable-analytics" className="text-sm">
                  Enable advanced analytics
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card data-testid="card-notification-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notification-email">Notification Email</Label>
              <Input
                id="notification-email"
                type="email"
                value={settings.notificationEmail}
                onChange={(e) => setSettings(prev => ({ ...prev, notificationEmail: e.target.value }))}
                placeholder="admin@platform.com"
                className="mt-2"
                data-testid="input-notification-email"
              />
            </div>
            
            <div>
              <Label>Email Reports</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="daily-report"
                    checked={settings.dailyReport}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, dailyReport: !!checked }))}
                    data-testid="checkbox-daily-report"
                  />
                  <Label htmlFor="daily-report" className="text-sm">
                    Daily revenue summary
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="weekly-report"
                    checked={settings.weeklyReport}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, weeklyReport: !!checked }))}
                    data-testid="checkbox-weekly-report"
                  />
                  <Label htmlFor="weekly-report" className="text-sm">
                    Weekly performance report
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="alerts-high"
                    checked={settings.alertsHigh}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, alertsHigh: !!checked }))}
                    data-testid="checkbox-alerts-high"
                  />
                  <Label htmlFor="alerts-high" className="text-sm">
                    High performance alerts
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="alerts-low"
                    checked={settings.alertsLow}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, alertsLow: !!checked }))}
                    data-testid="checkbox-alerts-low"
                  />
                  <Label htmlFor="alerts-low" className="text-sm">
                    Low performance alerts
                  </Label>
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex space-x-3">
              <Button 
                variant="secondary" 
                onClick={() => sendTestEmailMutation.mutate()}
                disabled={sendTestEmailMutation.isPending}
                data-testid="button-send-test-email"
              >
                <Mail className="h-4 w-4 mr-2" />
                {sendTestEmailMutation.isPending ? 'Sending...' : 'Send Test Email'}
              </Button>
              <Button 
                onClick={handleSaveSettings}
                disabled={updateSettingMutation.isPending}
                data-testid="button-save-settings"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSettingMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
