import { storage } from '../storage';
import { tuneApi } from './tuneApi';

class RevenueTrackerService {
  private defaultThreshold: number = 3.00;

  async checkAndFirePostback(endUserId: string, totalRevenue: number): Promise<void> {
    try {
      const endUser = await storage.getEndUser(endUserId);
      if (!endUser) {
        throw new Error('User not found');
      }

      // Check if postback already fired
      if (endUser.postbackFired) {
        return;
      }

      // Get threshold for this user's source
      const threshold = await this.getThresholdForSource(endUser.source || 'default');
      
      if (totalRevenue >= threshold) {
        await this.firePostback(endUserId, totalRevenue);
      }
    } catch (error) {
      console.error('Error checking postback threshold:', error);
    }
  }

  async firePostback(endUserId: string, totalRevenue: number, manual: boolean = false): Promise<any> {
    try {
      const endUser = await storage.getEndUser(endUserId);
      if (!endUser) {
        throw new Error('User not found');
      }

      const threshold = await this.getThresholdForSource(endUser.source || 'default');
      
      // Create postback record
      const postback = await storage.createPostback(endUserId, totalRevenue, threshold);
      
      try {
        // Fire postback to affiliate network
        const result = await tuneApi.firePostback(endUserId, totalRevenue, {
          source: endUser.source,
          sub_source: endUser.subSource,
          session_id: endUser.sessionId,
          manual: manual.toString(),
        });

        // Update postback record with result
        await storage.updatePostback(postback.id, {
          status: result.success ? 'sent' : 'failed',
          affiliateResponse: JSON.stringify(result),
          firedAt: new Date(),
        });

        // Mark user as postback fired if successful
        if (result.success) {
          await storage.updateEndUser(endUserId, {
            postbackFired: true,
          });
        }

        return result;
      } catch (postbackError) {
        // Update postback record with error
        await storage.updatePostback(postback.id, {
          status: 'failed',
          affiliateResponse: JSON.stringify({ error: postbackError.message }),
        });
        
        throw postbackError;
      }
    } catch (error) {
      console.error('Error firing postback:', error);
      throw error;
    }
  }

  private async getThresholdForSource(source: string): Promise<number> {
    try {
      const setting = await storage.getSetting(`threshold_${source}`);
      if (setting) {
        return parseFloat(setting.value);
      }
      
      // Fall back to default threshold
      const defaultSetting = await storage.getSetting('default_threshold');
      if (defaultSetting) {
        return parseFloat(defaultSetting.value);
      }
      
      return this.defaultThreshold;
    } catch (error) {
      console.error('Error getting threshold for source:', error);
      return this.defaultThreshold;
    }
  }

  async setThresholdForSource(source: string, threshold: number): Promise<void> {
    try {
      await storage.setSetting(`threshold_${source}`, threshold.toString());
    } catch (error) {
      console.error('Error setting threshold for source:', error);
      throw error;
    }
  }

  async getRevenueStats(startDate: Date, endDate: Date): Promise<any> {
    try {
      const dailyStats = await storage.getDailyStats(startDate, endDate);
      
      const totalRevenue = dailyStats.reduce((sum, stat) => 
        sum + parseFloat(stat.totalRevenue?.toString() || '0'), 0);
      
      const totalUsers = dailyStats.reduce((sum, stat) => 
        sum + (stat.totalUsers || 0), 0);
      
      const totalPostbacks = dailyStats.reduce((sum, stat) => 
        sum + (stat.postbacksFired || 0), 0);
      
      return {
        totalRevenue,
        totalUsers,
        totalPostbacks,
        avgRevenuePerUser: totalUsers > 0 ? totalRevenue / totalUsers : 0,
        postbackRate: totalUsers > 0 ? (totalPostbacks / totalUsers) * 100 : 0,
        dailyBreakdown: dailyStats,
      };
    } catch (error) {
      console.error('Error getting revenue stats:', error);
      throw error;
    }
  }
}

export const revenueTracker = new RevenueTrackerService();
