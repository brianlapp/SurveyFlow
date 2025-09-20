class TuneApiService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.TUNE_API_KEY || '';
    this.baseUrl = 'https://api.tune.com/v1';
  }

  async getOfferDetails(offerId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/offers/${offerId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Tune API error: ${response.statusText}`);
      }

      const offerData = await response.json();
      
      return {
        name: offerData.name,
        description: offerData.description,
        imageUrl: offerData.image_url,
        category: offerData.category,
      };
    } catch (error) {
      console.error('Error fetching offer from Tune API:', error);
      throw error;
    }
  }

  async firePostback(userId: string, totalRevenue: number, additionalParams: Record<string, any> = {}) {
    try {
      const postbackUrl = process.env.TUNE_POSTBACK_URL || '';
      
      if (!postbackUrl) {
        throw new Error('Tune postback URL not configured');
      }

      const params = new URLSearchParams({
        user_id: userId,
        revenue: totalRevenue.toString(),
        ...additionalParams,
      });

      const response = await fetch(`${postbackUrl}?${params}`, {
        method: 'GET',
      });

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        response: await response.text(),
      };
    } catch (error) {
      console.error('Error firing Tune postback:', error);
      throw error;
    }
  }

  async getOffers(filters: {
    category?: string;
    minPayout?: number;
    maxPayout?: number;
    status?: string;
  } = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.category) params.append('category', filters.category);
      if (filters.minPayout) params.append('min_payout', filters.minPayout.toString());
      if (filters.maxPayout) params.append('max_payout', filters.maxPayout.toString());
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`${this.baseUrl}/offers?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Tune API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching offers from Tune API:', error);
      throw error;
    }
  }
}

export const tuneApi = new TuneApiService();
