import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Mail,
  Code,
  Copy,
  Check,
  ExternalLink,
  BarChart3
} from "lucide-react";

interface EmailList {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  defaultWidth: number;
  defaultHeight: number;
  isActive: boolean;
  nextAdIndex: number;
  totalImpressions: number;
  totalClicks: number;
  createdAt: string;
}

interface EmailAd {
  id: string;
  listId: string;
  adType: string;
  name: string;
  title: string;
  imageUrl: string;
  mobileImageUrl: string;
  bodyHtml: string;
  ctaText: string;
  linkColor: string;
  textColor: string;
  fontSize: number;
  tuneOfferId: string;
  affiliateId: string;
  trackingDomain: string;
  buttonText: string;
  buttonColor: string;
  displayOrder: number;
  isActive: boolean;
  impressions: number;
  clicks: number;
}

const espTemplates = [
  {
    name: "CleverTap",
    sendTag: "{{ Campaign.campaignId }}",
    subTag: "$replacement$##y[none]$/replacement$",
    sub1Tag: "{{Profile.customer_id|default:'none'}}",
  },
  {
    name: "Mailchimp",
    sendTag: "*|CAMPAIGN_UID|*",
    subTag: "*|EMAIL|*",
    sub1Tag: "*|MERGE0|*",
  },
  {
    name: "Klaviyo",
    sendTag: "{{ campaign.id }}",
    subTag: "{{ email }}",
    sub1Tag: "{{ person.id }}",
  },
  {
    name: "Custom",
    sendTag: "{{send_id}}",
    subTag: "{{email}}",
    sub1Tag: "{{user_id}}",
  },
];

