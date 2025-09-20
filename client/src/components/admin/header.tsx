import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Bell, Moon, Sun } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6" data-testid="header">
      <div>
        <h2 className="text-xl font-semibold" data-testid="header-title">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground" data-testid="header-subtitle">{subtitle}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Input
            type="search"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-64"
            data-testid="input-search"
          />
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
        </div>
        
        <Button variant="ghost" size="sm" data-testid="button-notifications">
          <Bell className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleDarkMode}
          data-testid="button-dark-mode"
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
