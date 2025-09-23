interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export function ProgressBar({ current, total, className = "" }: ProgressBarProps) {
  const progressPercentage = (current / total) * 100;
  
  return (
    <div className={`mb-6 ${className}`} data-testid="progress-bar">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600" data-testid="progress-text">
          Step: {current}/{total}
        </span>
        <div className="bg-teal-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">
          {current === total ? '✓' : current}
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="progress-bar-filled h-2 rounded-full transition-all duration-300" 
          style={{ width: `${progressPercentage}%` }}
          data-testid="progress-fill"
        ></div>
      </div>
    </div>
  );
}
