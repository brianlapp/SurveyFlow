import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Question } from "@shared/schema";

interface SurveyStepProps {
  question: Question;
  onNext: (answer: any) => void;
  onPrevious?: () => void;
  canGoBack?: boolean;
  isLoading?: boolean;
  productImage?: string;
}

export function SurveyStep({ 
  question, 
  onNext, 
  onPrevious, 
  canGoBack = false,
  isLoading = false,
  productImage 
}: SurveyStepProps) {
  const [answer, setAnswer] = useState<any>(null);
  const [multipleSelections, setMultipleSelections] = useState<string[]>([]);

  const handleNext = () => {
    let finalAnswer = answer;
    
    if (question.type === 'multiple_select') {
      finalAnswer = multipleSelections;
    }
    
    if (question.isRequired && (!finalAnswer || finalAnswer.length === 0)) {
      return; // Don't proceed if required question is not answered
    }
    
    onNext(finalAnswer);
  };

  const handleMultipleSelectChange = (option: string, checked: boolean) => {
    if (checked) {
      setMultipleSelections(prev => [...prev, option]);
    } else {
      setMultipleSelections(prev => prev.filter(item => item !== option));
    }
  };

  const renderQuestionInput = () => {
    const options = Array.isArray(question.options) ? question.options : [];

    switch (question.type) {
      case 'multiple_choice':
        return (
          <RadioGroup value={answer || ""} onValueChange={setAnswer}>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label 
                    htmlFor={`option-${index}`}
                    className="flex-1 p-3 border border-input rounded-md hover:bg-accent cursor-pointer"
                    data-testid={`option-${index}`}
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );

      case 'yes_no':
        return (
          <RadioGroup value={answer || ""} onValueChange={setAnswer}>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="yes" />
                <Label 
                  htmlFor="yes"
                  className="flex-1 p-3 border border-input rounded-md hover:bg-accent cursor-pointer"
                  data-testid="option-yes"
                >
                  Yes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="no" />
                <Label 
                  htmlFor="no"
                  className="flex-1 p-3 border border-input rounded-md hover:bg-accent cursor-pointer"
                  data-testid="option-no"
                >
                  No
                </Label>
              </div>
            </div>
          </RadioGroup>
        );

      case 'multiple_select':
        return (
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  checked={multipleSelections.includes(option)}
                  onCheckedChange={(checked) => handleMultipleSelectChange(option, !!checked)}
                  id={`multi-option-${index}`}
                />
                <Label 
                  htmlFor={`multi-option-${index}`}
                  className="flex-1 p-3 border border-input rounded-md hover:bg-accent cursor-pointer"
                  data-testid={`multi-option-${index}`}
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <Textarea
            value={answer || ""}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter your answer..."
            className="min-h-24"
            data-testid="text-input"
          />
        );

      default:
        return (
          <Input
            value={answer || ""}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter your answer..."
            data-testid="text-input"
          />
        );
    }
  };

  const isAnswered = () => {
    if (question.type === 'multiple_select') {
      return multipleSelections.length > 0;
    }
    return answer !== null && answer !== "";
  };

  const canProceed = !question.isRequired || isAnswered();

  return (
    <div className="survey-step p-6 rounded-lg max-w-2xl mx-auto" data-testid="survey-step">
      {/* Product Image - Always visible above question */}
      {productImage && (
        <div className="flex justify-center mb-6">
          <img 
            src={productImage} 
            alt="Product Giveaway"
            className="w-32 h-32 rounded-lg object-cover border-4 border-teal-primary"
            data-testid="product-image"
          />
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-sm text-muted-foreground">
          Question {question.orderIndex + 1}
        </h4>
        {question.category && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {question.category}
          </span>
        )}
      </div>
      
      <h3 className="text-lg font-medium mb-6" data-testid="question-text">
        {question.text}
        {question.isRequired && <span className="text-destructive ml-1">*</span>}
      </h3>
      
      <div className="mb-8">
        {renderQuestionInput()}
      </div>
      
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={onPrevious}
          disabled={!canGoBack || isLoading}
          className={canGoBack ? "" : "invisible"}
          data-testid="button-previous"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!canProceed || isLoading}
          data-testid="button-next"
        >
          {isLoading ? "Loading..." : "Next"}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
