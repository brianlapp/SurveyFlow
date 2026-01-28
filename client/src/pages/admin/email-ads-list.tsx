import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowLeft,
  GripVertical,
  Image as ImageIcon,
  ExternalLink
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface EmailList {
  id: string;
  name: string;
  slug: string;
}

interface EmailAd {
  id: string;
  listId: string;
  name: string;
  title: string;
  imageUrl: string;
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

function SortableAdRow({ ad, onEdit, onDelete, onToggleActive }: {
  ad: EmailAd;
  onEdit: (ad: EmailAd) => void;
  onDelete: (id: string) => void;
  onToggleActive: (ad: EmailAd) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ad.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getClickRate = (impressions: number, clicks: number) => {
    if (impressions === 0) return "0%";
    return ((clicks / impressions) * 100).toFixed(2) + "%";
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell>
        {ad.imageUrl ? (
          <img 
            src={ad.imageUrl} 
            alt={ad.title} 
            className="h-12 w-20 object-cover rounded"
          />
        ) : (
          <div className="h-12 w-20 bg-muted rounded flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </TableCell>
      <TableCell className="font-medium">{ad.name}</TableCell>
      <TableCell className="max-w-48 truncate">{ad.title}</TableCell>
      <TableCell>
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{ad.tuneOfferId}</code>
      </TableCell>
      <TableCell>{ad.impressions?.toLocaleString() || 0}</TableCell>
      <TableCell>{ad.clicks?.toLocaleString() || 0}</TableCell>
      <TableCell>
        <Badge variant="outline">
          {getClickRate(ad.impressions || 0, ad.clicks || 0)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge 
          variant={ad.isActive ? "default" : "secondary"}
          className="cursor-pointer"
          onClick={() => onToggleActive(ad)}
        >
          {ad.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onEdit(ad)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to delete this ad?")) {
                onDelete(ad.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function EmailAdsList() {
  const { listId } = useParams<{ listId: string }>();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isAdDialogOpen, setIsAdDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<EmailAd | null>(null);
  
  const [adFormData, setAdFormData] = useState({
    name: "",
    title: "",
    imageUrl: "",
    mobileImageUrl: "",
    tuneOfferId: "",
    affiliateId: "",
    trackingDomain: "track.modemobile.com",
    buttonText: "CONTINUE",
    buttonColor: "#4CAF50",
    isActive: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: list } = useQuery<EmailList>({
    queryKey: ['/api/email-lists', listId],
    enabled: !!listId,
  });

  const { data: ads, isLoading } = useQuery<EmailAd[]>({
    queryKey: ['/api/email-lists', listId, 'ads'],
    enabled: !!listId,
  });

  const createAdMutation = useMutation({
    mutationFn: async (data: typeof adFormData) => {
      return apiRequest('POST', `/api/email-lists/${listId}/ads`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-lists', listId, 'ads'] });
      setIsAdDialogOpen(false);
      resetAdForm();
      toast({ title: "Ad created successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to create ad", variant: "destructive" });
    },
  });

  const updateAdMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof adFormData> }) => {
      return apiRequest('PUT', `/api/email-lists/${listId}/ads/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-lists', listId, 'ads'] });
      setIsAdDialogOpen(false);
      setEditingAd(null);
      resetAdForm();
      toast({ title: "Ad updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update ad", variant: "destructive" });
    },
  });

  const deleteAdMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/email-lists/${listId}/ads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-lists', listId, 'ads'] });
      toast({ title: "Ad deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete ad", variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (adOrders: { id: string; displayOrder: number }[]) => {
      return apiRequest('POST', `/api/email-lists/${listId}/reorder`, { adOrders });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-lists', listId, 'ads'] });
    },
  });

  const resetAdForm = () => {
    setAdFormData({
      name: "",
      title: "",
      imageUrl: "",
      mobileImageUrl: "",
      tuneOfferId: "",
      affiliateId: "",
      trackingDomain: "track.modemobile.com",
      buttonText: "CONTINUE",
      buttonColor: "#4CAF50",
      isActive: true,
    });
  };

  const openEditAdDialog = (ad: EmailAd) => {
    setEditingAd(ad);
    setAdFormData({
      name: ad.name,
      title: ad.title,
      imageUrl: ad.imageUrl,
      mobileImageUrl: ad.mobileImageUrl || "",
      tuneOfferId: ad.tuneOfferId,
      affiliateId: ad.affiliateId,
      trackingDomain: ad.trackingDomain || "track.modemobile.com",
      buttonText: ad.buttonText || "CONTINUE",
      buttonColor: ad.buttonColor || "#4CAF50",
      isActive: ad.isActive,
    });
    setIsAdDialogOpen(true);
  };

  const openCreateAdDialog = () => {
    setEditingAd(null);
    resetAdForm();
    setIsAdDialogOpen(true);
  };

  const handleAdSubmit = () => {
    if (!adFormData.name || !adFormData.title || !adFormData.imageUrl || !adFormData.tuneOfferId || !adFormData.affiliateId) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    
    if (editingAd) {
      updateAdMutation.mutate({ id: editingAd.id, data: adFormData });
    } else {
      createAdMutation.mutate(adFormData);
    }
  };

  const handleToggleActive = (ad: EmailAd) => {
    updateAdMutation.mutate({ id: ad.id, data: { isActive: !ad.isActive } });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && ads) {
      const oldIndex = ads.findIndex((ad) => ad.id === active.id);
      const newIndex = ads.findIndex((ad) => ad.id === over.id);
      
      const newAds = arrayMove(ads, oldIndex, newIndex);
      const adOrders = newAds.map((ad, index) => ({
        id: ad.id,
        displayOrder: index,
      }));
      
      reorderMutation.mutate(adOrders);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/email-ads')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{list?.name || 'Email Ads'}</h1>
          <p className="text-muted-foreground">Manage ads for this email list</p>
        </div>
        <Button onClick={openCreateAdDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Ad
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : ads && ads.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Offer ID</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>CTR</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={ads.map(ad => ad.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {ads.map((ad) => (
                      <SortableAdRow
                        key={ad.id}
                        ad={ad}
                        onEdit={openEditAdDialog}
                        onDelete={(id) => deleteAdMutation.mutate(id)}
                        onToggleActive={handleToggleActive}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No ads yet</h3>
              <p className="text-muted-foreground mb-4">Add your first ad to this email list</p>
              <Button onClick={openCreateAdDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Ad
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Ad Dialog */}
      <Dialog open={isAdDialogOpen} onOpenChange={setIsAdDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAd ? "Edit Ad" : "Add Ad"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ad Name *</Label>
                <Input 
                  placeholder="Summer Sale Banner"
                  value={adFormData.name}
                  onChange={(e) => setAdFormData({ ...adFormData, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input 
                  placeholder="EXCLUSIVE: Get 50% off today!"
                  value={adFormData.title}
                  onChange={(e) => setAdFormData({ ...adFormData, title: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Displayed on the ad image</p>
              </div>

              <div className="space-y-2">
                <Label>Desktop Image URL *</Label>
                <Input 
                  placeholder="https://example.com/ad-image.png"
                  value={adFormData.imageUrl}
                  onChange={(e) => setAdFormData({ ...adFormData, imageUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Recommended: 600x150, 728x90, or 300x250</p>
              </div>

              <div className="space-y-2">
                <Label>Mobile Image URL (Optional)</Label>
                <Input 
                  placeholder="https://example.com/ad-mobile.png"
                  value={adFormData.mobileImageUrl}
                  onChange={(e) => setAdFormData({ ...adFormData, mobileImageUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Shown on screens ≤400px. Recommended: 320x150, 300x250</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tune Offer ID *</Label>
                  <Input 
                    placeholder="12345"
                    value={adFormData.tuneOfferId}
                    onChange={(e) => setAdFormData({ ...adFormData, tuneOfferId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Affiliate ID *</Label>
                  <Input 
                    placeholder="1234"
                    value={adFormData.affiliateId}
                    onChange={(e) => setAdFormData({ ...adFormData, affiliateId: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tracking Domain</Label>
                <Input 
                  placeholder="track.modemobile.com"
                  value={adFormData.trackingDomain}
                  onChange={(e) => setAdFormData({ ...adFormData, trackingDomain: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <Input 
                    placeholder="CONTINUE"
                    value={adFormData.buttonText}
                    onChange={(e) => setAdFormData({ ...adFormData, buttonText: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Button Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={adFormData.buttonColor}
                      onChange={(e) => setAdFormData({ ...adFormData, buttonColor: e.target.value })}
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input 
                      placeholder="#4CAF50"
                      value={adFormData.buttonColor}
                      onChange={(e) => setAdFormData({ ...adFormData, buttonColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="adIsActive"
                  checked={adFormData.isActive}
                  onChange={(e) => setAdFormData({ ...adFormData, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="adIsActive">Active</Label>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Email Ad Preview</Label>
              <div className="border rounded-lg p-4 bg-gray-100">
                {adFormData.imageUrl ? (
                  <div className="space-y-3">
                    <img 
                      src={adFormData.imageUrl} 
                      alt="Preview" 
                      className="w-full rounded-lg object-cover"
                      style={{ maxHeight: 200 }}
                    />
                    <p className="text-sm font-medium text-center">{adFormData.title || "Ad Title"}</p>
                    <div 
                      className="w-full py-3 text-center text-white font-bold rounded cursor-pointer"
                      style={{ backgroundColor: adFormData.buttonColor || "#4CAF50" }}
                    >
                      {adFormData.buttonText || "CONTINUE"}
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">Enter an image URL to preview</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg">
                <h4 className="font-medium text-amber-900 dark:text-amber-100 text-sm mb-1">Tip</h4>
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  For best results, use images that are 300x250px or similar aspect ratio. 
                  The image will be displayed in email clients with the dimensions set in the list settings.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsAdDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAdSubmit}
              disabled={createAdMutation.isPending || updateAdMutation.isPending}
            >
              {editingAd ? "Update" : "Add Ad"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
