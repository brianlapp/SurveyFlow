import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, 
  ChevronLeft, 
  Eye, 
  Gift,
  ShoppingBag,
  Check,
  AlertCircle
} from "lucide-react";
import type { Question, Offer } from "@shared/schema";

type PageType = 'registration' | 'survey' | 'offers' | 'exit';

// Map page types to display page numbers used in the database
const PAGE_TYPE_TO_NUMBER: Record<PageType, number> = {
  'registration': 5,
  'survey': 10,
  'offers': 15,
  'exit': 20,
};

export default function SurveyPreview() {
  const [currentPage, setCurrentPage] = useState<PageType>('registration');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Fetch questions
  const { data: questions, isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ['/api/questions'],
  });

  // Fetch all offers
  const { data: allOffers, isLoading: offersLoading } = useQuery<Offer[]>({
    queryKey: ['/api/offers'],
  });

  // Filter offers by display page
  const getOffersForPage = (page: PageType) => {
    if (!allOffers) return [];
    const pageNumber = PAGE_TYPE_TO_NUMBER[page];
    return allOffers.filter(offer => 
      offer.isActive && 
      !offer.isPaused && 
      offer.displayPages?.includes(pageNumber)
    );
  };

  const registrationOffers = getOffersForPage('registration');
  const surveyOffers = getOffersForPage('survey');
  const mainOffers = getOffersForPage('offers');
  const exitOffers = getOffersForPage('exit');

  const handleNext = () => {
    if (currentPage === 'registration') {
      setCurrentPage('survey');
      setCurrentQuestionIndex(0);
    } else if (currentPage === 'survey') {
      if (questions && currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setCurrentPage('offers');
      }
    } else if (currentPage === 'offers') {
      setCurrentPage('exit');
    }
  };

  const handlePrevious = () => {
    if (currentPage === 'survey' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentPage === 'survey' && currentQuestionIndex === 0) {
      setCurrentPage('registration');
    } else if (currentPage === 'offers') {
      if (questions && questions.length > 0) {
        setCurrentPage('survey');
        setCurrentQuestionIndex(questions.length - 1);
      } else {
        setCurrentPage('registration');
      }
    } else if (currentPage === 'exit') {
      setCurrentPage('offers');
    }
  };

  const jumpToPage = (page: PageType) => {
    setCurrentPage(page);
    if (page === 'survey') {
      setCurrentQuestionIndex(0);
    }
  };

  const currentQuestion = questions && currentPage === 'survey' 
    ? questions[currentQuestionIndex] 
    : null;

  return (
    <div className="p-6 space-y-6" data-testid="survey-preview-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Survey Flow Preview</h1>
          <p className="text-muted-foreground mt-1">
            Test the survey flow and see which offers appear on each page
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Eye className="h-4 w-4 mr-2" />
          Preview Mode
        </Badge>
      </div>

      {/* Navigation Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button
                variant={currentPage === 'registration' ? 'default' : 'outline'}
                onClick={() => jumpToPage('registration')}
                size="sm"
                data-testid="nav-registration"
              >
                1. Registration
              </Button>
              <Button
                variant={currentPage === 'survey' ? 'default' : 'outline'}
                onClick={() => jumpToPage('survey')}
                size="sm"
                data-testid="nav-survey"
              >
                2. Survey
                {questions && ` (${questions.length})`}
              </Button>
              <Button
                variant={currentPage === 'offers' ? 'default' : 'outline'}
                onClick={() => jumpToPage('offers')}
                size="sm"
                data-testid="nav-offers"
              >
                3. Offers
              </Button>
              <Button
                variant={currentPage === 'exit' ? 'default' : 'outline'}
                onClick={() => jumpToPage('exit')}
                size="sm"
                data-testid="nav-exit"
              >
                4. Exit Lottery
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentPage === 'registration' && currentQuestionIndex === 0}
                data-testid="button-previous"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={currentPage === 'exit'}
                data-testid="button-next"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Current Page Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {currentPage === 'registration' && '📝 Registration Page'}
                {currentPage === 'survey' && `❓ Survey Question ${currentQuestionIndex + 1}/${questions?.length || 0}`}
                {currentPage === 'offers' && '🎁 Main Offers Page'}
                {currentPage === 'exit' && '🎰 Exit Lottery'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentPage === 'registration' && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    This is where users enter their information to register for the giveaway.
                  </p>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold">Fields Shown:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Step 1: Name, Age Range, Gender</li>
                      <li>• Step 2: Phone, Zip, Address, City, State</li>
                    </ul>
                  </div>
                </div>
              )}

              {currentPage === 'survey' && (
                <div className="space-y-4">
                  {questionsLoading ? (
                    <p>Loading questions...</p>
                  ) : currentQuestion ? (
                    <>
                      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="font-semibold text-lg mb-2">{currentQuestion.text}</p>
                        <Badge variant="secondary">{currentQuestion.category}</Badge>
                      </div>
                      
                      {currentQuestion.options && Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Answer Options:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {(currentQuestion.options as string[]).map((option: string, idx: number) => (
                              <div 
                                key={idx}
                                className="border rounded-lg p-3 text-sm hover:bg-accent cursor-pointer"
                                data-testid={`option-${idx}`}
                              >
                                {option}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>No questions configured yet</p>
                    </div>
                  )}
                </div>
              )}

              {currentPage === 'offers' && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Users see special offers after completing the survey questions.
                  </p>
                  <div className="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-950 dark:to-blue-950 p-4 rounded-lg border">
                    <h4 className="font-bold text-lg mb-2">Exclusive Offers Just for You!</h4>
                    <p className="text-sm text-muted-foreground">
                      Complete these specially selected offers to earn additional rewards and maximize your benefits!
                    </p>
                  </div>
                </div>
              )}

              {currentPage === 'exit' && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    The final lottery wheel where users get one last chance to win exclusive offers.
                  </p>
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 p-6 rounded-lg border border-yellow-300">
                    <h4 className="font-bold text-xl text-center mb-2">
                      🎰 Last Chance to Win!
                    </h4>
                    <p className="text-center text-sm">
                      Spin the wheel for one final chance at amazing offers!
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Offers Display */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Offers on This Page
              </CardTitle>
            </CardHeader>
            <CardContent>
              {offersLoading ? (
                <p className="text-sm text-muted-foreground">Loading offers...</p>
              ) : (
                <div className="space-y-4">
                  {currentPage === 'registration' && (
                    <OffersList offers={registrationOffers} pageType="Registration" />
                  )}
                  {currentPage === 'survey' && (
                    <OffersList offers={surveyOffers} pageType="Survey" />
                  )}
                  {currentPage === 'offers' && (
                    <OffersList offers={mainOffers} pageType="Main Offers" />
                  )}
                  {currentPage === 'exit' && (
                    <OffersList offers={exitOffers} pageType="Exit Lottery" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offers Summary */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Offers Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registration:</span>
                <Badge variant="secondary">{registrationOffers.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Survey:</span>
                <Badge variant="secondary">{surveyOffers.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Main Offers:</span>
                <Badge variant="secondary">{mainOffers.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exit Lottery:</span>
                <Badge variant="secondary">{exitOffers.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OffersList({ offers, pageType }: { offers: Offer[], pageType: string }) {
  if (offers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No offers for {pageType}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((offer) => (
        <div 
          key={offer.id} 
          className="border rounded-lg p-3 space-y-2 hover:bg-accent transition-colors"
          data-testid={`offer-preview-${offer.id}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium text-sm line-clamp-2">{offer.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{offer.category}</p>
            </div>
            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <Badge variant="outline" className="text-xs">
              ${offer.payout}
            </Badge>
            <span className="text-muted-foreground">
              {offer.offerType === 'tune_standard' && '🔗 Tune'}
              {offer.offerType === 'popup_script' && '📜 Popup'}
              {offer.offerType === 'next_link' && '➡️ Next Link'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
