import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowLeft,
  ExternalLink,
  Copy,
  Eye,
  Image as ImageIcon,
  Code
} from "lucide-react";

interface TyBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  thankYouTitle: string;
  fontFamily: string;
  navItems: { label: string; url: string }[];
  primaryColor: string;
  isActive: boolean;
}

interface TyPage {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  offerTitle: string;
  offerImageUrl: string | null;
  tuneOfferId: string;
  affiliateId: string;
  trackingDomain: string;
  buttonText: string;
  fbShareUrl: string | null;
  isActive: boolean;
  impressions: number;
  clicks: number;
  createdAt: string;
}

export default function TyPages() {
  const { toast } = useToast();
  const params = useParams<{ brandId: string }>();
  const brandId = params.brandId;
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<TyPage | null>(null);
  const [showEmbedCode, setShowEmbedCode] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    offerTitle: "",
    offerImageUrl: "",
    tuneOfferId: "",
    affiliateId: "",
    trackingDomain: "track.modemobile.com",
    buttonText: "CONTINUE",
    fbShareUrl: "",
    isActive: true,
  });

  const { data: brand, isLoading: brandLoading } = useQuery<TyBrand>({
    queryKey: ['/api/ty-brands', brandId],
  });

  const { data: pages, isLoading: pagesLoading } = useQuery<TyPage[]>({
    queryKey: ['/api/ty-brands', brandId, 'pages'],
    queryFn: async () => {
      const res = await fetch(`/api/ty-brands/${brandId}/pages`, { credentials: 'include' });
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', `/api/ty-brands/${brandId}/pages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-brands', brandId, 'pages'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Page created successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to create page", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest('PUT', `/api/ty-pages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-brands', brandId, 'pages'] });
      setIsDialogOpen(false);
      setEditingPage(null);
      resetForm();
      toast({ title: "Page updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update page", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/ty-pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ty-brands', brandId, 'pages'] });
      toast({ title: "Page deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete page", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      offerTitle: "",
      offerImageUrl: "",
      tuneOfferId: "",
      affiliateId: "",
      trackingDomain: "track.modemobile.com",
      buttonText: "CONTINUE",
      fbShareUrl: "",
      isActive: true,
    });
  };

  const openEditDialog = (page: TyPage) => {
    setEditingPage(page);
    setFormData({
      name: page.name,
      slug: page.slug,
      offerTitle: page.offerTitle,
      offerImageUrl: page.offerImageUrl || "",
      tuneOfferId: page.tuneOfferId,
      affiliateId: page.affiliateId,
      trackingDomain: page.trackingDomain || "track.modemobile.com",
      buttonText: page.buttonText || "CONTINUE",
      fbShareUrl: page.fbShareUrl || "",
      isActive: page.isActive,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingPage(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.slug || !formData.offerTitle || !formData.tuneOfferId || !formData.affiliateId) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    
    if (editingPage) {
      updateMutation.mutate({ id: editingPage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const getPageUrl = (page: TyPage) => {
    return `/ty/${brand?.slug}/${page.slug}`;
  };

  const getEmbedCode = (page: TyPage) => {
    const baseUrl = window.location.origin;
    return `<iframe src="${baseUrl}/ty/${brand?.slug}/${page.slug}" width="100%" height="800" frameborder="0"></iframe>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (brandLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!brand) {
    return (
      <div className="p-6">
        <p>Brand not found</p>
        <Link href="/admin/ty-brands">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Brands
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/ty-brands">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{brand.name} - Thank You Pages</h1>
          <p className="text-muted-foreground">Manage offer pages for this brand</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Page
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {pagesLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : pages && pages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Page Name</TableHead>
                  <TableHead>Offer Title</TableHead>
                  <TableHead>Tune IDs</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      {page.offerImageUrl ? (
                        <img 
                          src={page.offerImageUrl} 
                          alt={page.name} 
                          className="h-12 w-20 object-cover rounded"
                        />
                      ) : (
                        <div className="h-12 w-20 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{page.name}</p>
                        <code className="text-xs text-muted-foreground">/{page.slug}</code>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{page.offerTitle}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>Offer: {page.tuneOfferId}</p>
                        <p className="text-muted-foreground">Aff: {page.affiliateId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{page.impressions} views</p>
                        <p className="text-muted-foreground">{page.clicks} clicks</p>
                        <p className="text-green-600">
                          {page.impressions > 0 
                            ? ((page.clicks / page.impressions) * 100).toFixed(1) 
                            : 0}% CTR
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={page.isActive ? "default" : "secondary"}>
                        {page.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(getPageUrl(page), '_blank')}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowEmbedCode(page.id)}
                          title="Embed Code"
                        >
                          <Code className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDialog(page)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm("Delete this page?")) {
                              deleteMutation.mutate(page.id);
                            }
                          }}
                          title="Delete"
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
              <h3 className="font-medium mb-2">No pages yet</h3>
              <p className="text-muted-foreground mb-4">Create your first thank you page for this brand</p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Page
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPage ? "Edit Page" : "Create Page"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Page Name *</Label>
                  <Input 
                    placeholder="Amazon Prime Offer"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        name: e.target.value,
                        slug: editingPage ? formData.slug : generateSlug(e.target.value),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL Slug *</Label>
                  <Input 
                    placeholder="amazon-prime"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Offer Title/Tagline *</Label>
                <Input 
                  placeholder="EXCLUSIVE for Amazon Prime members: Do not miss this bonus"
                  value={formData.offerTitle}
                  onChange={(e) => setFormData({ ...formData, offerTitle: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Offer Image URL</Label>
                <Input 
                  placeholder="https://example.com/offer-image.jpg"
                  value={formData.offerImageUrl}
                  onChange={(e) => setFormData({ ...formData, offerImageUrl: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tune Offer ID *</Label>
                  <Input 
                    placeholder="12345"
                    value={formData.tuneOfferId}
                    onChange={(e) => setFormData({ ...formData, tuneOfferId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Affiliate ID *</Label>
                  <Input 
                    placeholder="1001"
                    value={formData.affiliateId}
                    onChange={(e) => setFormData({ ...formData, affiliateId: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tracking Domain</Label>
                <Input 
                  placeholder="track.modemobile.com"
                  value={formData.trackingDomain}
                  onChange={(e) => setFormData({ ...formData, trackingDomain: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input 
                  placeholder="CONTINUE"
                  value={formData.buttonText}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Facebook Share URL</Label>
                <Input 
                  placeholder="https://example.com/landing-page"
                  value={formData.fbShareUrl}
                  onChange={(e) => setFormData({ ...formData, fbShareUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">URL that opens when users click the FB Share button</p>
              </div>

              <div className="flex items-center gap-3">
                <Switch 
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingPage ? "Update Page" : "Create Page"}
                </Button>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-white">
              <h4 className="text-sm font-medium mb-3 text-center">Mobile Preview</h4>
              <div className="border rounded-lg overflow-hidden max-w-[320px] mx-auto shadow-lg" style={{ fontFamily: brand.fontFamily }}>
                <div className="bg-white p-4">
                  {brand.logoUrl && (
                    <img src={brand.logoUrl} alt={brand.name} className="h-10 mx-auto mb-3" />
                  )}
                  <h2 className="text-xl font-bold text-center mb-2">{brand.thankYouTitle}</h2>
                  
                  <div className="flex justify-center gap-3 text-xs text-gray-500 border-b pb-3 mb-4">
                    {(brand.navItems as { label: string; url: string }[])?.slice(0, 4).map((item, i) => (
                      <span key={i}>{item.label}</span>
                    ))}
                  </div>

                  <p className="text-center font-bold text-sm mb-4" style={{ color: brand.primaryColor }}>
                    {formData.offerTitle || "Your offer title here"}
                  </p>

                  {formData.offerImageUrl ? (
                    <img 
                      src={formData.offerImageUrl} 
                      alt="Offer" 
                      className="w-full rounded-lg mb-4"
                      onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Offer+Image')}
                    />
                  ) : (
                    <div className="w-full aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-300" />
                    </div>
                  )}

                  <button 
                    className="w-full py-3 rounded-full text-white font-bold text-lg"
                    style={{ backgroundColor: brand.primaryColor }}
                  >
                    {formData.buttonText || "CONTINUE"}
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-3">*sponsored*</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showEmbedCode} onOpenChange={() => setShowEmbedCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
          </DialogHeader>
          {showEmbedCode && pages && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Direct URL</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={`${window.location.origin}${getPageUrl(pages.find(p => p.id === showEmbedCode)!)}`}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => copyToClipboard(`${window.location.origin}${getPageUrl(pages.find(p => p.id === showEmbedCode)!)}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Iframe Embed</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={getEmbedCode(pages.find(p => p.id === showEmbedCode)!)}
                    className="font-mono text-xs"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => copyToClipboard(getEmbedCode(pages.find(p => p.id === showEmbedCode)!))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
