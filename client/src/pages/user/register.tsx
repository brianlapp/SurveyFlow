import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertEndUserSchema } from "@shared/schema";
import { z } from "zod";
import { User, MapPin, Shield, Fingerprint } from "lucide-react";
import { ProgressBar } from "@/components/user/progress-bar";
import brandLogo from "@assets/brand-logo.png";

const registerFormSchema = insertEndUserSchema.omit({
  sessionId: true,
  browserFingerprint: true,
  ipAddress: true,
  userAgent: true,
  source: true,
  subSource: true,
}).extend({
  confirmEmail: z.string().email("Please enter a valid email address"),
}).refine((data) => data.email === data.confirmEmail, {
  message: "Email addresses don't match",
  path: ["confirmEmail"],
});

type RegisterForm = z.infer<typeof registerFormSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [trackingInfo, setTrackingInfo] = useState({
    source: 'direct',
    subSource: '',
    sessionId: '',
    fingerprint: '',
  });

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: `user${Date.now()}@temp.com`, // Auto-generate email
      confirmEmail: `user${Date.now()}@temp.com`,
      age: '',
      gender: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
    },
  });

  useEffect(() => {
    // Extract tracking parameters from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    
    // Try to get tracking info from localStorage first (for persistence)
    const savedTrackingInfo = localStorage.getItem('surveyTrackingInfo');
    let trackingData = null;
    
    if (savedTrackingInfo) {
      try {
        trackingData = JSON.parse(savedTrackingInfo);
      } catch (error) {
        console.warn('Failed to parse saved tracking info:', error);
      }
    }
    
    // Use URL params if available, otherwise use saved data, otherwise defaults
    const source = urlParams.get('source') || trackingData?.source || 'direct';
    const subSource = urlParams.get('sub_source') || trackingData?.subSource || '';
    
    // Generate session ID and browser fingerprint if not already saved
    const sessionId = trackingData?.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fingerprint = trackingData?.fingerprint || `fp_${navigator.userAgent.length}_${screen.width}x${screen.height}_${navigator.language}`;
    
    const finalTrackingInfo = {
      source,
      subSource,
      sessionId,
      fingerprint,
    };
    
    // Save tracking info to localStorage for persistence
    localStorage.setItem('surveyTrackingInfo', JSON.stringify(finalTrackingInfo));
    
    setTrackingInfo(finalTrackingInfo);
  }, []);

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const payload = {
        ...data,
        source: trackingInfo.source,
        subSource: trackingInfo.subSource,
        sessionId: trackingInfo.sessionId,
        browserFingerprint: trackingInfo.fingerprint,
      };
      
      // Remove confirmEmail from payload
      const { confirmEmail, ...registerData } = payload;
      
      const response = await apiRequest('POST', '/api/user/register', registerData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Store session info for the flow
      localStorage.setItem('surveySessionId', data.sessionId);
      
      // Preserve tracking info throughout the entire flow (don't remove yet)
      const trackingData = localStorage.getItem('surveyTrackingInfo');
      if (trackingData) {
        try {
          const parsed = JSON.parse(trackingData);
          // Update with actual server session ID
          parsed.serverSessionId = data.sessionId;
          localStorage.setItem('surveyTrackingInfo', JSON.stringify(parsed));
        } catch (error) {
          console.warn('Failed to update tracking info with server session ID:', error);
        }
      }
      
      toast({
        title: "Registration Successful",
        description: "Welcome! Let's get started with your survey.",
      });
      
      // Navigate to survey with session ID and preserve tracking params
      const urlParams = new URLSearchParams(window.location.search);
      const surveyUrl = `/survey/${data.sessionId}`;
      const trackingParams = new URLSearchParams();
      
      if (urlParams.get('source')) trackingParams.set('source', urlParams.get('source')!);
      if (urlParams.get('sub_source')) trackingParams.set('sub_source', urlParams.get('sub_source')!);
      
      const finalUrl = trackingParams.toString() ? `${surveyUrl}?${trackingParams.toString()}` : surveyUrl;
      setLocation(finalUrl);
    },
    onError: (error: any) => {
      let errorMessage = "Registration failed. Please try again.";
      
      // Provide specific error messages based on error type
      if (error?.status === 400) {
        errorMessage = "Please check your information and try again.";
      } else if (error?.status === 409) {
        errorMessage = "This email is already registered. Please use a different email.";
      } else if (error?.status === 429) {
        errorMessage = "Too many attempts. Please wait a moment and try again.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleNextStep = async () => {
    // Validate current step fields before proceeding
    const fieldsToValidate = currentStep === 1 
      ? ['firstName', 'lastName', 'age', 'gender'] as const
      : ['phone', 'zip', 'address', 'city', 'state'] as const;
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  // Dynamic brand info based on current step
  const brandInfo = {
    name: 'Free Finds',
    subtitle: `Step: ${currentStep}/3`,
    description: currentStep === 1 
      ? 'Fill in your details to process your Product Giveaway order'
      : 'Where should we ship your Product Giveaway?',
    gradient: 'bg-teal-primary',
    theme: 'teal',
  };

  return (
    <div className="min-h-screen bg-mint-light" data-testid="register-page">
      {/* Header */}
      <header className={`${brandInfo.gradient} text-white`}>
        <div className="flex justify-between items-center px-6 py-4">
          <img 
            src={brandLogo} 
            alt="Free Finds" 
            className="h-12" 
            data-testid="brand-logo"
          />
          <div className="text-center">
            <h1 className="text-xl font-bold" data-testid="registration-title">
              {brandInfo.subtitle}
            </h1>
            <p className="text-sm">{brandInfo.description}</p>
          </div>
          <div className="bg-green-500 px-3 py-1 rounded-full text-sm" data-testid="step-indicator">
            📝 Step 1/3
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
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
          {/* Main Registration Form */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-center mb-6" data-testid="form-title">
              {brandInfo.description}
            </h2>
            
            {/* Product Image - shown in both steps */}
            <div className="flex justify-center mb-6">
              <img 
                src="/api/placeholder/120/120" 
                alt="Product Giveaway"
                className="w-32 h-32 rounded-lg object-cover border-4 border-teal-primary"
              />
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                {/* STEP 1: Personal Info */}
                {currentStep === 1 && (
                  <>
                    {/* First Name */}
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="First Name" 
                              {...field} 
                              data-testid="input-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Last Name */}
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Last Name" 
                              {...field} 
                              data-testid="input-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Birth Date - Month/Day/Year */}
                    <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age Range *</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-age">
                                <SelectValue placeholder="Select Age Range" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="18-24">18-24</SelectItem>
                                <SelectItem value="25-34">25-34</SelectItem>
                                <SelectItem value="35-44">35-44</SelectItem>
                                <SelectItem value="45-54">45-54</SelectItem>
                                <SelectItem value="55-64">55-64</SelectItem>
                                <SelectItem value="65+">65+</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender *</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-gender">
                                <SelectValue placeholder="Select Gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                {/* Address */}
                <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123 Main Street" 
                              {...field} 
                              data-testid="input-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="New York" 
                                {...field} 
                                data-testid="input-city"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="NY" 
                                {...field} 
                                data-testid="input-state"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="10001" 
                                {...field} 
                                data-testid="input-zip"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Phone (Optional) */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel"
                            placeholder="(555) 123-4567" 
                            {...field} 
                            value={field.value || ''}
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <Button 
                  type="submit" 
                  className="w-full bg-teal-primary text-white py-3 rounded-lg font-bold text-lg hover:bg-opacity-90 transition-colors" 
                  disabled={registerMutation.isPending}
                  data-testid="button-start-survey"
                >
                  {registerMutation.isPending ? 'Creating Account...' : 'Continue to Survey →'}
                </Button>
              </form>
            </Form>
          </div>

          {/* Privacy Notice */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Privacy Protected</span>
            </div>
            <p className="text-xs text-gray-500">
              Your information is secure and will never be shared without your consent. 
              We use this data to personalize your experience and prevent fraud.
            </p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="text-center py-4 text-gray-500 text-sm">
        Limited To One Per Household
      </footer>
    </div>
  );
}
