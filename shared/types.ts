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
  questionIds?: string[]; // Specific questions after which offer should appear
  scriptContent?: string | null; // For popup_script offers
  linkText?: string | null; // For next_link offers  
  impressionPixel?: string | null; // For tune_standard tracking
}