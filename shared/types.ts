// Public offer interface from /api/offers/public endpoint
export interface PublicOffer {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  rating: number;
  originalPrice: string;
  discountPrice: string;
  clickUrl?: string;
  position?: number;
  offerType?: string;
  displayPages?: number[];
}