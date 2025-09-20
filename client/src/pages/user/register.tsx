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
      email: '',
      confirmEmail: '',
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
    // Extract tracking parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source') || 'direct';
    const subSource = urlParams.get('sub_source') || '';
    
    // Generate session ID and browser fingerprint
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fingerprint = `fp_${navigator.userAgent.length}_${screen.width}x${screen.height}_${navigator.language}`;
    
    setTrackingInfo({
      source,
      subSource,
      sessionId,
      fingerprint,
    });
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
      toast({
        title: "Registration Successful",
        description: "Welcome! Let's get started with your survey.",
      });
      // Navigate to survey with session ID
      setLocation(`/survey/${data.sessionId}`);
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  // Determine brand based on current domain or default
  const getBrandInfo = () => {
    const hostname = window.location.hostname;
    
    if (hostname.includes('modefree')) {
      return {
        name: 'ModeFreeFinds',
        subtitle: 'Discover Amazing Deals!',
        description: 'Get exclusive access to free samples and special offers',
        gradient: 'from-blue-500 to-purple-600',
        theme: 'blue',
      };
    } else if (hostname.includes('modemarket')) {
      return {
        name: 'ModeMarketMunchies',
        subtitle: 'Smart Financial Decisions',
        description: 'Unlock your financial potential with expert insights',
        gradient: 'from-green-600 to-emerald-700',
        theme: 'green',
      };
    }
    
    // Default brand
    return {
      name: 'Co-Reg Platform',
      subtitle: 'Welcome to Our Survey',
      description: 'Help us understand your preferences and discover relevant offers',
      gradient: 'from-primary to-primary/80',
      theme: 'blue',
    };
  };

  const brandInfo = getBrandInfo();

  return (
    <div className="min-h-screen bg-background" data-testid="register-page">
      {/* Header */}
      <div className={`bg-gradient-to-r ${brandInfo.gradient} text-white py-8`}>
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-2">{brandInfo.subtitle}</h1>
          <p className="text-lg opacity-90">{brandInfo.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Main Registration Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Create Your Account
              </CardTitle>
              <p className="text-muted-foreground">
                Please provide your information to get started. This will only take a minute.
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="John" 
                              {...field} 
                              data-testid="input-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Doe" 
                              {...field} 
                              data-testid="input-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email Fields */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="john@example.com" 
                              {...field} 
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Email Address *</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="john@example.com" 
                              {...field} 
                              data-testid="input-confirm-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Demographics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="space-y-4">
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={registerMutation.isPending}
                    data-testid="button-start-survey"
                  >
                    {registerMutation.isPending ? 'Creating Account...' : 'Start Survey'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Source Tracking Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                Privacy & Tracking Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Source:</span>
                    <Badge variant="secondary" className="ml-2" data-testid="badge-source">
                      {trackingInfo.source}
                    </Badge>
                  </div>
                </div>
                {trackingInfo.subSource && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Campaign:</span>
                      <Badge variant="outline" className="ml-2" data-testid="badge-sub-source">
                        {trackingInfo.subSource}
                      </Badge>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Session:</span>
                    <span className="ml-2 font-mono text-xs" data-testid="text-session-id">
                      {trackingInfo.sessionId.slice(0, 16)}...
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Security:</span>
                    <span className="ml-2 font-mono text-xs" data-testid="text-fingerprint">
                      Protected
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                We use this information to personalize your experience and prevent fraud. 
                Your data is secure and will never be shared without your consent.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
