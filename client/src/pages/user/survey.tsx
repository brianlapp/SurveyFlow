import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgressBar } from "@/components/user/progress-bar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CheckCircle, 
  DollarSign, 
  Clock,
  User,
  ShoppingCart,
  MapPin,
  CreditCard,
  ExternalLink,
  Gift
} from "lucide-react";
import type { EndUser, Offer } from "@shared/schema";
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
  const [currentOffers, setCurrentOffers] = useState<Offer[]>([]);
  const [userRevenue, setUserRevenue] = useState(0);
  const [countdown, setCountdown] = useState({ hours: 7, minutes: 10, seconds: 20 });
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch user session with correct endpoint format
  const { data: userSession, isLoading: sessionLoading } = useQuery<EndUser>({
    queryKey: ['/api/user/session', sessionId],
    queryFn: () => apiRequest('GET', `/api/user/session/${sessionId}`).then(res => res.json()),
    enabled: !!sessionId,
  });

  // Fetch offers for the current step
  const { data: offers, isLoading: offersLoading } = useQuery<Offer[]>({
    queryKey: ['/api/offers/public'],
    enabled: currentStep === 2,
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

  // Load user data into form when session loads (but preserve step progression)
  useEffect(() => {
    if (userSession) {
      // Only update currentStep if it's the initial load or if server is ahead
      const serverStep = userSession.currentQuestionIndex || 1;
      setCurrentStep(prevStep => Math.max(prevStep, serverStep));
      
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
      console.log(`Session sync: server step ${serverStep}, keeping local step at ${Math.max(currentStep, serverStep)}`); // Debug
    }
  }, [userSession]);

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
        setIsCompleted(true);
        toast({
          title: "Success!",
          description: "Your free product order has been processed!",
        });
      }
      // Invalidate session query to refresh data (after a small delay to prevent race condition)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/user/session', sessionId] });
      }, 100);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your progress. Please try again.",
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

  useEffect(() => {
    if (!sessionId) {
      setLocation('/register');
    }
  }, [sessionId, setLocation]);

  useEffect(() => {
    if (offers && offers.length > 0 && currentStep === 2) {
      setCurrentOffers(offers.slice(0, 3)); // Show top 3 offers
    }
  }, [offers, currentStep]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    const stepData = { ...formData, currentStep };
    
    // Validate based on current step
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.birthMonth || 
          !formData.birthDay || !formData.birthYear || !formData.gender) {
        toast({
          title: "Required Fields",
          description: "Please fill in all required fields to continue.",
          variant: "destructive",
        });
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.address || !formData.city || !formData.state || !formData.zip) {
        toast({
          title: "Address Required", 
          description: "Please fill in your shipping address to continue.",
          variant: "destructive",
        });
        return;
      }
    }
    
    console.log("Submitting step data:", stepData); // Debug logging
    submitFormMutation.mutate(stepData);
  };

  const handleOfferClick = (offer: Offer) => {
    // Track click
    offerInteractionMutation.mutate({
      offerId: offer.id,
      interactionType: 'click',
    });
    
    // Open offer in new tab
    window.open(offer.clickUrl || '#', '_blank');
  };

  const handleOfferConversion = (offer: Offer) => {
    // Conversions are now server-side only - just track interaction
    offerInteractionMutation.mutate({
      offerId: offer.id,
      interactionType: 'click',
    });
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your order...</p>
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
              <p className="text-muted-foreground mb-6">
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
                <p className="text-sm text-muted-foreground">
                  Order ID: #{userSession.sessionId?.slice(-8).toUpperCase()}
                </p>
                <p className="text-sm text-muted-foreground">
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-6">
              Fill in your details to process your Product Giveaway order
            </h3>
            
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
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Shipping Address</h3>
            </div>
            
            <div className="space-y-4">
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

            {/* Special Offers Section */}
            {currentOffers.length > 0 && (
              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">Special Offers Just for You!</h4>
                </div>
                <div className="space-y-3">
                  {currentOffers.map((offer) => (
                    <div 
                      key={offer.id} 
                      className="bg-white border border-blue-200 rounded-lg p-4"
                      data-testid={`offer-${offer.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-sm">{offer.name}</h5>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                          ${offer.payout}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
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
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Order Confirmation</h3>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h4 className="font-medium">Order Summary</h4>
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50" data-testid="survey-page">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 text-gray-900">Free Product Giveaway</h1>
            <p className="text-xl text-gray-600 mb-4">Claim Your Free Item Today</p>
            
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-2 text-pink-600">
                <span className="text-2xl">🎁</span>
                <span className="font-semibold">Limited Supply</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <span className="font-medium">Time Remaining</span>
              </div>
            </div>
            
            {/* Countdown Timer */}
            <div className="text-2xl font-bold text-red-600 mb-6">
              {String(countdown.hours).padStart(2, '0')}:
              {String(countdown.minutes).padStart(2, '0')}:
              {String(countdown.seconds).padStart(2, '0')}
            </div>

            {/* Progress Indicator */}
            <ProgressBar current={currentStep} total={3} className="mb-8" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Cart Summary */}
            <div className="space-y-6">
              <Card className="border-2 border-pink-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingCart className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Cart Summary</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Original Price</span>
                      <span className="line-through text-gray-500">$15.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Product Cost</span>
                      <span className="font-bold text-green-600">$0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="font-bold text-green-600">FREE</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-green-600">
                        <span>You save</span>
                        <span className="font-bold">$15.00</span>
                      </div>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Cost</span>
                        <span className="text-green-600">$0.00</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Product Image */}
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="relative inline-block">
                    <img 
                      src={productImage} 
                      alt="Pink branded slides - free giveaway product"
                      className="w-full max-w-sm mx-auto rounded-lg shadow-md"
                    />
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">*Representative image only</p>
                </CardContent>
              </Card>

              {/* Revenue Tracking */}
              {userRevenue > 0 && (
                <Card className="border-2 border-green-200">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Your Rewards
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Earnings:</span>
                        <span className="font-bold text-lg text-green-600">
                          ${userRevenue.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div 
                          className="bg-green-500 h-3 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min((userRevenue / 3.0) * 100, 100)}%` }}
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
              )}
            </div>

            {/* Right Column - Form */}
            <div className="space-y-6">
              <Card className="border-2 border-blue-200">
                <CardContent className="p-6">
                  {renderStepContent()}

                  <Button
                    onClick={handleContinue}
                    disabled={submitFormMutation.isPending}
                    className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700 mt-6"
                    data-testid="button-continue"
                  >
                    {submitFormMutation.isPending ? "Processing..." : 
                     currentStep === 3 ? "Complete Order" : "Continue"}
                  </Button>
                </CardContent>
              </Card>

              {/* Footer */}
              <p className="text-center text-sm text-gray-600">
                Limited To One Per Household
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}