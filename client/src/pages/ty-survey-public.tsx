import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface Offer {
  id: string;
  name: string;
  imageUrl: string | null;
  clickUrl: string;
  displayMode: string;
  displayOrder: number;
}

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  options: string[] | null;
  isRequired: boolean;
  offers: Offer[];
}

interface SurveyData {
  survey: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string;
    headingColor: string;
    fontFamily: string;
    thankYouTitle: string;
    redirectUrl: string | null;
  };
  questions: Question[];
}

function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export default function TySurveyPublic() {
  const { surveySlug } = useParams<{ surveySlug: string }>();
  const [data, setData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [sessionId] = useState(() => generateSessionId());
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const res = await fetch(`/api/public/survey/${surveySlug}`);
        if (!res.ok) throw new Error("Survey not found");
        const surveyData = await res.json();
        setData(surveyData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSurvey();
  }, [surveySlug]);

  const currentQuestion = data?.questions[currentIndex];
  const progress = data ? ((currentIndex + 1) / data.questions.length) * 100 : 0;

  const handleAnswer = (value: any) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const submitAnswer = async () => {
    if (!currentQuestion || !data) return;

    try {
      await fetch(`/api/public/survey/${surveySlug}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          answer: answers[currentQuestion.id],
        }),
      });
    } catch (e) {}
  };

  const handleNext = async () => {
    if (!currentQuestion || !data) return;

    await submitAnswer();

    const afterQuestionOffers = currentQuestion.offers.filter(o => o.displayMode === 'after_question');
    
    if (afterQuestionOffers.length > 0 && !showInterstitial) {
      setShowInterstitial(true);
      return;
    }

    setShowInterstitial(false);

    if (currentIndex < data.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await completeSurvey();
    }
  };

  const completeSurvey = async () => {
    try {
      const res = await fetch(`/api/public/survey/${surveySlug}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const result = await res.json();
      setCompleted(true);
      
      if (result.redirectUrl) {
        setTimeout(() => {
          window.location.href = result.redirectUrl;
        }, 3000);
      }
    } catch (e) {}
  };

  const handleOfferClick = (offer: Offer) => {
    window.open(offer.clickUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Survey Not Found</h1>
          <p className="text-gray-500">This survey is no longer available.</p>
        </div>
      </div>
    );
  }

  const { survey } = data;

  if (completed) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4"
        style={{ fontFamily: `'${survey.fontFamily}', system-ui, sans-serif` }}
      >
        <link 
          href={`https://fonts.googleapis.com/css2?family=${survey.fontFamily.replace(' ', '+')}&display=swap`} 
          rel="stylesheet" 
        />
        {survey.logoUrl && (
          <img src={survey.logoUrl} alt="" className="h-12 mb-6" />
        )}
        <h1 
          className="text-3xl font-bold text-center mb-4"
          style={{ color: survey.headingColor }}
        >
          {survey.thankYouTitle}
        </h1>
        {survey.redirectUrl && (
          <p className="text-gray-500">Redirecting you shortly...</p>
        )}
      </div>
    );
  }

  const withQuestionOffers = currentQuestion?.offers.filter(o => o.displayMode === 'with_question') || [];
  const afterQuestionOffers = currentQuestion?.offers.filter(o => o.displayMode === 'after_question') || [];

  if (showInterstitial && afterQuestionOffers.length > 0) {
    return (
      <div 
        className="min-h-screen bg-gray-50"
        style={{ fontFamily: `'${survey.fontFamily}', system-ui, sans-serif` }}
      >
        <link 
          href={`https://fonts.googleapis.com/css2?family=${survey.fontFamily.replace(' ', '+')}&display=swap`} 
          rel="stylesheet" 
        />
        
        <header className="bg-white border-b py-4 px-4">
          <div className="max-w-lg mx-auto flex items-center justify-center">
            {survey.logoUrl ? (
              <img src={survey.logoUrl} alt="" className="h-8" />
            ) : (
              <span className="font-bold text-xl">{survey.name}</span>
            )}
          </div>
        </header>

        <main className="max-w-lg mx-auto p-4 py-8">
          <h2 
            className="text-xl font-bold text-center mb-6"
            style={{ color: survey.headingColor }}
          >
            Check out these offers!
          </h2>

          <div className="space-y-4 mb-8">
            {afterQuestionOffers.map((offer) => (
              <div 
                key={offer.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden border cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => handleOfferClick(offer)}
              >
                {offer.imageUrl && (
                  <img src={offer.imageUrl} alt={offer.name} className="w-full" />
                )}
                <div className="p-4">
                  <p className="font-bold text-center">{offer.name}</p>
                </div>
              </div>
            ))}
          </div>

          <Button 
            onClick={handleNext}
            className="w-full py-6 text-lg font-bold"
            style={{ backgroundColor: survey.primaryColor }}
          >
            Continue
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: `'${survey.fontFamily}', system-ui, sans-serif` }}
    >
      <link 
        href={`https://fonts.googleapis.com/css2?family=${survey.fontFamily.replace(' ', '+')}&display=swap`} 
        rel="stylesheet" 
      />
      
      <header className="bg-white border-b py-4 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-center">
          {survey.logoUrl ? (
            <img src={survey.logoUrl} alt="" className="h-8" />
          ) : (
            <span className="font-bold text-xl">{survey.name}</span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 py-8">
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Question {currentIndex + 1} of {data.questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {currentQuestion && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 
              className="text-xl font-bold mb-6"
              style={{ color: survey.headingColor }}
            >
              {currentQuestion.questionText}
            </h2>

            {currentQuestion.questionType === "multiple_choice" && currentQuestion.options && (
              <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={handleAnswer}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.questionType === "yes_no" && (
              <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={handleAnswer}
                className="space-y-3"
              >
                {["Yes", "No"].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value={option} id={`option-${option}`} />
                    <Label htmlFor={`option-${option}`} className="flex-1 cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.questionType === "text_input" && (
              <Input
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="text-lg p-4"
              />
            )}

            {currentQuestion.questionType === "multiple_select" && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const selected = (answers[currentQuestion.id] || []) as string[];
                  return (
                    <div 
                      key={index} 
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        const newSelected = selected.includes(option)
                          ? selected.filter(s => s !== option)
                          : [...selected, option];
                        handleAnswer(newSelected);
                      }}
                    >
                      <Checkbox checked={selected.includes(option)} />
                      <span className="flex-1">{option}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {withQuestionOffers.length > 0 && (
          <div className="mb-6 space-y-4">
            <p className="text-sm text-gray-500 text-center">Sponsored Offers</p>
            {withQuestionOffers.map((offer) => (
              <div 
                key={offer.id}
                className="bg-white rounded-xl shadow overflow-hidden border cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleOfferClick(offer)}
              >
                {offer.imageUrl && (
                  <img src={offer.imageUrl} alt={offer.name} className="w-full" />
                )}
                <div className="p-3">
                  <p className="font-medium text-center text-sm">{offer.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button 
          onClick={handleNext}
          className="w-full py-6 text-lg font-bold"
          style={{ backgroundColor: survey.primaryColor }}
          disabled={currentQuestion?.isRequired && !answers[currentQuestion.id]}
        >
          {currentIndex < data.questions.length - 1 ? "Next" : "Complete Survey"}
        </Button>
      </main>
    </div>
  );
}
