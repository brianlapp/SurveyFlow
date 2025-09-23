import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CountdownTimer } from "@/components/user/countdown-timer";
import type { Giveaway } from "@shared/schema";
import brandLogo from "@assets/brand-logo.png";
import productImage from "@assets/pink-slides.png";

export default function GiveawayLanding() {
  const [, setLocation] = useLocation();

  // Fetch active giveaway data
  const { data: giveaway, isLoading, isError, error, refetch } = useQuery<Giveaway>({
    queryKey: ['/api/giveaways/active'],
    retry: 3,
  });

  const handleContinue = () => {
    setLocation('/register');
  };

  const handleTimerComplete = () => {
    // Could show "Time expired" message or redirect
    console.log('Timer completed!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mint-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-mint-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Giveaway</h2>
          <p className="text-gray-500 mb-4">
            {(error as any)?.status === 404 
              ? "No active giveaway available at this time." 
              : "Failed to load giveaway information. Please try again."}
          </p>
          <button
            onClick={() => refetch()}
            className="bg-teal-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90"
            data-testid="button-retry"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!giveaway) {
    return (
      <div className="min-h-screen bg-mint-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-700 mb-2">No Active Giveaway</h2>
          <p className="text-gray-500">Please check back later for exciting offers!</p>
        </div>
      </div>
    );
  }

  // Calculate countdown time in seconds from giveaway hours
  const countdownSeconds = (giveaway.countdownHours || 8) * 3600;

  return (
    <div className="min-h-screen bg-mint-light">
      {/* Header */}
      <header className="bg-teal-primary text-white">
        <div className="flex justify-between items-center px-6 py-4">
          <img 
            src={brandLogo} 
            alt="Free Finds" 
            className="h-12" 
            data-testid="brand-logo"
          />
          <div className="text-center">
            <h1 className="text-xl font-bold" data-testid="giveaway-title">
              {giveaway.title}
            </h1>
            <p className="text-sm">Claim Your Free Item Today</p>
          </div>
          <div className="bg-green-500 px-3 py-1 rounded-full text-sm" data-testid="limited-supply-badge">
            🎁 Limited Supply
          </div>
        </div>
      </header>
      
      {/* Countdown Timer Band */}
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="text-center max-w-md mx-auto px-4">
          <p className="text-gray-600 mb-2 flex items-center justify-center gap-1">
            <span className="text-green-600">⏰</span>
            <span>Time Remaining</span>
          </p>
          <CountdownTimer 
            totalSeconds={countdownSeconds} 
            onComplete={handleTimerComplete}
          />
        </div>
      </div>
      
      {/* Main Content */}
      <main className="flex justify-center py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
          
          {/* Cart Summary */}
          <div className="flex items-center mb-4">
            <div className="bg-teal-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
              <span className="text-lg">✓</span>
            </div>
            <h2 className="text-lg font-bold" data-testid="cart-summary-title">Cart Summary</h2>
          </div>
          
          <div className="flex items-center mb-6">
            <div className="flex-1">
              <p className="text-gray-600">Product Cost</p>
              <p className="text-xl font-bold" data-testid="product-cost">$0.00</p>
            </div>
            <div className="w-20 h-20 relative">
              <img 
                src={giveaway.imageUrl || productImage} 
                alt="Giveaway Product" 
                className="w-full h-full object-cover rounded" 
                data-testid="product-image"
              />
              <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm absolute -top-2 -right-2">
                ✓
              </div>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 text-center mb-4">*Representative image only</p>
          
          {/* Shipping Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Shipping</span>
              <div className="text-right">
                <p className="text-green-600 font-bold" data-testid="shipping-cost">FREE</p>
                <p className="text-xs text-green-600" data-testid="shipping-savings">
                  You save ${Number(giveaway.shippingValue || 15).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Total Cost */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total Cost</span>
              <span className="text-2xl font-bold text-teal-primary" data-testid="total-cost">$0.00</span>
            </div>
          </div>
          
          {/* Continue Button */}
          <button 
            onClick={handleContinue}
            className="w-full bg-teal-primary text-white py-3 rounded-lg font-bold text-lg hover:bg-opacity-90 transition-colors"
            data-testid="button-continue-giveaway"
          >
            Continue to Claim
          </button>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="text-center py-4 text-gray-500 text-sm">
        Limited To One Per Household
      </footer>
    </div>
  );
}