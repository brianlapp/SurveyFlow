import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, TrendingUp, Search, User, Eye } from "lucide-react";

export default function Users() {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    source: '',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  const filteredUsers = users?.filter((user: any) => {
    if (filters.search && !user.email.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.status === 'completed' && !user.surveyCompleted) return false;
    if (filters.status === 'pending' && user.surveyCompleted) return false;
    if (filters.source && user.source !== filters.source) return false;
    return true;
  }) || [];

  const getStatusBadge = (user: any) => {
    if (user.surveyCompleted && user.postbackFired) {
      return <Badge className="status-active">Completed</Badge>;
    } else if (user.surveyCompleted) {
      return <Badge className="status-paused">Pending Postback</Badge>;
    } else {
      return <Badge variant="secondary">In Progress</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="users-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage user registrations and survey flows</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" data-testid="button-export-users">
            <Download className="h-4 w-4 mr-2" />
            Export Users
          </Button>
          <Button data-testid="button-view-analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users?.length || 0}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Surveys</p>
                <p className="text-2xl font-bold">
                  {users?.filter((u: any) => u.surveyCompleted).length || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Postbacks Fired</p>
                <p className="text-2xl font-bold">
                  {users?.filter((u: any) => u.postbackFired).length || 0}
                </p>
              </div>
              <Badge className="h-8 w-8 rounded-full flex items-center justify-center text-xs">
                PB
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  $
                  {users?.reduce((sum: number, u: any) => 
                    sum + parseFloat(u.totalRevenue || '0'), 0
                  ).toFixed(2) || '0.00'}
                </p>
              </div>
              <Download className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                  data-testid="input-search-users"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Source</label>
              <Select value={filters.source} onValueChange={(value) => setFilters(prev => ({ ...prev, source: value }))}>
                <SelectTrigger data-testid="select-source-filter">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sources</SelectItem>
                  <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="organic">Organic</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" data-testid="button-clear-filters">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Source</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Progress</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Revenue</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Created</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user: any) => (
                    <tr 
                      key={user.id} 
                      className="border-b border-border hover:bg-muted/50 table-row"
                      data-testid={`user-row-${user.id}`}
                    >
                      <td className="py-3 px-3">
                        <div>
                          <p className="text-sm font-medium" data-testid="user-email">
                            {user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.firstName} {user.lastName}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm" data-testid="user-source">
                        {user.source || 'Direct'}
                      </td>
                      <td className="py-3 px-3 text-sm" data-testid="user-progress">
                        Question {user.currentQuestionIndex || 0}/30
                      </td>
                      <td className="py-3 px-3 text-sm font-medium text-green-600" data-testid="user-revenue">
                        ${user.totalRevenue || '0.00'}
                      </td>
                      <td className="py-3 px-3" data-testid="user-status">
                        {getStatusBadge(user)}
                      </td>
                      <td className="py-3 px-3 text-sm text-muted-foreground" data-testid="user-created">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <Button variant="ghost" size="sm" data-testid="button-view-user">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg text-muted-foreground">No users found</p>
                        <p className="text-sm text-muted-foreground">Users will appear here as they register</p>
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
