import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Edit, BarChart3, Pause, Play, Trash2 } from "lucide-react";
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

  return (
    <Card className="offer-card" data-testid={`offer-card-${offer.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1" data-testid="offer-name">
              {offer.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-2" data-testid="offer-category">
              {offer.category}
            </p>
            <div className="flex items-center space-x-2">
              {getStatusBadge()}
              {offer.tuneOfferId && (
                <span className="text-xs text-muted-foreground" data-testid="offer-tune-id">
                  Tune ID: {offer.tuneOfferId}
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
        
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Conversion Rate:</span>
            <span className="font-medium" data-testid="offer-conversion-rate">
              {offer.conversionRate || '0.00'}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Revenue:</span>
            <span className="font-medium text-green-600" data-testid="offer-total-revenue">
              ${offer.totalRevenue || '0.00'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Display Pages:</span>
            <span className="font-medium" data-testid="offer-display-pages">
              {offer.displayPages?.join(', ') || 'None'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Conversions:</span>
            <span className="font-medium" data-testid="offer-conversions">
              {offer.totalConversions || 0}
            </span>
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
