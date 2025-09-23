import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AdminLayout from "@/components/admin/layout";
import Dashboard from "@/pages/admin/dashboard";
import Users from "@/pages/admin/users";
import Offers from "@/pages/admin/offers";
import Questions from "@/pages/admin/questions";
import Analytics from "@/pages/admin/analytics";
import Revenue from "@/pages/admin/revenue";
import Brands from "@/pages/admin/brands";
import Settings from "@/pages/admin/settings";
import Register from "@/pages/user/register";
import Survey from "@/pages/user/survey";
import GiveawayLanding from "@/pages/user/giveaway-landing";
import ExitLottery from "@/pages/user/exit-lottery";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/giveaway" component={GiveawayLanding} />
      <Route path="/register" component={Register} />
      <Route path="/survey/:sessionId?" component={Survey} />
      <Route path="/exit/:sessionId?" component={ExitLottery} />
      
      {/* Admin routes */}
      {isAuthenticated ? (
        <AdminLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/admin" component={Dashboard} />
            <Route path="/admin/users" component={Users} />
            <Route path="/admin/offers" component={Offers} />
            <Route path="/admin/questions" component={Questions} />
            <Route path="/admin/analytics" component={Analytics} />
            <Route path="/admin/revenue" component={Revenue} />
            <Route path="/admin/brands" component={Brands} />
            <Route path="/admin/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </AdminLayout>
      ) : (
        <Route path="/" component={Landing} />
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
