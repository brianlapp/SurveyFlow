import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  FileText, 
  ExternalLink,
  Code,
  Copy,
  Check
} from "lucide-react";

interface TySurvey {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  headingColor: string;
  fontFamily: string;
  thankYouTitle: string;
  redirectUrl: string | null;
  isActive: boolean;
  totalResponses: number;
  createdAt: string;
}

const fontOptions = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Nunito",
  "Playfair Display",
  "Merriweather",
  "Source Sans Pro",
];

export default function TySurveys() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<TySurvey | null>(null);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedSurvey, setEmbedSurvey] = useState<TySurvey | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    primaryColor: "#22c55e",
    headingColor: "#1a1a1a",
    fontFamily: "Inter",
    thankYouTitle: "Thank you for completing the survey!",
    redirectUrl: "",
    isActive: true,
  });

  const { data: surveys, isLoading } = useQuery<TySurvey[]>({
    queryKey: ['/api/ty-surveys'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/ty-surveys', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-surveys'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Survey created successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to create survey", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest('PUT', `/api/ty-surveys/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-surveys'] });
      setIsDialogOpen(false);
      setEditingSurvey(null);
      resetForm();
      toast({ title: "Survey updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update survey", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/ty-surveys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-surveys'] });
      toast({ title: "Survey deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete survey", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      logoUrl: "",
      primaryColor: "#22c55e",
      headingColor: "#1a1a1a",
      fontFamily: "Inter",
      thankYouTitle: "Thank you for completing the survey!",
      redirectUrl: "",
      isActive: true,
    });
  };

  const handleEdit = (survey: TySurvey) => {
    setEditingSurvey(survey);
    setFormData({
      name: survey.name,
      slug: survey.slug,
      logoUrl: survey.logoUrl || "",
      primaryColor: survey.primaryColor || "#22c55e",
      headingColor: survey.headingColor || "#1a1a1a",
      fontFamily: survey.fontFamily || "Inter",
      thankYouTitle: survey.thankYouTitle || "Thank you for completing the survey!",
      redirectUrl: survey.redirectUrl || "",
      isActive: survey.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.slug) {
      toast({ title: "Name and slug are required", variant: "destructive" });
      return;
    }

    if (editingSurvey) {
      updateMutation.mutate({ id: editingSurvey.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this survey? This will also delete all questions and responses.")) {
      deleteMutation.mutate(id);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenEmbed = (survey: TySurvey) => {
    setEmbedSurvey(survey);
    setEmbedDialogOpen(true);
  };

  const getPublicUrl = (slug: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/s/${slug}`;
  };

  const getEmbedCode = (slug: string) => {
    const url = getPublicUrl(slug);
    return `<iframe src="${url}" width="100%" height="600" frameborder="0" style="border:none;"></iframe>`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">TY Surveys</h1>
          <p className="text-muted-foreground">Create and manage branded survey flows</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingSurvey(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Survey
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSurvey ? "Edit Survey" : "Create New Survey"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Survey Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        name: e.target.value,
                        slug: editingSurvey ? formData.slug : generateSlug(e.target.value)
                      });
                    }}
                    placeholder="e.g., Consumer Preferences Survey"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g., consumer-preferences"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Heading Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.headingColor}
                      onChange={(e) => setFormData({ ...formData, headingColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.headingColor}
                      onChange={(e) => setFormData({ ...formData, headingColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={formData.fontFamily}
                    onValueChange={(value) => setFormData({ ...formData, fontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map((font) => (
                        <SelectItem key={font} value={font}>{font}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Thank You Message</Label>
                <Input
                  value={formData.thankYouTitle}
                  onChange={(e) => setFormData({ ...formData, thankYouTitle: e.target.value })}
                  placeholder="Thank you for completing the survey!"
                />
              </div>

              <div className="space-y-2">
                <Label>Redirect URL (after completion)</Label>
                <Input
                  value={formData.redirectUrl}
                  onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                  placeholder="https://example.com/thank-you"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setEditingSurvey(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingSurvey ? "Update" : "Create"} Survey
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Surveys</CardTitle>
          <CardDescription>Manage your branded survey flows</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : surveys && surveys.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map((survey) => (
                  <TableRow key={survey.id}>
                    <TableCell className="font-medium">{survey.name}</TableCell>
                    <TableCell className="text-muted-foreground">/s/{survey.slug}</TableCell>
                    <TableCell>{survey.totalResponses || 0}</TableCell>
                    <TableCell>
                      <Badge variant={survey.isActive ? "default" : "secondary"}>
                        {survey.isActive ? "Active" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/ty-surveys/${survey.id}/questions`)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Questions
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenEmbed(survey)}
                          title="Embed Code"
                        >
                          <Code className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(getPublicUrl(survey.slug), '_blank')}
                          title="Preview"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(survey)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(survey.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No surveys yet</h3>
              <p className="text-muted-foreground mb-4">Create your first branded survey to get started</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Survey
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Embed Survey: {embedSurvey?.name}</DialogTitle>
          </DialogHeader>
          {embedSurvey && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Public URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={getPublicUrl(embedSurvey.slug)}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(getPublicUrl(embedSurvey.slug), 'url')}
                  >
                    {copiedField === 'url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Embed Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={getEmbedCode(embedSurvey.slug)}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(getEmbedCode(embedSurvey.slug), 'embed')}
                  >
                    {copiedField === 'embed' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(getPublicUrl(embedSurvey.slug), '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Survey in New Tab
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
