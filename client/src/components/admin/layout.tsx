import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "./sidebar";
import Header from "./header";
import { useLocation } from "wouter";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const pageConfig = {
  "/": { title: "Dashboard Overview", subtitle: "Monitor your platform performance" },
  "/admin": { title: "Dashboard Overview", subtitle: "Monitor your platform performance" },
  "/admin/users": { title: "User Management", subtitle: "Manage user registrations and survey flows" },
  "/admin/offers": { title: "Offers Management", subtitle: "Configure co-registration offers" },
  "/admin/questions": { title: "Questions Management", subtitle: "Manage survey questions and logic" },
  "/admin/analytics": { title: "Analytics & Reports", subtitle: "Analyze performance metrics" },
  "/admin/revenue": { title: "Revenue Tracking", subtitle: "Track revenue and postbacks" },
  "/admin/postbacks": { title: "Postback Management", subtitle: "Configure and monitor affiliate postbacks" },
  "/admin/brands": { title: "Brand Landing Pages", subtitle: "Manage brand-specific experiences" },
  "/admin/settings": { title: "Platform Settings", subtitle: "Configure platform parameters" },
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const currentPageConfig = pageConfig[location as keyof typeof pageConfig] || pageConfig["/"];

  return (
    <div className="flex h-screen bg-background" data-testid="admin-layout">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={currentPageConfig.title} subtitle={currentPageConfig.subtitle} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
