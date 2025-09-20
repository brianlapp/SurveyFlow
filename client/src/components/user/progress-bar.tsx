interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export function ProgressBar({ current, total, className = "" }: ProgressBarProps) {
  return (
    <div className={`text-center ${className}`} data-testid="progress-bar">
      <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
        <span data-testid="progress-text">Step: {current}/{total}</span>
        <span className="text-green-600">✓</span>
      </div>
    </div>
  );
}
