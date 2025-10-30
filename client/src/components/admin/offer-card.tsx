import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Edit, BarChart3, Pause, Play, Trash2, Eye, ExternalLink, Code } from "lucide-react";
import type { Offer } from "@shared/schema";

interface OfferCardProps {
  offer: Offer;
  onEdit?: (offer: Offer) => void;
}

export function OfferCard({ offer, onEdit }: OfferCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleOfferMutation = useMutation({
    mutationFn: async ({ id, isPaused }: { id: string; isPaused: boolean }) => {
      await apiRequest('PUT', `/api/offers/${id}`, { isPaused });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      toast({
        title: "Success",
        description: `Offer ${offer.isPaused ? 'resumed' : 'paused'} successfully`,
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

  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/offers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      toast({
        title: "Success",
        description: "Offer deleted successfully",
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

  const handleToggle = () => {
    toggleOfferMutation.mutate({ 
      id: offer.id, 
      isPaused: !offer.isPaused 
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this offer?')) {
      deleteOfferMutation.mutate(offer.id);
    }
  };

  const getStatusBadge = () => {
    if (!offer.isActive) {
      return <Badge variant="destructive" className="status-inactive">Inactive</Badge>;
    }
    if (offer.isPaused) {
      return <Badge variant="secondary" className="status-paused">Paused</Badge>;
    }
    return <Badge variant="default" className="status-active">Active</Badge>;
  };

  const getOfferTypeInfo = () => {
    switch (offer.offerType) {
      case 'tune_standard':
        return { icon: ExternalLink, label: 'Tune Standard', color: 'text-blue-600' };
      case 'popup_script':
        return { icon: Code, label: 'Popup Script', color: 'text-purple-600' };
      case 'next_link':
        return { icon: Eye, label: 'Next Link', color: 'text-green-600' };
      default:
        return { icon: Eye, label: 'Unknown', color: 'text-gray-600' };
    }
  };

  const renderOfferPreview = () => {
    const { icon: Icon, color } = getOfferTypeInfo();

    if (offer.offerType === 'tune_standard') {
      return (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-xs font-medium text-muted-foreground">Preview</span>
          </div>
          <div className="relative aspect-video bg-white dark:bg-gray-800 rounded overflow-hidden border">
            {offer.imageUrl ? (
              <img 
                src={offer.imageUrl} 
                alt={offer.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect fill="%23f0f0f0" width="200" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">No Image</text></svg>';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                No image URL set
              </div>
            )}
          </div>
        </div>
      );
    }

    if (offer.offerType === 'popup_script') {
      return (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-xs font-medium text-muted-foreground">Preview</span>
          </div>
          <div className="relative aspect-video bg-white dark:bg-gray-800 rounded border flex items-center justify-center p-3">
            <div className="text-xs font-mono text-muted-foreground text-center line-clamp-3">
              {offer.scriptContent ? (
                offer.scriptContent.substring(0, 120)
              ) : (
                'No script content'
              )}
            </div>
          </div>
        </div>
      );
    }

    if (offer.offerType === 'next_link') {
      return (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-xs font-medium text-muted-foreground">Preview</span>
          </div>
          <div className="relative aspect-video bg-white dark:bg-gray-800 rounded border flex items-center justify-center">
            <div className="bg-teal-600 text-white px-6 py-2 rounded-md font-medium text-sm">
              {offer.linkText || 'Next'}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="offer-card" data-testid={`offer-card-${offer.id}`}>
      <CardContent className="p-6">
        {renderOfferPreview()}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1" data-testid="offer-name">
              {offer.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-2" data-testid="offer-category">
              {offer.category}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              <Badge variant="outline" className={getOfferTypeInfo().color}>
                {getOfferTypeInfo().label}
              </Badge>
              {offer.tuneOfferId && (
                <span className="text-xs text-muted-foreground" data-testid="offer-tune-id">
                  #{offer.tuneOfferId}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600" data-testid="offer-payout">
              ${offer.payout}
            </p>
            <p className="text-xs text-muted-foreground">per conversion</p>
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
              <div className="text-xs text-muted-foreground mb-1">Conversion Rate</div>
              <div className="font-semibold" data-testid="offer-conversion-rate">
                {offer.conversionRate || '0.00'}%
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
              <div className="text-xs text-muted-foreground mb-1">Total Revenue</div>
              <div className="font-semibold text-green-600" data-testid="offer-total-revenue">
                ${offer.totalRevenue || '0.00'}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
              <div className="text-xs text-muted-foreground mb-1">Conversions</div>
              <div className="font-semibold" data-testid="offer-conversions">
                {offer.totalConversions || 0}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
              <div className="text-xs text-muted-foreground mb-1">Position</div>
              <div className="font-semibold" data-testid="offer-position">
                #{offer.position || 1}
              </div>
            </div>
          </div>
          
          <div className="border-t pt-2 mt-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">Targeting</div>
            <div className="space-y-1">
              {offer.displayPages && offer.displayPages.length > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">Pages</Badge>
                  <span data-testid="offer-display-pages">
                    {offer.displayPages.map((p: number) => {
                      if (p === 5) return 'Registration';
                      if (p === 15) return 'Main Offers';
                      if (p === 20) return 'Exit Lottery';
                      return `Page ${p}`;
                    }).join(', ')}
                  </span>
                </div>
              )}
              {offer.questionIds && offer.questionIds.length > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">Questions</Badge>
                  <span data-testid="offer-question-ids">
                    {offer.questionIds.length} question{offer.questionIds.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {(!offer.displayPages || offer.displayPages.length === 0) && 
               (!offer.questionIds || offer.questionIds.length === 0) && (
                <span className="text-xs text-muted-foreground">No targeting set</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onEdit?.(offer)}
            data-testid="button-edit-offer"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            className="flex-1"
            data-testid="button-view-stats"
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Stats
          </Button>
          <Button
            size="sm"
            variant={offer.isPaused ? "default" : "secondary"}
            onClick={handleToggle}
            disabled={toggleOfferMutation.isPending}
            data-testid="button-toggle-offer"
          >
            {offer.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteOfferMutation.isPending}
            data-testid="button-delete-offer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
