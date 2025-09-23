import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  Star, 
  Zap, 
  Gift, 
  Clock,
  TrendingUp,
  Award,
  Target
} from "lucide-react";
import type { PublicOffer } from "@shared/types";

interface OfferCardDisplayProps {
  offer: PublicOffer;
  onOfferClick: (offer: PublicOffer) => void;
  style?: 'premium' | 'standard' | 'compact' | 'featured';
}

export function OfferCardDisplay({ offer, onOfferClick, style = 'standard' }: OfferCardDisplayProps) {
  // Use display fields from public API instead of sensitive payout data
  const originalPrice = parseFloat(offer.originalPrice?.replace('$', '') || '99.99');
  const discountPrice = parseFloat(offer.discountPrice?.replace('$', '') || '19.99');
  const savingsAmount = originalPrice - discountPrice;
  const rating = offer.rating || 4.5;
  
  // Determine card style based on offer properties if not explicitly set
  const getCardStyle = () => {
    if (style !== 'standard') return style;
    
    // Auto-determine style based on offer characteristics
    if (savingsAmount >= 50) return 'premium';
    if (offer.offerType === 'giveaway') return 'featured';
    if (offer.position === 1) return 'featured';
    if (rating >= 4.5) return 'featured';
    if (savingsAmount >= 20) return 'standard';
    return 'compact';
  };

  const cardStyle = getCardStyle();

  // Get appropriate icon for offer type/category
  const getOfferIcon = () => {
    switch (offer.category) {
      case 'finance': return <TrendingUp className="h-4 w-4" />;
      case 'shopping': return <Gift className="h-4 w-4" />;
      case 'entertainment': return <Star className="h-4 w-4" />;
      case 'survey': return <Target className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  // Premium card style for high-value offers
  if (cardStyle === 'premium') {
    return (
      <div 
        className="relative bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6 shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
        data-testid={`offer-premium-${offer.id}`}
      >
        {/* Premium badge */}
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-yellow-500 text-white px-3 py-1 text-xs font-bold">
            <Award className="h-3 w-3 mr-1" />
            PREMIUM
          </Badge>
        </div>
        
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {getOfferIcon()}
            <h3 className="font-bold text-lg text-gray-800">{offer.name}</h3>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 line-through">{offer.originalPrice}</div>
            <span className="bg-green-600 text-white px-4 py-2 rounded-full text-lg font-bold">
              {offer.discountPrice}
            </span>
            <p className="text-xs text-gray-600 mt-1">Save ${savingsAmount.toFixed(0)}</p>
          </div>
        </div>
        
        <p className="text-gray-700 mb-4 leading-relaxed">
          {offer.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-600">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Limited Time</span>
          </div>
          <Button 
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-lg font-bold hover:from-orange-600 hover:to-red-600 transition-all"
            onClick={() => onOfferClick(offer)}
            data-testid={`button-offer-premium-${offer.id}`}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Claim Offer
          </Button>
        </div>
      </div>
    );
  }

  // Featured card style for highlighted offers
  if (cardStyle === 'featured') {
    return (
      <div 
        className="relative bg-gradient-to-r from-teal-50 to-blue-50 border-2 border-teal-300 rounded-lg p-5 shadow-md"
        data-testid={`offer-featured-${offer.id}`}
      >
        {/* Featured badge */}
        <div className="absolute -top-2 -left-2">
          <Badge className="bg-teal-primary text-white px-3 py-1 text-xs font-bold">
            <Star className="h-3 w-3 mr-1" />
            FEATURED
          </Badge>
        </div>
        
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getOfferIcon()}
            <h3 className="font-semibold text-lg text-gray-800">{offer.name}</h3>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 line-through">{offer.originalPrice}</div>
            <span className="bg-teal-primary text-white px-3 py-1 rounded-full text-sm font-bold">
              {offer.discountPrice}
            </span>
          </div>
        </div>
        
        <p className="text-gray-700 mb-4 text-sm">
          {offer.description}
        </p>
        
        <Button 
          className="w-full bg-teal-primary text-white py-2 rounded-lg font-semibold hover:bg-teal-600 transition-colors"
          onClick={() => onOfferClick(offer)}
          data-testid={`button-offer-featured-${offer.id}`}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Get Started
        </Button>
      </div>
    );
  }

  // Compact card style for smaller offers
  if (cardStyle === 'compact') {
    return (
      <div 
        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
        data-testid={`offer-compact-${offer.id}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getOfferIcon()}
            <h4 className="font-medium text-sm text-gray-800">{offer.name}</h4>
          </div>
          <div className="text-right text-xs">
            <div className="text-gray-500 line-through">{offer.originalPrice}</div>
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-medium">
              {offer.discountPrice}
            </span>
          </div>
        </div>
        
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {offer.description}
        </p>
        
        <Button 
          size="sm" 
          variant="outline"
          className="w-full border-teal-primary text-teal-primary hover:bg-teal-primary hover:text-white"
          onClick={() => onOfferClick(offer)}
          data-testid={`button-offer-compact-${offer.id}`}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View
        </Button>
      </div>
    );
  }

  // Standard card style (default)
  return (
    <div 
      className="bg-white border border-teal-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
      data-testid={`offer-standard-${offer.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getOfferIcon()}
          <h4 className="font-medium text-base text-gray-800">{offer.name}</h4>
        </div>
        <div className="text-right text-sm">
          <div className="text-gray-500 line-through text-xs">{offer.originalPrice}</div>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
            {offer.discountPrice}
          </span>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        {offer.description}
      </p>
      
      <Button 
        size="sm" 
        className="w-full bg-teal-primary text-white hover:bg-teal-600"
        onClick={() => onOfferClick(offer)}
        data-testid={`button-offer-standard-${offer.id}`}
      >
        <ExternalLink className="h-3 w-3 mr-1" />
        View Offer
      </Button>
    </div>
  );
}