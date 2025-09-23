import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Sparkles,
  Gift,
  ArrowLeft,
  Star,
  Trophy,
  DollarSign,
  ExternalLink,
  CheckCircle
} from "lucide-react";
import type { PublicOffer } from "@shared/types";
import brandLogo from "@assets/brand-logo.png";

interface ExitLotteryProps {
  params?: {
    sessionId?: string;
  };
}

export default function ExitLottery({ params }: ExitLotteryProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const sessionId = params?.sessionId;
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<PublicOffer | null>(null);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinAngle, setSpinAngle] = useState(0);

  // Fetch exit offers
  const { data: exitOffers, isLoading: exitOffersLoading } = useQuery<PublicOffer[]>({
    queryKey: ['/api/offers/exit'],
    queryFn: () => apiRequest('GET', '/api/offers/exit').then(res => res.json()),
  });

  // Offer interaction mutation
  const offerInteractionMutation = useMutation({
    mutationFn: async ({ offerId, interactionType }: { 
      offerId: string; 
      interactionType: 'view' | 'click' | 'spin';
    }) => {
      await apiRequest('POST', '/api/offer/interact', {
        sessionId: sessionId,
        offerId,
        interactionType,
        pageNumber: 4, // Exit page is step 4
      });
    },
    onSuccess: (_, variables) => {
      if (variables.interactionType === 'click') {
        toast({
          title: "Offer Claimed!",
          description: "Good luck with your exit offer!",
        });
      }
    },
    onError: (error: any) => {
      let errorMessage = "Failed to record interaction. Please try again.";
      
      if (error?.status === 401) {
        errorMessage = "Your session has expired. Please start over.";
        localStorage.removeItem('surveySessionId');
        setTimeout(() => setLocation('/register'), 2000);
      } else if (error?.status === 404) {
        errorMessage = "Session not found. Please complete the survey first.";
        setTimeout(() => setLocation('/register'), 2000);
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Enhanced session validation and navigation guard  
  useEffect(() => {
    if (!sessionId) {
      console.warn('No session ID provided for exit lottery, redirecting to registration');
      setLocation('/register');
      return;
    }
    
    // Check if this session completed the survey
    const savedSessionId = localStorage.getItem('surveySessionId');
    if (!savedSessionId || savedSessionId !== sessionId) {
      console.warn('Invalid or mismatched session ID for exit lottery, redirecting to registration');
      toast({
        title: "Session Required",
        description: "Please complete the survey first to access the exit lottery.",
        variant: "destructive",
      });
      setTimeout(() => setLocation('/register'), 2000);
      return;
    }
  }, [sessionId, setLocation, toast]);

  const handleSpin = () => {
    if (!exitOffers || exitOffers.length === 0 || isSpinning || hasSpun) return;

    setIsSpinning(true);
    
    // Random selection
    const randomIndex = Math.floor(Math.random() * exitOffers.length);
    const winningOffer = exitOffers[randomIndex];
    
    // Calculate spin angle (multiple full rotations + position)
    const baseRotations = 3; // 3 full spins
    const segmentAngle = 360 / exitOffers.length;
    const targetAngle = (360 * baseRotations) + (randomIndex * segmentAngle) + (segmentAngle / 2);
    
    setSpinAngle(targetAngle);
    
    // Track spin interaction
    offerInteractionMutation.mutate({
      offerId: winningOffer.id,
      interactionType: 'spin',
    });

    // Reveal result after animation
    setTimeout(() => {
      setSelectedOffer(winningOffer);
      setIsSpinning(false);
      setHasSpun(true);
      toast({
        title: "🎉 Congratulations!",
        description: `You won: ${winningOffer.name}!`,
      });
    }, 3000); // 3 second spin animation
  };

  const handleOfferClick = (offer: PublicOffer) => {
    // Track click
    offerInteractionMutation.mutate({
      offerId: offer.id,
      interactionType: 'click',
    });
    
    // Open offer in new tab
    window.open(offer.clickUrl || '#', '_blank');
  };

  const handleBackToSurvey = () => {
    setLocation(`/survey/${sessionId}`);
  };

  if (exitOffersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mint-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your final offers...</p>
        </div>
      </div>
    );
  }

  if (!exitOffers || exitOffers.length === 0) {
    return (
      <div className="min-h-screen bg-mint-light py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="text-center">
            <CardContent className="pt-8 pb-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Survey Complete!</h1>
              <p className="text-gray-600 mb-6">
                Thank you for participating in our survey. Your responses have been recorded.
              </p>
              <Button onClick={handleBackToSurvey} data-testid="button-back-to-survey">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Survey
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-teal-50" data-testid="exit-lottery-page">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="flex justify-between items-center px-6 py-4">
          <img 
            src={brandLogo} 
            alt="Free Finds" 
            className="h-12" 
            data-testid="brand-logo"
          />
          <div className="text-center">
            <h1 className="text-xl font-bold" data-testid="exit-lottery-title">
              🎰 Final Chance Lottery!
            </h1>
            <p className="text-sm">Don't leave empty-handed!</p>
          </div>
          <div className="bg-yellow-500 px-3 py-1 rounded-full text-sm font-bold" data-testid="lottery-indicator">
            🎯 BONUS
          </div>
        </div>
      </header>

      <main className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          
          {/* Main Content */}
          {!hasSpun ? (
            <div className="text-center">
              {/* Lottery Introduction */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  <Sparkles className="inline h-8 w-8 text-yellow-500 mr-2" />
                  Last Chance to Win!
                  <Sparkles className="inline h-8 w-8 text-yellow-500 ml-2" />
                </h2>
                <p className="text-lg text-gray-600 mb-2">
                  Before you go, spin our exclusive lottery wheel for one final chance at amazing offers!
                </p>
                <p className="text-green-600 font-semibold">
                  🎁 Every spin wins! No blanks, guaranteed prizes!
                </p>
              </div>

              {/* Lottery Wheel */}
              <div className="mb-8">
                <Card className="max-w-lg mx-auto p-8 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300">
                  <CardContent className="text-center">
                    <div className="relative">
                      {/* Wheel Container */}
                      <div className="relative w-64 h-64 mx-auto mb-6">
                        {/* Wheel */}
                        <div 
                          className={`w-64 h-64 rounded-full border-8 border-yellow-400 relative transition-transform duration-3000 ease-out ${
                            isSpinning ? 'animate-spin' : ''
                          }`}
                          style={{
                            background: `conic-gradient(${exitOffers.map((_, index) => {
                              const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
                              return colors[index % colors.length];
                            }).join(', ')})`,
                            transform: `rotate(${spinAngle}deg)`
                          }}
                          data-testid="lottery-wheel"
                        >
                          {/* Wheel Segments */}
                          {exitOffers.map((offer, index) => {
                            const angle = (360 / exitOffers.length) * index;
                            return (
                              <div
                                key={offer.id}
                                className="absolute w-full h-full flex items-center justify-center text-white font-bold text-sm"
                                style={{
                                  transform: `rotate(${angle}deg)`,
                                  transformOrigin: 'center',
                                }}
                              >
                                <div className="mt-8">
                                  <Gift className="h-6 w-6 mx-auto mb-1" />
                                  <div className="text-xs">{offer.name.split(' ')[0]}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Pointer */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-transparent border-b-red-600"></div>
                        </div>
                        
                        {/* Center Button */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="w-16 h-16 bg-yellow-500 rounded-full border-4 border-white flex items-center justify-center">
                            <Star className="h-8 w-8 text-white" />
                          </div>
                        </div>
                      </div>

                      {/* Spin Button */}
                      <Button
                        onClick={handleSpin}
                        disabled={isSpinning}
                        size="lg"
                        className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-4 text-xl font-bold rounded-full shadow-lg hover:from-red-600 hover:to-pink-600 transform hover:scale-105 transition-all"
                        data-testid="button-spin-wheel"
                      >
                        {isSpinning ? (
                          <>
                            <Sparkles className="h-6 w-6 mr-2 animate-spin" />
                            Spinning...
                          </>
                        ) : (
                          <>
                            <Trophy className="h-6 w-6 mr-2" />
                            SPIN TO WIN!
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* Results Display */
            <div className="text-center">
              <div className="mb-8">
                <h2 className="text-4xl font-bold text-green-600 mb-4">
                  🎉 CONGRATULATIONS! 🎉
                </h2>
                <p className="text-xl text-gray-700">
                  You won an exclusive exit offer!
                </p>
              </div>

              {/* Winning Offer Card */}
              {selectedOffer && (
                <Card className="max-w-lg mx-auto bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 shadow-xl">
                  <CardContent className="p-8">
                    <div className="text-center mb-6">
                      <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">
                        {selectedOffer.name}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {selectedOffer.description}
                      </p>
                      
                      {/* Offer Value */}
                      <div className="bg-green-100 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-center gap-2 text-green-700">
                          <DollarSign className="h-6 w-6" />
                          <span className="text-xl font-bold">
                            Value: {selectedOffer.discountPrice || '$25'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <Button
                        onClick={() => handleOfferClick(selectedOffer)}
                        className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 text-lg font-bold rounded-lg hover:from-green-600 hover:to-blue-600"
                        data-testid="button-claim-offer"
                      >
                        <ExternalLink className="h-5 w-5 mr-2" />
                        Claim Your Prize Now!
                      </Button>
                      
                      <Button
                        onClick={handleBackToSurvey}
                        variant="outline"
                        className="w-full"
                        data-testid="button-back-to-survey"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Survey
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Available Prizes Preview */}
          {!hasSpun && (
            <div className="mt-12">
              <h3 className="text-xl font-semibold text-center mb-6 text-gray-700">
                🎁 Available Prizes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {exitOffers.map((offer) => (
                  <Card key={offer.id} className="text-center p-4 bg-white/80 backdrop-blur">
                    <CardContent className="pt-4">
                      <Gift className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-sm mb-1">{offer.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{offer.category}</p>
                      <div className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs font-medium">
                        {offer.discountPrice || 'Prize Value'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}