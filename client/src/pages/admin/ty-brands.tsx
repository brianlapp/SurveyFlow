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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  FileText, 
  ExternalLink,
  Image as ImageIcon,
  X,
  Code,
  Copy,
  Check
} from "lucide-react";

interface NavItem {
  label: string;
  url: string;
}

interface TyBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  thankYouTitle: string;
  fontFamily: string;
  navItems: NavItem[];
  primaryColor: string;
  headingColor: string;
  taglineColor: string;
  newsletterReminder: string | null;
  footerCopyright: string | null;
  termsUrl: string | null;
  privacyUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

interface TyPage {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  offerTitle: string;
  offerImageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
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

const defaultNavItems: NavItem[] = [
  { label: "Home", url: "#" },
  { label: "Contact Us", url: "#" },
  { label: "T&Cs", url: "#" },
  { label: "Privacy", url: "#" },
];

export default function TyBrands() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<TyBrand | null>(null);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedBrand, setEmbedBrand] = useState<TyBrand | null>(null);
  const [embedPages, setEmbedPages] = useState<TyPage[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    thankYouTitle: "Thank you for joining!",
    fontFamily: "Inter",
    navItems: defaultNavItems,
    primaryColor: "#22c55e",
    headingColor: "#22c55e",
    taglineColor: "#22c55e",
    newsletterReminder: "Thanks for signing up for our newsletter! Don't miss out—be sure to check your inbox and your SPAM folder so you can stay updated on the latest free samples, rewards, sweepstakes, and more!",
    footerCopyright: "Copyright 2025© Mode Mobile",
    termsUrl: "",
    privacyUrl: "",
    isActive: true,
  });

  const { data: brands, isLoading } = useQuery<TyBrand[]>({
    queryKey: ['/api/ty-brands'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/ty-brands', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-brands'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Brand created successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to create brand", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest('PUT', `/api/ty-brands/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-brands'] });
      setIsDialogOpen(false);
      setEditingBrand(null);
      resetForm();
      toast({ title: "Brand updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update brand", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/ty-brands/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-brands'] });
      toast({ title: "Brand deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete brand", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      logoUrl: "",
      thankYouTitle: "Thank you for joining!",
      fontFamily: "Inter",
      navItems: defaultNavItems,
      primaryColor: "#22c55e",
      headingColor: "#22c55e",
      taglineColor: "#22c55e",
      newsletterReminder: "Thanks for signing up for our newsletter! Don't miss out—be sure to check your inbox and your SPAM folder so you can stay updated on the latest free samples, rewards, sweepstakes, and more!",
      footerCopyright: "Copyright 2025© Mode Mobile",
      termsUrl: "",
      privacyUrl: "",
      isActive: true,
    });
  };

  const openEditDialog = (brand: TyBrand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl || "",
      thankYouTitle: brand.thankYouTitle || "Thank you for joining!",
      fontFamily: brand.fontFamily || "Inter",
      navItems: (brand.navItems as NavItem[]) || defaultNavItems,
      primaryColor: brand.primaryColor || "#22c55e",
      headingColor: brand.headingColor || "#22c55e",
      taglineColor: brand.taglineColor || "#22c55e",
      newsletterReminder: brand.newsletterReminder || "",
      footerCopyright: brand.footerCopyright || "",
      termsUrl: brand.termsUrl || "",
      privacyUrl: brand.privacyUrl || "",
      isActive: brand.isActive,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingBrand(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.slug) {
      toast({ title: "Name and slug are required", variant: "destructive" });
      return;
    }
    
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const updateNavItem = (index: number, field: 'label' | 'url', value: string) => {
    const newNavItems = [...formData.navItems];
    newNavItems[index] = { ...newNavItems[index], [field]: value };
    setFormData({ ...formData, navItems: newNavItems });
  };

  const addNavItem = () => {
    setFormData({
      ...formData,
      navItems: [...formData.navItems, { label: "", url: "#" }],
    });
  };

  const removeNavItem = (index: number) => {
    setFormData({
      ...formData,
      navItems: formData.navItems.filter((_, i) => i !== index),
    });
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const openEmbedDialog = async (brand: TyBrand) => {
    setEmbedBrand(brand);
    setEmbedDialogOpen(true);
    try {
      const res = await fetch(`/api/ty-brands/${brand.id}/embed-metadata`, { credentials: 'include' });
      const data = await res.json();
      setEmbedPages(data.pages || []);
    } catch (error) {
      console.error("Failed to load embed data:", error);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const getEmbedUrl = (brand: TyBrand) => {
    return `${window.location.origin}/embed/ty/${brand.slug}`;
  };

  const getIframeCode = (brand: TyBrand) => {
    const url = getEmbedUrl(brand);
    return `<iframe src="${url}" width="100%" height="600" frameborder="0" style="border: none;"></iframe>`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Thank You Page Brands</h1>
          <p className="text-muted-foreground">Create and manage branded thank you page templates</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Brand
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : brands && brands.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Logo</TableHead>
                  <TableHead>Brand Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Font</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell>
                      {brand.logoUrl ? (
                        <img 
                          src={brand.logoUrl} 
                          alt={brand.name} 
                          className="h-10 w-auto max-w-20 object-contain"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{brand.slug}</code>
                    </TableCell>
                    <TableCell>{brand.fontFamily}</TableCell>
                    <TableCell>
                      <Badge variant={brand.isActive ? "default" : "secondary"}>
                        {brand.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/admin/ty-brands/${brand.id}/pages`)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Manage Pages
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEmbedDialog(brand)}
                          title="Embed"
                        >
                          <Code className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDialog(brand)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this brand? This will also delete all associated pages.")) {
                              deleteMutation.mutate(brand.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No brands yet</h3>
              <p className="text-muted-foreground mb-4">Create your first thank you page brand to get started</p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Brand
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBrand ? "Edit Brand" : "Create Brand"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand Name *</Label>
                <Input 
                  placeholder="FreeFinds"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      name: e.target.value,
                      slug: editingBrand ? formData.slug : generateSlug(e.target.value),
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>URL Slug *</Label>
                <Input 
                  placeholder="freefinds"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">/ty/{formData.slug || 'your-slug'}/page-name</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input 
                placeholder="https://example.com/logo.png"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              />
              {formData.logoUrl && (
                <img 
                  src={formData.logoUrl} 
                  alt="Preview" 
                  className="h-12 w-auto object-contain mt-2"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Thank You Title</Label>
              <Input 
                placeholder="Thank you for joining FreeFinds!"
                value={formData.thankYouTitle}
                onChange={(e) => setFormData({ ...formData, thankYouTitle: e.target.value })}
              />
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

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Color Settings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Heading Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={formData.headingColor}
                      onChange={(e) => setFormData({ ...formData, headingColor: e.target.value })}
                      className="w-10 h-9 p-1"
                    />
                    <Input 
                      value={formData.headingColor}
                      onChange={(e) => setFormData({ ...formData, headingColor: e.target.value })}
                      className="flex-1 text-xs"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Thank You title</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Tagline Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={formData.taglineColor}
                      onChange={(e) => setFormData({ ...formData, taglineColor: e.target.value })}
                      className="w-10 h-9 p-1"
                    />
                    <Input 
                      value={formData.taglineColor}
                      onChange={(e) => setFormData({ ...formData, taglineColor: e.target.value })}
                      className="flex-1 text-xs"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Offer tagline</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Button Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-10 h-9 p-1"
                    />
                    <Input 
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1 text-xs"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">CTA button</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Navigation Items (for FB Compliance)</Label>
                <Button variant="outline" size="sm" onClick={addNavItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {formData.navItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input 
                      placeholder="Label"
                      value={item.label}
                      onChange={(e) => updateNavItem(index, 'label', e.target.value)}
                      className="flex-1"
                    />
                    <Input 
                      placeholder="URL"
                      value={item.url}
                      onChange={(e) => updateNavItem(index, 'url', e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeNavItem(index)}
                      disabled={formData.navItems.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Footer Section</h4>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Newsletter Reminder Text</Label>
                  <Textarea 
                    placeholder="Thanks for signing up for our newsletter! Don't miss out..."
                    value={formData.newsletterReminder}
                    onChange={(e) => setFormData({ ...formData, newsletterReminder: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Footer Copyright</Label>
                  <Input 
                    placeholder="Copyright 2025© Mode Mobile"
                    value={formData.footerCopyright}
                    onChange={(e) => setFormData({ ...formData, footerCopyright: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Terms of Service URL</Label>
                    <Input 
                      placeholder="https://example.com/terms"
                      value={formData.termsUrl}
                      onChange={(e) => setFormData({ ...formData, termsUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Privacy Policy URL</Label>
                    <Input 
                      placeholder="https://example.com/privacy"
                      value={formData.privacyUrl}
                      onChange={(e) => setFormData({ ...formData, privacyUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch 
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingBrand ? "Update Brand" : "Create Brand"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embed {embedBrand?.name}</DialogTitle>
          </DialogHeader>
          
          {embedBrand && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Display Link</Label>
                <div className="flex gap-2">
                  <Input 
                    value={getEmbedUrl(embedBrand)} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(getEmbedUrl(embedBrand), 'url')}
                  >
                    {copiedField === 'url' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Each page load shows the next offer in rotation
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Iframe Embed Code</Label>
                <div className="flex gap-2">
                  <Textarea 
                    value={getIframeCode(embedBrand)} 
                    readOnly 
                    className="font-mono text-xs h-20"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(getIframeCode(embedBrand), 'iframe')}
                  >
                    {copiedField === 'iframe' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Pages in Rotation ({embedPages.filter(p => p.isActive).length} active)</Label>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {embedPages.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Page Name</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {embedPages.map((page, index) => (
                          <TableRow key={page.id}>
                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-medium">{page.name}</TableCell>
                            <TableCell>
                              <Badge variant={page.isActive ? "default" : "secondary"}>
                                {page.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No pages found. Create pages to include in the rotation.
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Manage page order and status in the "Manage Pages" section
                </p>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setEmbedDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
