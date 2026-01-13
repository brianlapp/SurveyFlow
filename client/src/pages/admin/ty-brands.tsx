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
  Image as ImageIcon,
  X
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
  isActive: boolean;
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
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    thankYouTitle: "Thank you for joining!",
    fontFamily: "Inter",
    navItems: defaultNavItems,
    primaryColor: "#22c55e",
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

            <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
