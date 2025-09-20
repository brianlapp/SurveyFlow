interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export function ProgressBar({ current, total, className = "" }: ProgressBarProps) {
  const percentage = Math.min(Math.max((current / total) * 100, 0), 100);

  return (
    <div className={`space-y-2 ${className}`} data-testid="progress-bar">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Progress</span>
        <span className="text-sm text-muted-foreground" data-testid="progress-text">
          Page {current} of {total}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="progress-bar h-2 rounded-full transition-all duration-300 ease-in-out" 
          style={{ width: `${percentage}%` }}
          data-testid="progress-fill"
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {percentage.toFixed(0)}% Complete
      </div>
    </div>
  );
}
