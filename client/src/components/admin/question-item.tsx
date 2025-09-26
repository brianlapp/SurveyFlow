import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Edit, Copy, GripVertical, Trash2 } from "lucide-react";
import type { Question } from "@shared/schema";

interface QuestionItemProps {
  question: Question;
  index: number;
  onEdit?: (question: Question) => void;
}

export function QuestionItem({ question, index, onEdit }: QuestionItemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this question?')) {
      deleteQuestionMutation.mutate(question.id);
    }
  };

  const getCategoryColor = (category: string | null) => {
    const colors = {
      demographics: "bg-blue-100 text-blue-800",
      interests: "bg-purple-100 text-purple-800", 
      financial: "bg-green-100 text-green-800",
      health: "bg-red-100 text-red-800",
      shopping: "bg-orange-100 text-orange-800",
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getTypeDisplay = (type: string) => {
    const typeMap = {
      multiple_choice: "Multiple Choice",
      yes_no: "Yes/No",
      text: "Text Input",
      multiple_select: "Multiple Select"
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const getOptionsCount = () => {
    if (!question.options) return null;
    const options = Array.isArray(question.options) ? question.options : [];
    return `${options.length} options`;
  };

  return (
    <div 
      className="flex items-center p-4 bg-accent rounded-lg"
      data-testid={`question-item-${question.id}`}
    >
      <div className="flex items-center space-x-3 flex-1">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-medium" data-testid="question-text">
              {question.text}
            </h4>
            {question.category && (
              <Badge 
                className={getCategoryColor(question.category)}
                data-testid="question-category"
              >
                {question.category}
              </Badge>
            )}
            {question.isRequired && (
              <Badge variant="destructive" data-testid="question-required">
                Required
              </Badge>
            )}
            {question.conditionalLogic && (
              <Badge variant="secondary" data-testid="question-conditional">
                Conditional
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span data-testid="question-type">{getTypeDisplay(question.type)}</span>
            {getOptionsCount() && (
              <span data-testid="question-options">{getOptionsCount()}</span>
            )}
            <span data-testid="question-performance">
              Order: {question.orderIndex}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onEdit?.(question)}
          data-testid="button-edit-question"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          data-testid="button-duplicate-question"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          data-testid="button-move-question"
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleDelete}
          disabled={deleteQuestionMutation.isPending}
          className="text-destructive hover:text-destructive/80"
          data-testid="button-delete-question"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
