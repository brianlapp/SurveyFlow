import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart3,
  Users,
  Tag,
  ClipboardList,
  TrendingUp,
  DollarSign,
  Settings,
  LogOut,
  User,
  BookOpen,
  Send,
  Gift,
  Mail,
  LineChart
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Offers", href: "/admin/offers", icon: Tag },
  { name: "TY Surveys", href: "/admin/ty-surveys", icon: ClipboardList },
  { name: "TY Pages", href: "/admin/ty-brands", icon: Gift },
  { name: "Email House Ads", href: "/admin/email-ads", icon: Mail },
  { name: "Analytics", href: "/admin/analytics", icon: TrendingUp },
  { name: "Ad Revenue (MMM)", href: "/admin/mmm", icon: LineChart },
  { name: "Revenue", href: "/admin/revenue", icon: DollarSign },
  { name: "Postbacks", href: "/admin/postbacks", icon: Send },
  { name: "Documentation", href: "/admin/docs", icon: BookOpen },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full" data-testid="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary">Co-Reg Platform</h1>
        <p className="text-xs text-muted-foreground mt-1">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href || 
              (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  data-testid={`nav-link-${item.name.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
            <User className="h-4 w-4" />
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="user-name">
              {(user as any)?.email || "Admin User"}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="user-email">
              {(user as any)?.email || "admin@platform.com"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </button>
      </div>
    </div>
  );
}