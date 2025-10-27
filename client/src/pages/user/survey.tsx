import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgressBar } from "@/components/user/progress-bar";
import { SurveyStep } from "@/components/user/survey-step";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { OfferCardDisplay } from "@/components/user/offer-card-display";
import { 
  CheckCircle, 
  DollarSign, 
  Clock,
  User,
  ShoppingCart,
  MapPin,
  CreditCard,
  ExternalLink,
  Gift,
  Sparkles
} from "lucide-react";
import type { EndUser, Offer, Question } from "@shared/schema";
import type { PublicOffer } from "@shared/types";
import brandLogo from "@assets/brand-logo.png";
import productImage from "@assets/stock_images/pink_slides_sandals__9c5591d5.jpg";

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
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthMonth: "",
    birthDay: "",
    birthYear: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: ""
  });
  const [currentOffers, setCurrentOffers] = useState<PublicOffer[]>([]);
  const [userRevenue, setUserRevenue] = useState(0);
  const [countdown, setCountdown] = useState({ hours: 7, minutes: 10, seconds: 20 });
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompletingOrder, setIsCompletingOrder] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, any>>({});

  // Fetch user session with correct endpoint format
  const { data: userSession, isLoading: sessionLoading } = useQuery<EndUser>({
    queryKey: ['/api/user/session', sessionId],
    queryFn: () => apiRequest('GET', `/api/user/session/${sessionId}`).then(res => res.json()),
    enabled: !!sessionId,
  });

  // Fetch questions for Step 2
  const { data: questions, isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ['/api/questions'],
    queryFn: () => apiRequest('GET', '/api/questions?active=true').then(res => res.json()),
    enabled: currentStep === 2,
  });

  // Fetch offers for Steps 2 and 3 (survey questions and main offers)
  const { data: offers, isLoading: offersLoading } = useQuery<PublicOffer[]>({
    queryKey: ['/api/offers/public'],
    enabled: currentStep >= 2,
  });

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load user data and enforce server-authoritative step progression
  useEffect(() => {
    if (userSession && !isCompletingOrder) {
      // Determine correct step based on user data completion status
      let validStep = 1;
      
      // Step 1: Personal info required
      if (userSession.firstName && userSession.lastName && userSession.address) {
        validStep = 2; // Personal info completed, move to questions
      }
      
      // Step 2: Survey questions completed
      if (userSession.surveyCompleted) {
        validStep = 3; // Survey completed, move to offers
      }
      
      setCurrentStep(validStep);
      setCurrentQuestionIndex(userSession.currentQuestionIndex || 0);
      
      setUserRevenue(parseFloat(userSession.totalRevenue?.toString() || '0'));
      setFormData(prev => ({
        ...prev,
        firstName: userSession.firstName || "",
        lastName: userSession.lastName || "",
        gender: userSession.gender || "",
        address: userSession.address || "",
        city: userSession.city || "",
        state: userSession.state || "",
        zip: userSession.zip || "",
        phone: userSession.phone || ""
      }));
      console.log(`Session sync: user completion status -> step ${validStep}, question index ${userSession.currentQuestionIndex || 0}`);
    }
  }, [userSession, isCompletingOrder]);

  // Submit form mutation
  const submitFormMutation = useMutation({
    mutationFn: async (data: typeof formData & { currentStep: number }) => {
      const response = await apiRequest('POST', '/api/user/update-profile', {
        sessionId: sessionId,
        ...data,
      });
      return await response.json();
    },
    onSuccess: (updatedUser) => {
      if (currentStep < 3) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        console.log(`Step progression: ${currentStep} -> ${nextStep}`); // Debug logging
        toast({
          title: "Progress Saved",
          description: `Step ${currentStep} completed successfully!`,
        });
      } else {
        // Step 3 completed - redirect to exit lottery with tracking preservation
        toast({
          title: "Order Complete!",
          description: "Redirecting to your final bonus opportunity...",
        });
        
        // Preserve tracking parameters for exit lottery
        const currentParams = new URLSearchParams(window.location.search);
        const exitUrl = `/exit/${sessionId}`;
        const trackingParams = new URLSearchParams();
        
        if (currentParams.get('source')) trackingParams.set('source', currentParams.get('source')!);
        if (currentParams.get('sub_source')) trackingParams.set('sub_source', currentParams.get('sub_source')!);
        
        const finalExitUrl = trackingParams.toString() ? `${exitUrl}?${trackingParams.toString()}` : exitUrl;
        
        setTimeout(() => {
          setLocation(finalExitUrl);
        }, 2000); // 2 second delay to show completion message
      }
      // Invalidate session query to refresh data (after a small delay to prevent race condition)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/user/session', sessionId] });
      }, 100);
    },
    onError: (error: any) => {
      let errorMessage = "Failed to save your progress. Please try again.";
      
      // Provide specific error messages
      if (error?.status === 401) {
        errorMessage = "Your session has expired. Please start over.";
        localStorage.removeItem('surveySessionId');
        setTimeout(() => setLocation('/register'), 2000);
      } else if (error?.status === 404) {
        errorMessage = "Session not found. Please start a new survey.";
        localStorage.removeItem('surveySessionId');
        setTimeout(() => setLocation('/register'), 2000);
      } else if (error?.status === 400) {
        errorMessage = "Please check your information and try again.";
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

  // Offer interaction mutation (no revenue from client)
  const offerInteractionMutation = useMutation({
    mutationFn: async ({ offerId, interactionType }: { 
      offerId: string; 
      interactionType: 'view' | 'click'; // Only view and click allowed
    }) => {
      await apiRequest('POST', '/api/offer/interact', {
        sessionId: sessionId,
        offerId,
        interactionType,
        pageNumber: currentStep,
      });
    },
    onSuccess: (_, variables) => {
      // Client interactions don't generate revenue anymore
      toast({
        title: "Interaction Recorded!",
        description: `Your ${variables.interactionType} has been recorded.`,
      });
    },
  });

  // Enhanced session validation and navigation guard
  useEffect(() => {
    if (!sessionId) {
      console.warn('No session ID provided, redirecting to registration');
      setLocation('/register');
      return;
    }
    
    // Additional validation - check if session exists in localStorage
    const savedSessionId = localStorage.getItem('surveySessionId');
    if (savedSessionId && savedSessionId !== sessionId) {
      console.warn('Session ID mismatch, redirecting to registration');
      localStorage.removeItem('surveySessionId');
      setLocation('/register');
      return;
    }
  }, [sessionId, setLocation]);

  useEffect(() => {
    if (offers && offers.length > 0 && (currentStep === 2 || currentStep === 3)) {
      // Determine which page number based on current step
      const pageNumber = currentStep === 2 ? 10 : 15; // Step 2 = page 10 (survey), Step 3 = page 15 (main offers)
      
      // Filter offers by displayPages for current page
      const pageOffers = offers.filter(offer => offer.displayPages?.includes(pageNumber));
      
      // Sort filtered offers for optimal display using public display fields
      const sortedOffers = [...pageOffers].sort((a, b) => {
        const aSavings = parseFloat(a.originalPrice?.replace('$', '') || '0') - parseFloat(a.discountPrice?.replace('$', '') || '0');
        const bSavings = parseFloat(b.originalPrice?.replace('$', '') || '0') - parseFloat(b.discountPrice?.replace('$', '') || '0');
        
        // Premium offers (high savings) first
        if (aSavings >= 50 && bSavings < 50) return -1;
        if (bSavings >= 50 && aSavings < 50) return 1;
        
        // Featured offers (high rating or position 1) next
        if ((a.rating >= 4.5 || a.position === 1) && !(b.rating >= 4.5 || b.position === 1)) return -1;
        if ((b.rating >= 4.5 || b.position === 1) && !(a.rating >= 4.5 || a.position === 1)) return 1;
        
        // Sort by savings amount descending
        return bSavings - aSavings;
      });
      
      setCurrentOffers(sortedOffers.slice(0, 6)); // Show up to 6 offers with varied layout
    } else {
      // Clear offers when not on steps 2 or 3
      setCurrentOffers([]);
    }
  }, [offers, currentStep]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    // Step 3 (Offers) should complete the order without updating profile
    if (currentStep === 3) {
      // Set completion state to prevent session sync interference
      setIsCompletingOrder(true);
      
      // Invalidate session cache before redirect to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/session'] });
      
      // Complete the order and redirect to exit lottery
      toast({
        title: "Order Complete!",
        description: "Redirecting to your final bonus opportunity...",
      });
      
      // Preserve tracking parameters for exit lottery
      const currentParams = new URLSearchParams(window.location.search);
      const exitUrl = `/exit/${sessionId}`;
      const trackingParams = new URLSearchParams();
      
      if (currentParams.get('source')) trackingParams.set('source', currentParams.get('source')!);
      if (currentParams.get('sub_source')) trackingParams.set('sub_source', currentParams.get('sub_source')!);
      
      const finalExitUrl = trackingParams.toString() ? `${exitUrl}?${trackingParams.toString()}` : exitUrl;
      
      setTimeout(() => {
        setLocation(finalExitUrl);
      }, 2000); // 2 second delay to show completion message
      
      return;
    }
    
    // For Steps 1 and 2, continue with profile update
    const stepData = { ...formData, currentStep };
    
    // Validate based on current step
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.birthMonth || 
          !formData.birthDay || !formData.birthYear || !formData.gender ||
          !formData.address || !formData.city || !formData.state || !formData.zip) {
        toast({
          title: "Required Fields",
          description: "Please fill in all required fields to continue.",
          variant: "destructive",
        });
        return;
      }
    }
    
    console.log("Submitting step data:", stepData); // Debug logging
    submitFormMutation.mutate(stepData);
  };

  // Survey question handlers
  const handleSurveyAnswer = async (answer: any) => {
    if (!questions || currentQuestionIndex >= questions.length) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    
    // Save answer
    setSurveyAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));

    // Submit answer to backend
    try {
      await apiRequest('POST', '/api/user/response', {
        sessionId: sessionId,
        questionId: currentQuestion.id,
        answer: answer
      });

      // Move to next question or complete survey
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // All questions completed, move to step 3
        setCurrentStep(3);
        
        // Invalidate session cache to ensure fresh data for exit lottery
        queryClient.invalidateQueries({ queryKey: ['/api/user/session'] });
        
        toast({
          title: "Survey Complete!",
          description: "Thank you for answering our questions. Now see your offers!",
        });
      }
    } catch (error) {
      console.error('Error saving survey answer:', error);
      toast({
        title: "Error",
        description: "Failed to save your answer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSurveyPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      setCurrentStep(1);
    }
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

  const handleOfferConversion = (offer: PublicOffer) => {
    // Conversions are now server-side only - just track interaction
    offerInteractionMutation.mutate({
      offerId: offer.id,
      interactionType: 'click',
    });
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mint-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (!userSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mint-light">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">Session not found or expired.</p>
            <Button onClick={() => setLocation('/register')} data-testid="button-restart">
              Start New Order
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8" data-testid="survey-completed">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="text-center border-2 border-green-200">
            <CardContent className="pt-8 pb-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2 text-green-800">Order Complete!</h1>
              <p className="text-gray-600 mb-6">
                Thank you! Your free product order has been successfully processed.
              </p>
              
              <div className="bg-green-50 rounded-lg p-6 mb-6 border border-green-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                  <span className="text-lg font-semibold text-green-600">
                    Free Product Confirmed
                  </span>
                </div>
                <p className="text-sm text-green-700 mb-2">
                  Your free pink slides will be shipped to your address within 7-10 business days.
                </p>
                {userRevenue >= 3.0 && (
                  <p className="text-sm text-green-700">
                    💰 Bonus: You earned ${userRevenue.toFixed(2)} in rewards!
                  </p>
                )}
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Order ID: #{userSession.sessionId?.slice(-8).toUpperCase()}
                </p>
                <p className="text-sm text-gray-600">
                  You will receive an email confirmation shortly.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const generateMonths = () => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months.map((month, index) => ({ value: (index + 1).toString(), label: month }));
  };

  const generateDays = () => {
    return Array.from({ length: 31 }, (_, i) => ({ value: (i + 1).toString(), label: (i + 1).toString() }));
  };

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 1940; year--) {
      years.push({ value: year.toString(), label: year.toString() });
    }
    return years;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-6">
              Complete your details to claim your free product
            </h3>
            
            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">Personal Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="First Name"
                    className="mt-1"
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Last Name"
                    className="mt-1"
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Month</Label>
                  <Select value={formData.birthMonth} onValueChange={(value) => handleInputChange('birthMonth', value)}>
                    <SelectTrigger className="mt-1" data-testid="select-birth-month">
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateMonths().map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Day</Label>
                  <Select value={formData.birthDay} onValueChange={(value) => handleInputChange('birthDay', value)}>
                    <SelectTrigger className="mt-1" data-testid="select-birth-day">
                      <SelectValue placeholder="DD" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateDays().map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Year</Label>
                  <Select value={formData.birthYear} onValueChange={(value) => handleInputChange('birthYear', value)}>
                    <SelectTrigger className="mt-1" data-testid="select-birth-year">
                      <SelectValue placeholder="YYYY" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateYears().map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Gender</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Button
                    type="button"
                    variant={formData.gender === 'female' ? 'default' : 'outline'}
                    onClick={() => handleInputChange('gender', 'female')}
                    className="h-12 flex items-center gap-2"
                    data-testid="button-gender-female"
                  >
                    <User className="h-4 w-4" />
                    Female
                  </Button>
                  <Button
                    type="button"
                    variant={formData.gender === 'male' ? 'default' : 'outline'}
                    onClick={() => handleInputChange('gender', 'male')}
                    className="h-12 flex items-center gap-2"
                    data-testid="button-gender-male"
                  >
                    <User className="h-4 w-4" />
                    Male
                  </Button>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <h4 className="font-medium text-gray-700">Shipping Address</h4>
              </div>
              
              <div>
                <Label htmlFor="address" className="text-sm font-medium">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main Street"
                  className="mt-1"
                  data-testid="input-address"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-sm font-medium">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                    className="mt-1"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-sm font-medium">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="State"
                    className="mt-1"
                    data-testid="input-state"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zip" className="text-sm font-medium">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => handleInputChange('zip', e.target.value)}
                    placeholder="12345"
                    className="mt-1"
                    data-testid="input-zip"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1"
                    data-testid="input-phone"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        // Survey Questions Step
        if (questionsLoading) {
          return (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading survey questions...</p>
            </div>
          );
        }

        if (!questions || questions.length === 0) {
          return (
            <div className="text-center py-8">
              <p className="text-gray-600">No survey questions available at this time.</p>
              <Button 
                onClick={() => setCurrentStep(3)} 
                className="mt-4 bg-teal-primary text-white"
                data-testid="button-skip-survey"
              >
                Continue to Offers
              </Button>
            </div>
          );
        }

        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion) {
          return (
            <div className="text-center py-8">
              <p className="text-gray-600">Survey complete!</p>
              <Button 
                onClick={() => setCurrentStep(3)} 
                className="mt-4 bg-teal-primary text-white"
                data-testid="button-continue-to-offers"
              >
                Continue to Offers
              </Button>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Survey Questions</h3>
              <p className="text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            
            <SurveyStep
              key={currentQuestion.id}
              question={currentQuestion}
              onNext={handleSurveyAnswer}
              onPrevious={handleSurveyPrevious}
              canGoBack={currentQuestionIndex > 0 || currentStep > 1}
              productImage={productImage}
              isLoading={false}
            />

            {/* Survey Page Offers (Page 10) */}
            {currentOffers.length > 0 && (
              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">Special Offers Available</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentOffers.slice(0, 4).map((offer) => (
                    <div 
                      key={offer.id}
                      className="p-3 bg-white rounded border hover:shadow-md transition-shadow"
                      data-testid={`offer-item-${offer.id}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold">{offer.name}</span>
                      </div>
                      {offer.description && (
                        <p className="text-xs text-gray-600 mb-2">{offer.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-green-600 font-semibold">
                          {offer.discountPrice}
                        </span>
                        {offer.clickUrl && (
                          <a 
                            href={offer.clickUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                            data-testid={`offer-link-${offer.id}`}
                          >
                            View Offer
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Special Offers & Order Confirmation</h3>
            </div>
            
            {/* Special Offers Section */}
            {currentOffers.length > 0 && (
              <div className="mb-8">
                <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-200 p-6 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-6 w-6 text-teal-600" />
                    <h4 className="font-bold text-xl text-teal-800">Exclusive Offers Just for You!</h4>
                  </div>
                  <p className="text-teal-700 mb-2">
                    Complete these specially selected offers to earn additional rewards and maximize your benefits!
                  </p>
                  <div className="flex items-center gap-4 text-sm text-teal-600">
                    <span className="flex items-center gap-1">
                      <Gift className="h-4 w-4" />
                      No Hidden Fees
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Instant Rewards
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      High Payouts
                    </span>
                  </div>
                </div>

                {/* Smart Grid Layout for Multiple Card Styles */}
                <div className="space-y-6">
                  {/* Premium Offers Row */}
                  {(() => {
                    const premiumOffers = currentOffers.filter(offer => {
                      const savings = parseFloat(offer.originalPrice?.replace('$', '') || '0') - parseFloat(offer.discountPrice?.replace('$', '') || '0');
                      return savings >= 50;
                    }).slice(0, 2);
                    return premiumOffers.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="premium-offers-row">
                        {premiumOffers.map((offer) => (
                          <OfferCardDisplay
                            key={offer.id}
                            offer={offer}
                            onOfferClick={handleOfferClick}
                            style="premium"
                          />
                        ))}
                      </div>
                    );
                  })()}

                  {/* Featured Offers Row */}
                  {(() => {
                    const featuredOffers = currentOffers.filter(offer => {
                      const savings = parseFloat(offer.originalPrice?.replace('$', '') || '0') - parseFloat(offer.discountPrice?.replace('$', '') || '0');
                      return savings < 50 && (offer.rating >= 4.5 || offer.position === 1 || offer.offerType === 'giveaway');
                    }).slice(0, 2);
                    return featuredOffers.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="featured-offers-row">
                        {featuredOffers.map((offer) => (
                          <OfferCardDisplay
                            key={offer.id}
                            offer={offer}
                            onOfferClick={handleOfferClick}
                            style="featured"
                          />
                        ))}
                      </div>
                    );
                  })()}

                  {/* Standard Offers Row */}
                  {(() => {
                    const standardOffers = currentOffers.filter(offer => {
                      const savings = parseFloat(offer.originalPrice?.replace('$', '') || '0') - parseFloat(offer.discountPrice?.replace('$', '') || '0');
                      return savings >= 20 && savings < 50 && !(offer.rating >= 4.5 || offer.position === 1 || offer.offerType === 'giveaway');
                    }).slice(0, 2);
                    return standardOffers.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="standard-offers-row">
                        {standardOffers.map((offer) => (
                          <OfferCardDisplay
                            key={offer.id}
                            offer={offer}
                            onOfferClick={handleOfferClick}
                            style="standard"
                          />
                        ))}
                      </div>
                    );
                  })()}

                  {/* Compact Offers Row */}
                  {(() => {
                    const compactOffers = currentOffers.filter(offer => {
                      const savings = parseFloat(offer.originalPrice?.replace('$', '') || '0') - parseFloat(offer.discountPrice?.replace('$', '') || '0');
                      return savings < 20;
                    }).slice(0, 3);
                    return compactOffers.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="compact-offers-row">
                        {compactOffers.map((offer) => (
                          <OfferCardDisplay
                            key={offer.id}
                            offer={offer}
                            onOfferClick={handleOfferClick}
                            style="compact"
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Savings Potential Summary */}
                <div className="mt-6 bg-green-50 rounded-lg p-4 border border-green-200" data-testid="savings-potential">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">Total Savings Potential</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Complete all offers above to save up to $
                    {currentOffers.reduce((total, offer) => {
                      const originalPrice = parseFloat(offer.originalPrice?.replace('$', '') || '0');
                      const discountPrice = parseFloat(offer.discountPrice?.replace('$', '') || '0');
                      return total + (originalPrice - discountPrice);
                    }, 0).toFixed(0)} 
                    on premium products and services! Each offer is carefully selected and vetted for quality.
                  </p>
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5" />
                <h4 className="font-medium">Order Summary</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping to:</span>
                  <span>{formData.address}, {formData.city}, {formData.state} {formData.zip}</span>
                </div>
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span>Pink Slides (Free)</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total Cost:</span>
                  <span className="text-green-600">$0.00</span>
                </div>
              </div>
            </div>

            {userRevenue > 0 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Rewards Earned</span>
                </div>
                <p className="text-sm text-green-700">
                  You've earned ${userRevenue.toFixed(2)} in rewards by completing offers!
                  {userRevenue >= 3.0 && " 🎉 You've reached the reward threshold!"}
                </p>
              </div>
            )}

            <p className="text-sm text-gray-600">
              By clicking "Complete Order" you confirm that all information is accurate and agree to receive your free product.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-mint-light" data-testid="survey-page">
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
            <h1 className="text-xl font-bold" data-testid="survey-title">
              Survey - Step {currentStep} of 3
            </h1>
            <p className="text-sm">Complete the survey to claim your free item</p>
          </div>
          <div className="bg-green-500 px-3 py-1 rounded-full text-sm" data-testid="step-indicator">
            📝 Step {currentStep}/3
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-md mx-auto px-4">
          <ProgressBar current={currentStep} total={3} />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex justify-center py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4">
          <div className="mb-6">{renderStepContent()}</div>

          {/* Continue Button */}
          {currentStep !== 2 && (
            <Button 
              onClick={handleContinue}
              disabled={submitFormMutation.isPending}
              className="w-full bg-teal-primary text-white py-3 rounded-lg font-bold text-lg hover:bg-opacity-90 transition-colors"
              data-testid="button-continue"
            >
              {submitFormMutation.isPending ? 'Saving...' : 
               currentStep === 3 ? 'Complete Order & Get Bonus' : 'Continue →'}
            </Button>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="text-center py-4 text-gray-500 text-sm">
        Limited To One Per Household
      </footer>
    </div>
  );
}