export default function EmailAds() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<EmailList | null>(null);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedList, setEmbedList] = useState<EmailList | null>(null);
  const [embedAds, setEmbedAds] = useState<EmailAd[]>([]);
  const [selectedEsp, setSelectedEsp] = useState(espTemplates[0]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [useCardStyle, setUseCardStyle] = useState(true);
  
  const [listFormData, setListFormData] = useState({
    name: "",
    slug: "",
    description: "",
    defaultWidth: 300,
    defaultHeight: 250,
    isActive: true,
  });

  const { data: lists, isLoading } = useQuery<EmailList[]>({
    queryKey: ['/api/email-lists'],
  });

  const createListMutation = useMutation({
    mutationFn: async (data: typeof listFormData) => {
      return apiRequest('POST', '/api/email-lists', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-lists'] });
      setIsListDialogOpen(false);
      resetListForm();
      toast({ title: "Email list created successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to create list", variant: "destructive" });
    },
  });

  const updateListMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof listFormData }) => {
      return apiRequest('PUT', `/api/email-lists/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-lists'] });
      setIsListDialogOpen(false);
      setEditingList(null);
      resetListForm();
      toast({ title: "Email list updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update list", variant: "destructive" });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/email-lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-lists'] });
      toast({ title: "Email list deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete list", variant: "destructive" });
    },
  });

  const resetListForm = () => {
    setListFormData({
      name: "",
      slug: "",
      description: "",
      defaultWidth: 300,
      defaultHeight: 250,
      isActive: true,
    });
  };

  const openEditListDialog = (list: EmailList) => {
    setEditingList(list);
    setListFormData({
      name: list.name,
      slug: list.slug,
      description: list.description || "",
      defaultWidth: list.defaultWidth || 300,
      defaultHeight: list.defaultHeight || 250,
      isActive: list.isActive,
    });
    setIsListDialogOpen(true);
  };

  const openCreateListDialog = () => {
    setEditingList(null);
    resetListForm();
    setIsListDialogOpen(true);
  };

  const handleListSubmit = () => {
    if (!listFormData.name || !listFormData.slug) {
      toast({ title: "Name and slug are required", variant: "destructive" });
      return;
    }
    
    if (editingList) {
      updateListMutation.mutate({ id: editingList.id, data: listFormData });
    } else {
      createListMutation.mutate(listFormData);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const openEmbedDialog = async (list: EmailList) => {
    setEmbedList(list);
    setEmbedDialogOpen(true);
    try {
      const res = await fetch(`/api/email-lists/${list.id}/embed-metadata`, { credentials: 'include' });
      const data = await res.json();
      setEmbedAds(data.ads || []);
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

  const getImageUrl = (list: EmailList) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/email/ad.png?property=${list.slug}&send=${selectedEsp.sendTag}&sub=${selectedEsp.subTag}&sub1=${selectedEsp.sub1Tag}&esp=${selectedEsp.name.toLowerCase()}&w=${list.defaultWidth}&h=${list.defaultHeight}`;
  };

  const getClickUrl = (list: EmailList, adId?: string) => {
    const baseUrl = window.location.origin;
    let url = `${baseUrl}/api/email/click?property=${list.slug}&send=${selectedEsp.sendTag}&sub=${selectedEsp.subTag}&sub1=${selectedEsp.sub1Tag}&esp=${selectedEsp.name.toLowerCase()}`;
    if (adId) url += `&ad=${adId}`;
    return url;
  };

  const getTextAdUrl = (list: EmailList) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/email/text-ad?property=${list.slug}&send=${selectedEsp.sendTag}&sub=${selectedEsp.subTag}&sub1=${selectedEsp.sub1Tag}&esp=${selectedEsp.name.toLowerCase()}&sid=${selectedEsp.sendTag}`;
  };

  const getSubjectUrl = (list: EmailList) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/email/subject?property=${list.slug}&sid=${selectedEsp.sendTag}`;
  };

  const hasTextAds = embedAds.some(a => a.isActive && a.adType === 'text');
  const hasImageAds = embedAds.some(a => a.isActive && (a.adType === 'image' || !a.adType));

  const getEmbedHtml = (list: EmailList) => {
    const imageUrl = getImageUrl(list);
    const clickUrl = getClickUrl(list);
    const activeAd = embedAds.find(a => a.isActive);
    const buttonText = activeAd?.buttonText || "CONTINUE";
    const buttonColor = activeAd?.buttonColor || "#4CAF50";
    const titleText = activeAd?.title || "";
    
    const titleRow = titleText ? `<tr><td align="center" style="padding:12px 10px;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#333;line-height:1.4">${titleText}</td></tr>` : '';
    
    const imgStyle = `display:block;border:0;width:100%;max-width:${list.defaultWidth}px;height:auto${useCardStyle ? ';border-radius:4px' : ''}`;
    const btnStyle = `display:inline-block;background-color:${buttonColor};color:#fff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:12px 40px;border-radius:4px;text-align:center;mso-hide:all`;
    
    const innerContent = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${list.defaultWidth}px"><tr><td align="center"><a href="${clickUrl}" target="_blank" style="text-decoration:none"><img src="${imageUrl}" width="${list.defaultWidth}" height="${list.defaultHeight}" alt="Offer" style="${imgStyle}"></a></td></tr>${titleRow}<tr><td align="center" style="padding:10px 0"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${clickUrl}" style="height:44px;v-text-anchor:middle;width:200px" arcsize="10%" stroke="f" fillcolor="${buttonColor}"><w:anchorlock/><center style="color:#fff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold">${buttonText}</center></v:roundrect><![endif]--><!--[if !mso]><!--><a href="${clickUrl}" target="_blank" style="${btnStyle}">${buttonText}</a><!--<![endif]--></td></tr></table>`;

    if (useCardStyle) {
      return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${list.defaultWidth + 32}px"><tr><td align="center" style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:16px">${innerContent}</td></tr></table>`;
    }
    
    return innerContent;
  };

  const getClickRate = (impressions: number, clicks: number) => {
    if (impressions === 0) return "0%";
    return ((clicks / impressions) * 100).toFixed(2) + "%";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email House Ads</h1>
          <p className="text-muted-foreground">Create rotating ad units for email newsletters</p>
        </div>
        <Button onClick={openCreateListDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Email List
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : lists && lists.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>List Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ads</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{list.slug}</code>
                    </TableCell>
                    <TableCell>{list.defaultWidth}x{list.defaultHeight}</TableCell>
                    <TableCell>{list.totalImpressions?.toLocaleString() || 0}</TableCell>
                    <TableCell>{list.totalClicks?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getClickRate(list.totalImpressions || 0, list.totalClicks || 0)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={list.isActive ? "default" : "secondary"}>
                        {list.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/admin/email-ads/${list.id}/ads`)}
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Manage Ads
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEmbedDialog(list)}
                          title="Get Embed Code"
                        >
                          <Code className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditListDialog(list)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this list? This will also delete all associated ads.")) {
                              deleteListMutation.mutate(list.id);
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
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No email lists yet</h3>
              <p className="text-muted-foreground mb-4">Create your first email ad list to get started</p>
              <Button onClick={openCreateListDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Email List
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit List Dialog */}
      <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingList ? "Edit Email List" : "Create Email List"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>List Name *</Label>
              <Input 
                placeholder="Market Munchies Newsletter"
                value={listFormData.name}
                onChange={(e) => {
                  setListFormData({ 
                    ...listFormData, 
                    name: e.target.value,
                    slug: editingList ? listFormData.slug : generateSlug(e.target.value)
                  });
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input 
                placeholder="mmm"
                value={listFormData.slug}
                onChange={(e) => setListFormData({ ...listFormData, slug: generateSlug(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Used in embed URLs (e.g., property=mmm)</p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="Newsletter ads for Market Munchies"
                value={listFormData.description}
                onChange={(e) => setListFormData({ ...listFormData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Width (px)</Label>
                <Input 
                  type="number"
                  value={listFormData.defaultWidth}
                  onChange={(e) => setListFormData({ ...listFormData, defaultWidth: parseInt(e.target.value) || 300 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Height (px)</Label>
                <Input 
                  type="number"
                  value={listFormData.defaultHeight}
                  onChange={(e) => setListFormData({ ...listFormData, defaultHeight: parseInt(e.target.value) || 250 })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={listFormData.isActive}
                onChange={(e) => setListFormData({ ...listFormData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsListDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleListSubmit}
                disabled={createListMutation.isPending || updateListMutation.isPending}
              >
                {editingList ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Embed Code - {embedList?.name}</DialogTitle>
          </DialogHeader>
          
          {embedList && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Email Service Provider (ESP)</Label>
                <div className="flex flex-wrap gap-2">
                  {espTemplates.map((esp) => (
                    <Button
                      key={esp.name}
                      variant={selectedEsp.name === esp.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedEsp(esp)}
                    >
                      {esp.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Active Ads in Rotation</Label>
                <div className="bg-muted/50 p-3 rounded-lg">
                  {embedAds.filter(a => a.isActive).length > 0 ? (
                    <ul className="text-sm space-y-1">
                      {embedAds.filter(a => a.isActive).map((ad, index) => (
                        <li key={ad.id} className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{ad.adType === 'text' ? 'Text' : 'Image'}</Badge>
                          {ad.title || ad.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active ads. Add ads to this list first.</p>
                  )}
                </div>
              </div>

              {hasImageAds && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Badge>Image Ads</Badge>
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Image URL</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(getImageUrl(embedList), 'imageUrl')}
                      >
                        {copiedField === 'imageUrl' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-xs break-all">{getImageUrl(embedList)}</code>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Click Tracking URL</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(getClickUrl(embedList), 'clickUrl')}
                      >
                        {copiedField === 'clickUrl' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-xs break-all">{getClickUrl(embedList)}</code>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Card Style</Label>
                      <p className="text-xs text-muted-foreground">Wrap ad in a card container with border</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={useCardStyle ? "default" : "outline"}
                        size="sm"
                        onClick={() => setUseCardStyle(true)}
                      >
                        Card
                      </Button>
                      <Button
                        variant={!useCardStyle ? "default" : "outline"}
                        size="sm"
                        onClick={() => setUseCardStyle(false)}
                      >
                        Plain
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Complete HTML Embed Code</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(getEmbedHtml(embedList), 'embedHtml')}
                      >
                        {copiedField === 'embedHtml' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <pre className="text-xs whitespace-pre-wrap overflow-x-auto">{getEmbedHtml(embedList)}</pre>
                    </div>
                  </div>

                  {/* Image Ad Preview */}
                  <div className="space-y-2">
                    <Label>Image Ad Preview</Label>
                    <div className="border rounded-lg p-4 bg-gray-100">
                      {(() => {
                        const activeImageAd = embedAds.find(a => a.isActive && (a.adType === 'image' || !a.adType));
                        return activeImageAd ? (
                          <div style={{ maxWidth: embedList.defaultWidth + (useCardStyle ? 32 : 0) }} className="mx-auto">
                            <div 
                              className="space-y-3"
                              style={useCardStyle ? { 
                                backgroundColor: '#f8f9fa', 
                                border: '1px solid #e9ecef', 
                                borderRadius: '8px', 
                                padding: '16px' 
                              } : {}}
                            >
                              <img 
                                src={activeImageAd.imageUrl || ""} 
                                alt="Preview" 
                                style={{ 
                                  width: '100%', 
                                  height: 'auto', 
                                  display: 'block',
                                  borderRadius: useCardStyle ? '4px' : '0'
                                }}
                              />
                              <p className="text-sm font-medium text-center">
                                {activeImageAd.title || "Ad Title"}
                              </p>
                              <div className="text-center">
                                <div 
                                  className="inline-block py-3 px-10 text-white font-bold rounded cursor-pointer"
                                  style={{ backgroundColor: activeImageAd.buttonColor || "#4CAF50" }}
                                >
                                  {activeImageAd.buttonText || "CONTINUE"}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No active image ads to preview</p>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}

              {hasTextAds && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Badge variant="secondary">Text Ads</Badge>
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Text Ad URL</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(getTextAdUrl(embedList), 'textAdUrl')}
                      >
                        {copiedField === 'textAdUrl' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-xs break-all">{getTextAdUrl(embedList)}</code>
                    </div>
                    <p className="text-xs text-muted-foreground">Paste this URL into your email template. It returns HTML content that renders as native text in the email.</p>
                  </div>

                  {/* Text Ad Preview */}
                  <div className="space-y-2">
                    <Label>Text Ad Preview</Label>
                    <div className="border rounded-lg p-4 bg-white">
                      {(() => {
                        const activeTextAd = embedAds.find(a => a.isActive && a.adType === 'text');
                        if (!activeTextAd) return <p className="text-sm text-muted-foreground text-center py-4">No active text ads to preview</p>;
                        return (
                          <div style={{ maxWidth: 600, fontFamily: 'Arial, Helvetica, sans-serif' }}>
                            <div 
                              style={{ 
                                fontSize: activeTextAd.fontSize || 14, 
                                lineHeight: 1.6, 
                                color: activeTextAd.textColor || '#333333',
                                whiteSpace: 'pre-wrap'
                              }}
                            >
                              {(activeTextAd.bodyHtml || '').split(/\[([^\]]+)\]\(([^)]+)\)/).map((part: string, i: number) => {
                                if (i % 3 === 1) return <a key={i} href="#" style={{ color: activeTextAd.linkColor || '#0066cc', textDecoration: 'underline', fontWeight: 600 }} onClick={(e) => e.preventDefault()}>{part}</a>;
                                if (i % 3 === 2) return null;
                                return <span key={i}>{part}</span>;
                              })}
                            </div>
                            {activeTextAd.ctaText && (
                              <div style={{ paddingTop: 12 }}>
                                <a href="#" style={{ color: activeTextAd.linkColor || '#0066cc', textDecoration: 'underline', fontWeight: 600, fontSize: activeTextAd.fontSize || 14 }} onClick={(e) => e.preventDefault()}>
                                  {activeTextAd.ctaText}
                                </a>
                              </div>
                            )}
                            {activeTextAd.buttonText && (
                              <div style={{ paddingTop: 16, textAlign: 'center' }}>
                                <span style={{ display: 'inline-block', backgroundColor: activeTextAd.buttonColor || '#4CAF50', color: '#fff', fontWeight: 'bold', padding: '12px 40px', borderRadius: 4, fontSize: 16 }}>
                                  {activeTextAd.buttonText}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}

              {hasTextAds && embedList && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">Dynamic Subject Line</Badge>
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Subject Line API URL</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(getSubjectUrl(embedList), 'subjectUrl')}
                      >
                        {copiedField === 'subjectUrl' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-xs break-all">{getSubjectUrl(embedList)}</code>
                    </div>
                    <p className="text-xs text-muted-foreground">Returns plain text subject line matching the ad shown in the email body. Both use the same send ID for deterministic matching.</p>
                  </div>

                  <div className="mt-3 bg-amber-50 dark:bg-amber-950 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-amber-900 dark:text-amber-100">CleverTap Setup</h4>
                    <div className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                      <p><strong>How it works:</strong> The send ID ({selectedEsp.sendTag}) is used as a shared key. When CleverTap sends an email, both the subject line API and the text ad URL receive the same send ID, so they always return content from the same ad.</p>
                      <p><strong>Step 1:</strong> In your CleverTap campaign, go to the subject line field.</p>
                      <p><strong>Step 2:</strong> Use a Liquid tag with Connected Content to fetch the subject dynamically:</p>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded border font-mono text-xs overflow-x-auto">
                        {`{{connected_content "${getSubjectUrl(embedList).replace(selectedEsp.sendTag, '{{send_id}}')}" :save subject}}{{subject}}`}
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400">If CleverTap doesn't support Connected Content in subject lines, use Liquid personalization with a webhook or user property that stores the subject line fetched at campaign trigger time.</p>
                      <p><strong>Step 3:</strong> Add the text ad URL in your email body - the matching ad content will display automatically.</p>
                      <p><strong>Fallback:</strong> Set a static subject line in CleverTap as a fallback in case the API is unreachable.</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">Note: Template variables like {selectedEsp.sendTag} will show as-is until processed by your ESP.</p>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How it works</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• <strong>Image ads:</strong> The image URL rotates through active ads on each email open</li>
                  <li>• <strong>Text ads:</strong> The URL returns live HTML content that renders as native email text</li>
                  <li>• <strong>Dynamic subjects:</strong> Subject line API returns matching subject using the same send ID</li>
                  <li>• Impressions are tracked automatically</li>
                  <li>• Clicks are tracked and redirected to the Tune offer</li>
                  <li>• ESP merge tags are passed through for attribution</li>
                  <li>• Change text/links in the dashboard anytime - next email open gets the update</li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
