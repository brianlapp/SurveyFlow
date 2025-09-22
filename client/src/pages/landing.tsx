import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">SurveyFlow</h1>
            <p className="text-muted-foreground">Admin Dashboard Access</p>
          </div>
          
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground mb-6">
              Please sign in to access the admin dashboard
            </p>
            
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full"
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Secure admin access for platform management
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
