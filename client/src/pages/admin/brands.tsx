import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Settings, BarChart3, Users, Eye } from "lucide-react";

export default function Brands() {
  return (
    <div className="p-6 space-y-6" data-testid="brands-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Brand Landing Pages</h2>
          <p className="text-muted-foreground">Manage brand-specific user experiences and configurations</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" data-testid="button-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
          <Button data-testid="button-global-settings">
            <Settings className="h-4 w-4 mr-2" />
            Global Settings
          </Button>
        </div>
      </div>

      {/* Brand Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ModeFreeFinds.com */}
        <Card className="overflow-hidden" data-testid="card-mode-free-finds">
          <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">ModeFreeFinds.com</h3>
                <p className="text-sm opacity-90">Consumer goods, samples, deals</p>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                Active
              </Badge>
            </div>
          </div>
          
          <CardContent className="p-6 space-y-4">
            {/* Preview */}
            <div className="border border-border rounded-md p-4 bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="text-center mb-4">
                <h4 className="text-lg font-bold text-blue-900">Discover Amazing Deals!</h4>
                <p className="text-blue-700 text-sm">Get exclusive access to free samples and special offers</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center p-2 bg-white rounded-md shadow-sm border text-xs">
                  <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center mr-2">
                    🎁
                  </div>
                  <div>
                    <div className="font-medium text-blue-900">Free Product Samples</div>
                    <div className="text-blue-600">Try before you buy</div>
                  </div>
                </div>
                
                <div className="flex items-center p-2 bg-white rounded-md shadow-sm border text-xs">
                  <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center mr-2">
                    %
                  </div>
                  <div>
                    <div className="font-medium text-blue-900">Exclusive Discounts</div>
                    <div className="text-blue-600">Save up to 70% off</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">1,234</p>
                <p className="text-xs text-muted-foreground">Monthly Users</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">$3,702</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">3.2%</p>
                <p className="text-xs text-muted-foreground">Conversion</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex space-x-2">
              <Button size="sm" className="flex-1" data-testid="button-configure-modefree">
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
              <Button 
                size="sm" 
                variant="secondary" 
                className="flex-1" 
                data-testid="button-preview-modefree"
                onClick={() => window.open('/', '_blank')}
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button size="sm" variant="outline" data-testid="button-visit-modefree">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ModeMarketMunchies.com */}
        <Card className="overflow-hidden" data-testid="card-mode-market-munchies">
          <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">ModeMarketMunchies.com</h3>
                <p className="text-sm opacity-90">Finance, investing, market insights</p>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                Active
              </Badge>
            </div>
          </div>
          
          <CardContent className="p-6 space-y-4">
            {/* Preview */}
            <div className="border border-border rounded-md p-4 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="text-center mb-4">
                <h4 className="text-lg font-bold text-green-900">Smart Financial Decisions</h4>
                <p className="text-green-700 text-sm">Unlock your financial potential with expert insights</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center p-2 bg-white rounded-md shadow-sm border text-xs">
                  <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center mr-2">
                    📈
                  </div>
                  <div>
                    <div className="font-medium text-green-900">Investment Analysis</div>
                    <div className="text-green-600">Professional market insights</div>
                  </div>
                </div>
                
                <div className="flex items-center p-2 bg-white rounded-md shadow-sm border text-xs">
                  <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center mr-2">
                    🏦
                  </div>
                  <div>
                    <div className="font-medium text-green-900">Savings Strategies</div>
                    <div className="text-green-600">Maximize your returns</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">856</p>
                <p className="text-xs text-muted-foreground">Monthly Users</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">$2,568</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">4.1%</p>
                <p className="text-xs text-muted-foreground">Conversion</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex space-x-2">
              <Button size="sm" className="flex-1" data-testid="button-configure-modemarket">
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
              <Button 
                size="sm" 
                variant="secondary" 
                className="flex-1" 
                data-testid="button-preview-modemarket"
                onClick={() => window.open('/', '_blank')}
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button size="sm" variant="outline" data-testid="button-visit-modemarket">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brand Configuration */}
      <Card data-testid="card-brand-configuration">
        <CardHeader>
          <CardTitle>Brand Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Domain Settings */}
          <div>
            <h4 className="font-medium mb-3">Domain Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">ModeFreeFinds.com</span>
                  <Badge className="status-active">Connected</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Consumer goods focus</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  SSL: ✓ | CDN: ✓ | Analytics: ✓
                </div>
              </div>
              
              <div className="p-4 border border-border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">ModeMarketMunchies.com</span>
                  <Badge className="status-active">Connected</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Financial services focus</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  SSL: ✓ | CDN: ✓ | Analytics: ✓
                </div>
              </div>
            </div>
          </div>

          {/* Offer Distribution */}
          <div>
            <h4 className="font-medium mb-3">Offer Distribution by Brand</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-accent rounded-md">
                <div>
                  <span className="font-medium">Shopping & Deals Offers</span>
                  <p className="text-sm text-muted-foreground">ModeFreeFinds.com</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">12 Active</p>
                  <p className="text-sm text-muted-foreground">$1.50 avg payout</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-accent rounded-md">
                <div>
                  <span className="font-medium">Financial Services Offers</span>
                  <p className="text-sm text-muted-foreground">ModeMarketMunchies.com</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">8 Active</p>
                  <p className="text-sm text-muted-foreground">$3.25 avg payout</p>
                </div>
              </div>
            </div>
          </div>

          {/* Brand Performance */}
          <div>
            <h4 className="font-medium mb-3">Brand Performance Comparison</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-sm font-medium text-muted-foreground">Metric</th>
                    <th className="text-left py-2 text-sm font-medium text-muted-foreground">ModeFreeFinds</th>
                    <th className="text-left py-2 text-sm font-medium text-muted-foreground">ModeMarketMunchies</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 text-sm">Monthly Users</td>
                    <td className="py-2 text-sm font-medium">1,234</td>
                    <td className="py-2 text-sm font-medium">856</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 text-sm">Conversion Rate</td>
                    <td className="py-2 text-sm font-medium">3.2%</td>
                    <td className="py-2 text-sm font-medium">4.1%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 text-sm">Avg Revenue/User</td>
                    <td className="py-2 text-sm font-medium">$3.00</td>
                    <td className="py-2 text-sm font-medium">$3.00</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-sm">Total Revenue</td>
                    <td className="py-2 text-sm font-medium text-green-600">$3,702</td>
                    <td className="py-2 text-sm font-medium text-green-600">$2,568</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
