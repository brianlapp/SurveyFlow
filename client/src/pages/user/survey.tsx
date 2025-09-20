import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/user/progress-bar";
import { SurveyStep } from "@/components/user/survey-step";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CheckCircle, 
  DollarSign, 
  Target, 
  Zap,
  ExternalLink,
  Gift
} from "lucide-react";

interface SurveyProps {
  params?: {
    sessionId?: string;
  };
}

export default function Survey({ params }: SurveyProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const sessionId = params?.sessionId;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [currentOffers, setCurrentOffers] = useState<any[]>([]);
  const [userRevenue, setUserRevenue] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch user session
  const { data: userSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['/api/user/session', sessionId],
    enabled: !!sessionId,
  });

  // Fetch questions
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['/api/questions', { active: true }],
  });

  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: any }) => {
      const response = await apiRequest('POST', '/api/user/response', {
        endUserId: userSession?.id,
        questionId,
        answer,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      // Update offers if any returned
      if (data.offers && data.offers.length > 0) {
        setCurrentOffers(data.offers);
      }
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Offer interaction mutation
  const offerInteractionMutation = useMutation({
    mutationFn: async ({ offerId, interactionType, revenue }: { 
      offerId: string; 
      interactionType: string; 
      revenue?: number;
    }) => {
      await apiRequest('POST', '/api/offer/interact', {
        endUserId: userSession?.id,
        offerId,
        interactionType,
        revenue: revenue?.toString() || '0.00',
        pageNumber: Math.ceil((currentQuestionIndex + 1) / 1), // Assuming 1 question per page
      });
    },
    onSuccess: (_, variables) => {
      if (variables.revenue) {
        setUserRevenue(prev => prev + variables.revenue!);
        toast({
          title: "Great!",
          description: `You earned $${variables.revenue?.toFixed(2)}!`,
        });
      }
    },
  });

  // Complete survey mutation
  const completeSurveyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/user/complete', {
        endUserId: userSession?.id,
      });
    },
    onSuccess: () => {
      setIsCompleted(true);
      toast({
        title: "Survey Complete!",
        description: "Thank you for your participation. Your rewards are being processed.",
      });
    },
  });

  useEffect(() => {
    if (!sessionId) {
      // Redirect to registration if no session
      setLocation('/register');
    }
  }, [sessionId, setLocation]);

  useEffect(() => {
    if (userSession) {
      setCurrentQuestionIndex(userSession.currentQuestionIndex || 0);
      setUserRevenue(parseFloat(userSession.totalRevenue || '0'));
    }
  }, [userSession]);

  // Check if survey should be completed
  useEffect(() => {
    if (questions && currentQuestionIndex >= questions.length && !isCompleted) {
      completeSurveyMutation.mutate();
    }
  }, [currentQuestionIndex, questions, isCompleted]);

  const handleAnswer = (answer: any) => {
    if (!questions || !userSession) return;

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    // Store answer locally
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));

    // Submit to backend
    submitResponseMutation.mutate({
      questionId: currentQuestion.id,
      answer,
    });
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleOfferClick = (offer: any) => {
    // Track click
    offerInteractionMutation.mutate({
      offerId: offer.id,
      interactionType: 'click',
    });
    
    // Open offer in new tab
    window.open(offer.clickUrl || '#', '_blank');
  };

  const handleOfferConversion = (offer: any) => {
    // Track conversion with revenue
    offerInteractionMutation.mutate({
      offerId: offer.id,
      interactionType: 'conversion',
      revenue: parseFloat(offer.payout || '0'),
    });
  };

  if (sessionLoading || questionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your survey...</p>
        </div>
      </div>
    );
  }

  if (!userSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Session not found or expired.</p>
            <Button onClick={() => setLocation('/register')} data-testid="button-restart">
              Start New Survey
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="survey-completed">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="text-center">
            <CardContent className="pt-8 pb-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Survey Complete!</h1>
              <p className="text-muted-foreground mb-6">
                Thank you for participating in our survey. Your responses help us provide better recommendations.
              </p>
              
              <div className="bg-green-50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-lg font-semibold text-green-600">
                    Total Earned: ${userRevenue.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-green-700">
                  {userRevenue >= 3.0 
                    ? "✓ Reward threshold reached! Processing your rewards now."
                    : `$${(3.0 - userRevenue).toFixed(2)} more needed to unlock rewards.`
                  }
                </p>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You answered {questions?.length || 0} questions and interacted with {currentOffers.length} offers.
                </p>
                <p className="text-sm text-muted-foreground">
                  Look out for an email confirmation with your reward details.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = questions?.[currentQuestionIndex];
  const totalQuestions = questions?.length || 30;
  const progressPercentage = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-background py-6" data-testid="survey-page">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header with Progress */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-4">Survey in Progress</h1>
            <ProgressBar 
              current={currentQuestionIndex + 1} 
              total={totalQuestions}
              className="max-w-md mx-auto"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Survey Content */}
            <div className="lg:col-span-2">
              {currentQuestion ? (
                <SurveyStep
                  question={currentQuestion}
                  onNext={handleAnswer}
                  onPrevious={handlePrevious}
                  canGoBack={currentQuestionIndex > 0}
                  isLoading={submitResponseMutation.isPending}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">Loading next question...</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Revenue Tracking */}
              <Card data-testid="card-revenue-tracking">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Your Progress
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current Earnings:</span>
                      <span className="font-bold text-lg text-green-600" data-testid="text-current-earnings">
                        ${userRevenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Reward Threshold:</span>
                      <span className="font-medium">$3.00</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div 
                        className="bg-green-500 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min((userRevenue / 3.0) * 100, 100)}%` }}
                        data-testid="progress-revenue"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {userRevenue >= 3.0 
                        ? "🎉 Reward threshold reached!"
                        : `$${(3.0 - userRevenue).toFixed(2)} remaining to unlock rewards`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Current Offers */}
              {currentOffers.length > 0 && (
                <Card data-testid="card-current-offers">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      Special Offers for You
                    </h3>
                    <div className="space-y-3">
                      {currentOffers.map((offer) => (
                        <div 
                          key={offer.id} 
                          className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                          data-testid={`offer-${offer.id}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">{offer.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              ${offer.payout}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            {offer.description}
                          </p>
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => handleOfferClick(offer)}
                            data-testid={`button-offer-${offer.id}`}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Offer
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Survey Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Survey Info
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Questions Answered:</span>
                      <span className="font-medium">{currentQuestionIndex}/{totalQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Offers Viewed:</span>
                      <span className="font-medium">{currentOffers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completion:</span>
                      <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="pt-2 text-xs text-muted-foreground">
                      <p>• Your progress is automatically saved</p>
                      <p>• You can go back to previous questions</p>
                      <p>• All data is securely encrypted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
