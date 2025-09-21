import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuestionItem } from "@/components/admin/question-item";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuestionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wand2, Eye, Search } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const createQuestionFormSchema = insertQuestionSchema.extend({
  options: z.array(z.string()).optional(),
});

type CreateQuestionForm = z.infer<typeof createQuestionFormSchema>;

export default function Questions() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    search: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ['/api/questions'],
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: CreateQuestionForm) => {
      const payload = {
        ...data,
        options: data.type === 'text' ? null : data.options,
      };
      await apiRequest('POST', '/api/questions', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
      setShowCreateModal(false);
      toast({
        title: "Success",
        description: "Question created successfully",
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

  const generateQuestionsMutation = useMutation({
    mutationFn: async (data: { category: string; count: number }) => {
      const response = await apiRequest('POST', '/api/questions/generate', data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
      setShowGenerateModal(false);
      toast({
        title: "Success",
        description: `Generated ${data.questions?.length || 0} questions`,
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

  const form = useForm<CreateQuestionForm>({
    resolver: zodResolver(createQuestionFormSchema),
    defaultValues: {
      text: '',
      type: 'multiple_choice',
      category: '',
      isRequired: true,
      isActive: true,
      orderIndex: 0,
      options: [''],
    },
  });

  const generateForm = useForm({
    defaultValues: {
      category: '',
      count: 10,
    },
  });

  const watchType = form.watch('type');
  const watchOptions = form.watch('options') || [''];

  const onSubmit = (data: CreateQuestionForm) => {
    const orderIndex = questions?.length || 0;
    createQuestionMutation.mutate({
      ...data,
      orderIndex,
    });
  };

  const onGenerateSubmit = (data: any) => {
    generateQuestionsMutation.mutate(data);
  };

  const addOption = () => {
    const currentOptions = form.getValues('options') || [];
    form.setValue('options', [...currentOptions, '']);
  };

  const removeOption = (index: number) => {
    const currentOptions = form.getValues('options') || [];
    form.setValue('options', currentOptions.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const currentOptions = form.getValues('options') || [];
    const newOptions = [...currentOptions];
    newOptions[index] = value;
    form.setValue('options', newOptions);
  };

  const filteredQuestions = questions?.filter((question: any) => {
    if (filters.category && filters.category !== 'all' && question.category !== filters.category) return false;
    if (filters.search && !question.text.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  })?.sort((a: any, b: any) => a.orderIndex - b.orderIndex) || [];

  return (
    <div className="p-6 space-y-6" data-testid="questions-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Questions Management</h2>
          <p className="text-muted-foreground">Manage survey questions and conditional logic</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowGenerateModal(true)}
            data-testid="button-generate"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            AI Generate
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            data-testid="button-create-question"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Survey Questions ({filteredQuestions.length} total)</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <Input
                  placeholder="Search questions..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-48"
                  data-testid="input-search-questions"
                />
                <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="w-40" data-testid="select-category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="demographics">Demographics</SelectItem>
                    <SelectItem value="interests">Interests</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" data-testid="button-preview-flow">
                <Eye className="h-4 w-4 mr-2" />
                Preview Flow
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((question: any, index: number) => (
                <QuestionItem key={question.id} question={question} index={index} />
              ))}
              
              {filteredQuestions.length === 0 && (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">No questions found</p>
                  <p className="text-sm text-muted-foreground">Create your first question to get started</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Question Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl" data-testid="modal-create-question">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Text *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What is your age range?"
                        {...field}
                        data-testid="textarea-question-text"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Type *</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-question-type">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            <SelectItem value="yes_no">Yes/No</SelectItem>
                            <SelectItem value="text">Text Input</SelectItem>
                            <SelectItem value="multiple_select">Multiple Select</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-question-category">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="demographics">Demographics</SelectItem>
                            <SelectItem value="interests">Interests</SelectItem>
                            <SelectItem value="financial">Financial</SelectItem>
                            <SelectItem value="health">Health</SelectItem>
                            <SelectItem value="shopping">Shopping</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              {watchType !== 'text' && (
                <div>
                  <FormLabel>Answer Options</FormLabel>
                  <div className="space-y-2 mt-2">
                    {watchOptions.map((option: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          data-testid={`input-option-${index}`}
                        />
                        {watchOptions.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeOption(index)}
                            data-testid={`button-remove-option-${index}`}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addOption}
                      data-testid="button-add-option"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-4">
                <FormField
                  control={form.control}
                  name="isRequired"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-required"
                        />
                      </FormControl>
                      <FormLabel>Required question</FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-active"
                        />
                      </FormControl>
                      <FormLabel>Active</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  data-testid="button-cancel-question"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createQuestionMutation.isPending}
                  data-testid="button-create-question-submit"
                >
                  {createQuestionMutation.isPending ? 'Creating...' : 'Create Question'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Generate Questions Modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent data-testid="modal-generate-questions">
          <DialogHeader>
            <DialogTitle>AI Generate Questions</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={generateForm.handleSubmit(onGenerateSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select {...generateForm.register('category')}>
                <SelectTrigger data-testid="select-generate-category">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demographics">Demographics</SelectItem>
                  <SelectItem value="interests">Interests</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Number of Questions</label>
              <Input
                type="number"
                min="1"
                max="50"
                {...generateForm.register('count', { valueAsNumber: true })}
                data-testid="input-question-count"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowGenerateModal(false)}
                data-testid="button-cancel-generate"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={generateQuestionsMutation.isPending}
                data-testid="button-generate-submit"
              >
                {generateQuestionsMutation.isPending ? 'Generating...' : 'Generate Questions'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
