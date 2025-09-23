import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink, Settings, BarChart3, Users, Eye, Plus, Edit, Trash2, Gift } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

function GiveawayManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGiveaway, setEditingGiveaway] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    retailValue: '',
    shippingValue: '',
    countdownHours: 8,
    isActive: true
  });

  // Fetch giveaways
  const { data: giveaways = [], isLoading } = useQuery({
    queryKey: ['/api/admin/giveaways'],
  });

  // Create giveaway mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/giveaways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create giveaway');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/giveaways'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Giveaway created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update giveaway mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const response = await fetch(`/api/admin/giveaways/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update giveaway');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/giveaways'] });
      setIsEditDialogOpen(false);
      setEditingGiveaway(null);
      resetForm();
      toast({ title: "Success", description: "Giveaway updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Delete giveaway mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/giveaways/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete giveaway');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/giveaways'] });
      toast({ title: "Success", description: "Giveaway deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      imageUrl: '',
      retailValue: '',
      shippingValue: '',
      countdownHours: 8,
      isActive: true
    });
  };

  const handleEdit = (giveaway: any) => {
    setEditingGiveaway(giveaway);
    setFormData({
      title: giveaway.title,
      imageUrl: giveaway.imageUrl,
      retailValue: giveaway.retailValue,
      shippingValue: giveaway.shippingValue || '',
      countdownHours: giveaway.countdownHours,
      isActive: giveaway.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGiveaway) {
      updateMutation.mutate({ id: editingGiveaway.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this giveaway? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Card data-testid="card-giveaway-management">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Giveaway Management
            </CardTitle>
            <p className="text-muted-foreground text-sm">Create and manage giveaway campaigns for brand landing pages</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-giveaway">
                <Plus className="h-4 w-4 mr-2" />
                Create Giveaway
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Giveaway</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Free Product Giveaway"
                    data-testid="input-giveaway-title"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    data-testid="input-giveaway-image"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="retailValue">Retail Value ($)</Label>
                    <Input
                      id="retailValue"
                      value={formData.retailValue}
                      onChange={(e) => setFormData({ ...formData, retailValue: e.target.value })}
                      placeholder="29.99"
                      data-testid="input-retail-value"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="shippingValue">Shipping Value ($)</Label>
                    <Input
                      id="shippingValue"
                      value={formData.shippingValue}
                      onChange={(e) => setFormData({ ...formData, shippingValue: e.target.value })}
                      placeholder="15.00"
                      data-testid="input-shipping-value"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="countdownHours">Countdown Hours</Label>
                  <Input
                    id="countdownHours"
                    type="number"
                    min="1"
                    max="72"
                    value={formData.countdownHours}
                    onChange={(e) => setFormData({ ...formData, countdownHours: parseInt(e.target.value) })}
                    data-testid="input-countdown-hours"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    data-testid="switch-is-active"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-giveaway"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading giveaways...</p>
          </div>
        ) : giveaways.length === 0 ? (
          <div className="text-center py-8">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">No Giveaways Created</h3>
            <p className="text-muted-foreground mb-4">Create your first giveaway to start engaging users with compelling offers.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(giveaways as any[]).map((giveaway: any) => (
              <div key={giveaway.id} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <img 
                      src={giveaway.imageUrl} 
                      alt={giveaway.title}
                      className="w-16 h-16 object-cover rounded-md"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        (e.target as HTMLImageElement).src = '/api/placeholder/64/64';
                      }}
                    />
                    <div>
                      <h4 className="font-medium text-lg">{giveaway.title}</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Retail Value: <span className="font-medium">${giveaway.retailValue}</span></p>
                        {giveaway.shippingValue && (
                          <p>Shipping: <span className="font-medium">${giveaway.shippingValue}</span></p>
                        )}
                        <p>Countdown: <span className="font-medium">{giveaway.countdownHours} hours</span></p>
                        <p>Created: <span className="font-medium">{new Date(giveaway.createdAt).toLocaleDateString()}</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={giveaway.isActive ? "default" : "secondary"}>
                      {giveaway.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(giveaway)}
                      data-testid={`button-edit-giveaway-${giveaway.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(giveaway.id)}
                      data-testid={`button-delete-giveaway-${giveaway.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Giveaway</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  data-testid="input-edit-giveaway-title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-imageUrl">Image URL</Label>
                <Input
                  id="edit-imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  data-testid="input-edit-giveaway-image"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-retailValue">Retail Value ($)</Label>
                  <Input
                    id="edit-retailValue"
                    value={formData.retailValue}
                    onChange={(e) => setFormData({ ...formData, retailValue: e.target.value })}
                    data-testid="input-edit-retail-value"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-shippingValue">Shipping Value ($)</Label>
                  <Input
                    id="edit-shippingValue"
                    value={formData.shippingValue}
                    onChange={(e) => setFormData({ ...formData, shippingValue: e.target.value })}
                    data-testid="input-edit-shipping-value"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-countdownHours">Countdown Hours</Label>
                <Input
                  id="edit-countdownHours"
                  type="number"
                  min="1"
                  max="72"
                  value={formData.countdownHours}
                  onChange={(e) => setFormData({ ...formData, countdownHours: parseInt(e.target.value) })}
                  data-testid="input-edit-countdown-hours"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-edit-is-active"
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-giveaway"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

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

      {/* Giveaway Management */}
      <GiveawayManagement />

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
