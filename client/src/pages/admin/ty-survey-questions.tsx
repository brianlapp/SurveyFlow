import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowLeft,
  GripVertical,
  Sparkles,
  Settings,
  X,
  Check
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TySurvey {
  id: string;
  name: string;
  slug: string;
}

interface TySurveyQuestion {
  id: string;
  surveyId: string;
  questionText: string;
  questionType: string;
  options: string[] | null;
  displayOrder: number;
  isActive: boolean;
  isRequired: boolean;
  category: string | null;
}

interface Offer {
  id: string;
  name: string;
  payout: string;
  imageUrl: string | null;
}

interface QuestionOffer {
  id: string;
  questionId: string;
  offerId: string;
  displayOrder: number;
  displayMode: string;
  offer: Offer;
}

const questionTypes = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "yes_no", label: "Yes / No" },
  { value: "text_input", label: "Text Input" },
  { value: "multiple_select", label: "Multiple Select" },
];

function SortableRow({ question, onEdit, onDelete, onToggleStatus, onAssignOffers }: {
  question: TySurveyQuestion;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onAssignOffers: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="font-medium max-w-md">
        <div className="truncate">{question.questionText}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {questionTypes.find(t => t.value === question.questionType)?.label || question.questionType}
        </Badge>
      </TableCell>
      <TableCell>
        {question.category ? (
          <Badge variant="secondary" className="capitalize">
            {question.category}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge 
          variant={question.isActive ? "default" : "secondary"}
          className="cursor-pointer"
          onClick={onToggleStatus}
        >
          {question.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onAssignOffers}>
            <Settings className="h-4 w-4 mr-1" />
            Offers
          </Button>
          <Button variant="outline" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function TySurveyQuestions() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TySurveyQuestion | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [selectedGenerated, setSelectedGenerated] = useState<number[]>([]);
  const [offersDialogOpen, setOffersDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<TySurveyQuestion | null>(null);
  const [questionOffers, setQuestionOffers] = useState<QuestionOffer[]>([]);
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);
  const [offerDisplayMode, setOfferDisplayMode] = useState<string>("with_question");
  
  const [formData, setFormData] = useState({
    questionText: "",
    questionType: "multiple_choice",
    options: ["", "", ""],
    isRequired: true,
    category: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: survey } = useQuery<TySurvey>({
    queryKey: ['/api/ty-surveys', surveyId],
  });

  const { data: questions, isLoading } = useQuery<TySurveyQuestion[]>({
    queryKey: ['/api/ty-surveys', surveyId, 'questions'],
  });

  const { data: allOffers } = useQuery<Offer[]>({
    queryKey: ['/api/offers'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/ty-surveys/${surveyId}/questions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-surveys', surveyId, 'questions'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Question created successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to create question", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest('PUT', `/api/ty-survey-questions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-surveys', surveyId, 'questions'] });
      setIsDialogOpen(false);
      setEditingQuestion(null);
      resetForm();
      toast({ title: "Question updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update question", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/ty-survey-questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-surveys', surveyId, 'questions'] });
      toast({ title: "Question deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete question", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('PATCH', `/api/ty-survey-questions/${id}/status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-surveys', surveyId, 'questions'] });
    },
    onError: () => {
      toast({ title: "Failed to toggle status", variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (questionOrders: { id: string; displayOrder: number }[]) => {
      return apiRequest('POST', `/api/ty-surveys/${surveyId}/questions/reorder`, { questionOrders });
    },
    onError: () => {
      toast({ title: "Failed to reorder questions", variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/ty-surveys/${surveyId}/generate-questions`, {
        topic: aiTopic,
        count: aiCount,
      });
    },
    onSuccess: (data: any) => {
      setGeneratedQuestions(data.questions || []);
      setSelectedGenerated([]);
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to generate questions", variant: "destructive" });
    },
  });

  const addGeneratedMutation = useMutation({
    mutationFn: async (questions: any[]) => {
      return apiRequest('POST', `/api/ty-surveys/${surveyId}/add-generated`, { questions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-surveys', surveyId, 'questions'] });
      setAiDialogOpen(false);
      setGeneratedQuestions([]);
      setSelectedGenerated([]);
      setAiTopic("");
      toast({ title: "Questions added successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to add questions", variant: "destructive" });
    },
  });

  const saveOffersMutation = useMutation({
    mutationFn: async ({ questionId, offers }: { questionId: string; offers: any[] }) => {
      return apiRequest('PUT', `/api/ty-survey-questions/${questionId}/offers`, { offers });
    },
    onSuccess: () => {
      setOffersDialogOpen(false);
      setSelectedQuestion(null);
      toast({ title: "Offers saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to save offers", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      questionText: "",
      questionType: "multiple_choice",
      options: ["", "", ""],
      isRequired: true,
      category: "",
    });
  };

  const handleEdit = (question: TySurveyQuestion) => {
    setEditingQuestion(question);
    setFormData({
      questionText: question.questionText,
      questionType: question.questionType,
      options: question.options || ["", "", ""],
      isRequired: question.isRequired,
      category: question.category || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.questionText) {
      toast({ title: "Question text is required", variant: "destructive" });
      return;
    }

    const data = {
      questionText: formData.questionText,
      questionType: formData.questionType,
      options: formData.questionType === "multiple_choice" || formData.questionType === "multiple_select" 
        ? formData.options.filter(o => o.trim()) 
        : null,
      isRequired: formData.isRequired,
      category: formData.category || null,
    };

    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && questions) {
      const oldIndex = questions.findIndex(q => q.id === active.id);
      const newIndex = questions.findIndex(q => q.id === over.id);
      
      const newOrder = arrayMove(questions, oldIndex, newIndex);
      
      queryClient.setQueryData(['/api/ty-surveys', surveyId, 'questions'], newOrder);
      
      const questionOrders = newOrder.map((q, index) => ({
        id: q.id,
        displayOrder: index,
      }));
      
      reorderMutation.mutate(questionOrders);
    }
  };

  const handleOpenOffers = async (question: TySurveyQuestion) => {
    setSelectedQuestion(question);
    try {
      const response = await fetch(`/api/ty-survey-questions/${question.id}/offers`);
      const data = await response.json();
      setQuestionOffers(data);
      setSelectedOfferIds(data.map((qo: QuestionOffer) => qo.offerId));
      setOfferDisplayMode(data[0]?.displayMode || "with_question");
    } catch (e) {
      setQuestionOffers([]);
      setSelectedOfferIds([]);
    }
    setOffersDialogOpen(true);
  };

  const handleSaveOffers = () => {
    if (!selectedQuestion) return;
    
    const offers = selectedOfferIds.map((offerId, index) => ({
      offerId,
      displayOrder: index,
      displayMode: offerDisplayMode,
    }));
    
    saveOffersMutation.mutate({ questionId: selectedQuestion.id, offers });
  };

  const toggleOfferSelection = (offerId: string) => {
    setSelectedOfferIds(prev => 
      prev.includes(offerId) 
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId]
    );
  };

  const handleAddGenerated = () => {
    const questionsToAdd = selectedGenerated.map(index => generatedQuestions[index]);
    addGeneratedMutation.mutate(questionsToAdd);
  };

  const addOption = () => {
    setFormData({ ...formData, options: [...formData.options, ""] });
  };

  const removeOption = (index: number) => {
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin/ty-surveys')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Survey Questions</h1>
          <p className="text-muted-foreground">{survey?.name}</p>
        </div>
        <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
          <Sparkles className="h-4 w-4 mr-2" />
          AI Generate
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingQuestion(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "Edit Question" : "Add New Question"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Question Text *</Label>
                <Textarea
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  placeholder="Enter your question..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={formData.questionType}
                    onValueChange={(value) => setFormData({ ...formData, questionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {questionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category (Optional)</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Demographics"
                  />
                </div>
              </div>

              {(formData.questionType === "multiple_choice" || formData.questionType === "multiple_select") && (
                <div className="space-y-2">
                  <Label>Answer Options</Label>
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {formData.options.length > 2 && (
                        <Button variant="outline" size="icon" onClick={() => removeOption(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
                />
                <Label>Required</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setEditingQuestion(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingQuestion ? "Update" : "Add"} Question
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>Drag to reorder, click status to toggle</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : questions && questions.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                    {questions.map((question) => (
                      <SortableRow
                        key={question.id}
                        question={question}
                        onEdit={() => handleEdit(question)}
                        onDelete={() => handleDelete(question.id)}
                        onToggleStatus={() => toggleStatusMutation.mutate(question.id)}
                        onAssignOffers={() => handleOpenOffers(question)}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No questions yet</h3>
              <p className="text-muted-foreground mb-4">Add questions manually or use AI to generate them</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Generate
                </Button>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Generate Questions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {generatedQuestions.length === 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Input
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g., Personal finance habits, Shopping preferences"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Number of Questions</Label>
                  <Select
                    value={aiCount.toString()}
                    onValueChange={(value) => setAiCount(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5, 7, 10].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n} questions</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => generateMutation.mutate()}
                  disabled={!aiTopic || generateMutation.isPending}
                  className="w-full"
                >
                  {generateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Questions
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  {generatedQuestions.map((q, index) => (
                    <div 
                      key={index} 
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedGenerated.includes(index) ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        setSelectedGenerated(prev =>
                          prev.includes(index)
                            ? prev.filter(i => i !== index)
                            : [...prev, index]
                        );
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox 
                          checked={selectedGenerated.includes(index)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{q.questionText}</p>
                          <p className="text-sm text-muted-foreground">
                            Type: {q.questionType}
                            {q.options && ` • ${q.options.length} options`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setGeneratedQuestions([]);
                      setSelectedGenerated([]);
                    }}
                  >
                    Generate New
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (selectedGenerated.length === generatedQuestions.length) {
                          setSelectedGenerated([]);
                        } else {
                          setSelectedGenerated(generatedQuestions.map((_, i) => i));
                        }
                      }}
                    >
                      {selectedGenerated.length === generatedQuestions.length ? "Deselect All" : "Select All"}
                    </Button>
                    <Button 
                      onClick={handleAddGenerated}
                      disabled={selectedGenerated.length === 0 || addGeneratedMutation.isPending}
                    >
                      Add {selectedGenerated.length} Question{selectedGenerated.length !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={offersDialogOpen} onOpenChange={setOffersDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Offers to Question</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedQuestion.questionText}</p>
              </div>

              <div className="space-y-2">
                <Label>Display Mode</Label>
                <Select
                  value={offerDisplayMode}
                  onValueChange={setOfferDisplayMode}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="with_question">With Question (same page)</SelectItem>
                    <SelectItem value="after_question">After Question (interstitial)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Offers</Label>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {allOffers?.map((offer) => (
                    <div 
                      key={offer.id}
                      className={`p-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                        selectedOfferIds.includes(offer.id) ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => toggleOfferSelection(offer.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={selectedOfferIds.includes(offer.id)} />
                        {offer.imageUrl && (
                          <img src={offer.imageUrl} alt="" className="w-10 h-10 object-cover rounded" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{offer.name}</p>
                          <p className="text-sm text-muted-foreground">${offer.payout} payout</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOffersDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveOffers}
                  disabled={saveOffersMutation.isPending}
                >
                  Save Offers
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
