import {
  users,
  endUsers,
  questions,
  offers,
  responses,
  offerInteractions,
  postbacks,
  dailyStats,
  settings,
  giveaways,
  tyBrands,
  tyPages,
  tySurveys,
  tySurveyQuestions,
  tySurveyQuestionOffers,
  tySurveyResponses,
  emailLists,
  emailAds,
  emailAdImpressions,
  emailAdClicks,
  type User,
  type UpsertUser,
  type EndUser,
  type InsertEndUser,
  type Question,
  type InsertQuestion,
  type Offer,
  type InsertOffer,
  type Response,
  type InsertResponse,
  type OfferInteraction,
  type InsertOfferInteraction,
  type Giveaway,
  type InsertGiveaway,
  type Postback,
  type DailyStat,
  type Setting,
  type TyBrand,
  type InsertTyBrand,
  type TyPage,
  type InsertTyPage,
  type TySurvey,
  type InsertTySurvey,
  type TySurveyQuestion,
  type InsertTySurveyQuestion,
  type TySurveyQuestionOffer,
  type InsertTySurveyQuestionOffer,
  type TySurveyResponse,
  type InsertTySurveyResponse,
  type EmailList,
  type InsertEmailList,
  type EmailAd,
  type InsertEmailAd,
  type EmailAdImpression,
  type EmailAdClick,
} from "@shared/schema";
import {
  mmmPerformanceDaily,
  mmmAdSpend,
  mmmDailySpend,
  mmmSourceDaily,
  mmmRunLog,
} from "@shared/schema";
import type { MmmRunLog, MmmPerformanceDaily } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte, sum, count, avg } from "drizzle-orm";

// Shapes returned by the MMM (ad revenue intelligence) read methods.
export type MmmCreativeRow = {
  compoundKey: string;
  platform: string;
  adName: string | null;
  campaignName: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  imsRevenue: number;
  aoRevenue: number;
  totalRevenue: number;
  adjustedRevenue: number;
  day0Roas: number | null;
  adjustedRoas: number | null;
  activeDays: number;
};

export type MmmDailyTotal = {
  date: string;
  creativeSpend: number;
  googleSpend: number;
  taboolaSpend: number;
  totalSpend: number;
  creativeRevenue: number;
  sourceRevenue: number;
  combinedRevenue: number;
  adjustedRevenue: number;
  roas: number | null;
  adjustedRoas: number | null;
};

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // End user operations
  createEndUser(user: InsertEndUser): Promise<EndUser>;
  getEndUser(id: string): Promise<EndUser | undefined>;
  getEndUserBySessionId(sessionId: string): Promise<EndUser | undefined>;
  updateEndUser(id: string, data: Partial<EndUser>): Promise<EndUser>;
  getEndUsers(limit?: number, offset?: number): Promise<EndUser[]>;
  
  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestions(activeOnly?: boolean): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  updateQuestion(id: string, data: Partial<Question>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;
  reorderQuestions(questionOrders: { id: string; orderIndex: number }[]): Promise<void>;
  
  // Offer operations
  createOffer(offer: InsertOffer): Promise<Offer>;
  getOffers(activeOnly?: boolean): Promise<Offer[]>;
  getOffer(id: string): Promise<Offer | undefined>;
  updateOffer(id: string, data: Partial<Offer>): Promise<Offer>;
  deleteOffer(id: string): Promise<void>;
  getOffersByPage(pageNumber: number): Promise<Offer[]>;
  
  // Response operations
  createResponse(response: InsertResponse): Promise<Response>;
  upsertResponse(response: InsertResponse): Promise<Response>;
  getResponsesByUser(endUserId: string): Promise<Response[]>;
  getResponsesWithQuestions(endUserId: string): Promise<any[]>;
  getUserResponseCount(endUserId: string): Promise<number>;
  
  // Offer interaction operations
  createOfferInteraction(interaction: InsertOfferInteraction): Promise<OfferInteraction>;
  getOfferInteractionsByUser(endUserId: string): Promise<OfferInteraction[]>;
  getOfferInteractionsByOffer(offerId: string): Promise<OfferInteraction[]>;
  
  // Revenue and postback operations
  createPostback(endUserId: string, totalRevenue: number, threshold: number): Promise<Postback>;
  getPostbacksByUser(endUserId: string): Promise<Postback[]>;
  updatePostback(id: string, data: Partial<Postback>): Promise<Postback>;
  
  // Analytics operations
  getDailyStats(startDate: Date, endDate: Date): Promise<DailyStat[]>;
  createOrUpdateDailyStats(date: Date, stats: Partial<DailyStat>): Promise<DailyStat>;
  
  // Giveaway operations
  createGiveaway(giveaway: InsertGiveaway): Promise<Giveaway>;
  getActiveGiveaway(): Promise<Giveaway | undefined>;
  getGiveaways(): Promise<Giveaway[]>;
  updateGiveaway(id: string, data: Partial<Giveaway>): Promise<Giveaway>;
  deleteGiveaway(id: string): Promise<void>;
  getDashboardMetrics(): Promise<{
    todayRevenue: number;
    activeUsers: number;
    conversionRate: number;
    avgRevenue: number;
  }>;
  getTopOffers(limit?: number): Promise<Offer[]>;
  getRecentCompletions(limit?: number): Promise<EndUser[]>;
  
  // Settings operations
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;
  getSettings(): Promise<Setting[]>;
  
  // TY Brand operations
  createTyBrand(brand: InsertTyBrand): Promise<TyBrand>;
  getTyBrands(): Promise<TyBrand[]>;
  getTyBrand(id: string): Promise<TyBrand | undefined>;
  getTyBrandBySlug(slug: string): Promise<TyBrand | undefined>;
  updateTyBrand(id: string, data: Partial<TyBrand>): Promise<TyBrand>;
  deleteTyBrand(id: string): Promise<void>;
  
  // TY Page operations
  createTyPage(page: InsertTyPage): Promise<TyPage>;
  getTyPagesByBrand(brandId: string): Promise<TyPage[]>;
  getTyPagesByBrandOrdered(brandId: string): Promise<TyPage[]>;
  getActiveTyPagesByBrandOrdered(brandId: string): Promise<TyPage[]>;
  getTyPage(id: string): Promise<TyPage | undefined>;
  getTyPageBySlug(brandId: string, slug: string): Promise<TyPage | undefined>;
  updateTyPage(id: string, data: Partial<TyPage>): Promise<TyPage>;
  deleteTyPage(id: string): Promise<void>;
  incrementTyPageImpressions(id: string): Promise<void>;
  incrementTyPageClicks(id: string): Promise<void>;
  reorderTyPages(pageOrders: { id: string; displayOrder: number }[]): Promise<void>;
  getNextEmbedPage(brandId: string): Promise<TyPage | undefined>;
  
  // TY Survey operations
  createTySurvey(survey: InsertTySurvey): Promise<TySurvey>;
  getTySurveys(): Promise<TySurvey[]>;
  getTySurvey(id: string): Promise<TySurvey | undefined>;
  getTySurveyBySlug(slug: string): Promise<TySurvey | undefined>;
  updateTySurvey(id: string, data: Partial<TySurvey>): Promise<TySurvey>;
  deleteTySurvey(id: string): Promise<void>;
  incrementTySurveyResponses(id: string): Promise<void>;
  
  // TY Survey Question operations
  createTySurveyQuestion(question: InsertTySurveyQuestion): Promise<TySurveyQuestion>;
  getTySurveyQuestions(surveyId: string): Promise<TySurveyQuestion[]>;
  getTySurveyQuestionsOrdered(surveyId: string): Promise<TySurveyQuestion[]>;
  getActiveTySurveyQuestionsOrdered(surveyId: string): Promise<TySurveyQuestion[]>;
  getTySurveyQuestion(id: string): Promise<TySurveyQuestion | undefined>;
  updateTySurveyQuestion(id: string, data: Partial<TySurveyQuestion>): Promise<TySurveyQuestion>;
  deleteTySurveyQuestion(id: string): Promise<void>;
  reorderTySurveyQuestions(questionOrders: { id: string; displayOrder: number }[]): Promise<void>;
  
  // TY Survey Question Offer operations
  setTySurveyQuestionOffers(questionId: string, offers: { offerId: string; displayOrder: number; displayMode: string }[]): Promise<TySurveyQuestionOffer[]>;
  getTySurveyQuestionOffers(questionId: string): Promise<(TySurveyQuestionOffer & { offer: Offer })[]>;
  
  // TY Survey Response operations
  createTySurveyResponse(response: InsertTySurveyResponse): Promise<TySurveyResponse>;
  getTySurveyResponsesBySession(surveyId: string, sessionId: string): Promise<TySurveyResponse[]>;
  
  // Email List operations
  createEmailList(list: InsertEmailList): Promise<EmailList>;
  getEmailLists(): Promise<EmailList[]>;
  getEmailList(id: string): Promise<EmailList | undefined>;
  getEmailListBySlug(slug: string): Promise<EmailList | undefined>;
  updateEmailList(id: string, data: Partial<EmailList>): Promise<EmailList>;
  deleteEmailList(id: string): Promise<void>;
  
  // Email Ad operations
  createEmailAd(ad: InsertEmailAd): Promise<EmailAd>;
  getEmailAdsByList(listId: string): Promise<EmailAd[]>;
  getEmailAdsByListOrdered(listId: string): Promise<EmailAd[]>;
  getActiveEmailAdsByListOrdered(listId: string): Promise<EmailAd[]>;
  getEmailAd(id: string): Promise<EmailAd | undefined>;
  updateEmailAd(id: string, data: Partial<EmailAd>): Promise<EmailAd>;
  deleteEmailAd(id: string): Promise<void>;
  reorderEmailAds(adOrders: { id: string; displayOrder: number }[]): Promise<void>;
  incrementEmailAdImpressions(id: string): Promise<void>;
  incrementEmailAdClicks(id: string): Promise<void>;
  getNextRotatingEmailAd(listId: string): Promise<EmailAd | undefined>;
  getEmailAdBySid(listId: string, sid: string, adType?: string): Promise<EmailAd | undefined>;
  
  // Email Ad Tracking operations
  recordEmailAdImpression(data: { adId: string; listId: string; sendId?: string; sub?: string; sub1?: string; esp?: string; ipAddress?: string; userAgent?: string }): Promise<EmailAdImpression>;
  recordEmailAdClick(data: { adId: string; listId: string; sendId?: string; sub?: string; sub1?: string; esp?: string; ipAddress?: string; userAgent?: string }): Promise<EmailAdClick>;

  // MMM Ad Revenue Intelligence (read-only; Python pipeline owns writes)
  getMmmCreativePerformance(days: number): Promise<MmmCreativeRow[]>;
  getMmmCreativeDetail(compoundKey: string, days: number): Promise<MmmPerformanceDaily[]>;
  getMmmDailyTotals(days: number): Promise<MmmDailyTotal[]>;
  getMmmPerformanceRows(days: number): Promise<MmmPerformanceDaily[]>;
  getMmmRuns(limit: number): Promise<MmmRunLog[]>;
  getMmmLatestRun(): Promise<MmmRunLog | undefined>;
  markMmmRunFailed(id: number, error: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if user exists by email
    if (userData.email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));

      if (existingUser) {
        // Update existing user
        const [updatedUser] = await db
          .update(users)
          .set({
            id: userData.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return updatedUser;
      }
    }
    
    // Insert new user
    const [newUser] = await db
      .insert(users)
      .values(userData)
      .returning();
    return newUser;
  }

  // End user operations
  async createEndUser(user: InsertEndUser): Promise<EndUser> {
    const [endUser] = await db.insert(endUsers).values(user).returning();
    return endUser;
  }

  async getEndUser(id: string): Promise<EndUser | undefined> {
    const [endUser] = await db.select().from(endUsers).where(eq(endUsers.id, id));
    return endUser;
  }

  async getEndUserBySessionId(sessionId: string): Promise<EndUser | undefined> {
    const [endUser] = await db.select().from(endUsers).where(eq(endUsers.sessionId, sessionId));
    return endUser;
  }

  async updateEndUser(id: string, data: Partial<EndUser>): Promise<EndUser> {
    const [endUser] = await db
      .update(endUsers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(endUsers.id, id))
      .returning();
    return endUser;
  }

  async getEndUsers(limit = 50, offset = 0): Promise<EndUser[]> {
    return await db
      .select()
      .from(endUsers)
      .orderBy(desc(endUsers.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Question operations
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [newQuestion] = await db.insert(questions).values(question).returning();
    return newQuestion;
  }

  async getQuestions(activeOnly = false): Promise<Question[]> {
    const query = db.select().from(questions).orderBy(questions.orderIndex);
    
    if (activeOnly) {
      query.where(eq(questions.isActive, true));
    }
    
    return await query;
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question> {
    const [question] = await db
      .update(questions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(questions.id, id))
      .returning();
    return question;
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  async reorderQuestions(questionOrders: { id: string; orderIndex: number }[]): Promise<void> {
    for (const { id, orderIndex } of questionOrders) {
      await db
        .update(questions)
        .set({ orderIndex, updatedAt: new Date() })
        .where(eq(questions.id, id));
    }
  }

  // Offer operations
  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [newOffer] = await db.insert(offers).values(offer).returning();
    return newOffer;
  }

  async getOffers(activeOnly = false): Promise<Offer[]> {
    const query = db.select().from(offers).orderBy(desc(offers.createdAt));
    
    if (activeOnly) {
      query.where(and(eq(offers.isActive, true), eq(offers.isPaused, false)));
    }
    
    return await query;
  }

  async getOffer(id: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer;
  }

  async updateOffer(id: string, data: Partial<Offer>): Promise<Offer> {
    const [offer] = await db
      .update(offers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    return offer;
  }

  async deleteOffer(id: string): Promise<void> {
    await db.delete(offers).where(eq(offers.id, id));
  }

  async getOffersByPage(pageNumber: number): Promise<Offer[]> {
    return await db
      .select()
      .from(offers)
      .where(
        and(
          eq(offers.isActive, true),
          eq(offers.isPaused, false),
          sql`${pageNumber} = ANY(${offers.displayPages})`
        )
      );
  }

  // Response operations
  async createResponse(response: InsertResponse): Promise<Response> {
    const [newResponse] = await db.insert(responses).values(response).returning();
    return newResponse;
  }

  async upsertResponse(response: InsertResponse): Promise<Response> {
    const [upsertedResponse] = await db
      .insert(responses)
      .values(response)
      .onConflictDoUpdate({
        target: [responses.endUserId, responses.questionId],
        set: {
          answer: response.answer,
        },
      })
      .returning();
    return upsertedResponse;
  }

  async getResponsesByUser(endUserId: string): Promise<Response[]> {
    return await db
      .select()
      .from(responses)
      .where(eq(responses.endUserId, endUserId))
      .orderBy(responses.createdAt);
  }

  async getResponsesWithQuestions(endUserId: string): Promise<any[]> {
    return await db
      .select({
        responseId: responses.id,
        answer: responses.answer,
        createdAt: responses.createdAt,
        questionId: questions.id,
        questionText: questions.text,
        questionType: questions.type,
        options: questions.options,
        category: questions.category,
      })
      .from(responses)
      .innerJoin(questions, eq(responses.questionId, questions.id))
      .where(eq(responses.endUserId, endUserId))
      .orderBy(responses.createdAt);
  }

  async getUserResponseCount(endUserId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(responses)
      .where(eq(responses.endUserId, endUserId));
    return result[0]?.count || 0;
  }

  // Offer interaction operations
  async createOfferInteraction(interaction: InsertOfferInteraction): Promise<OfferInteraction> {
    const [newInteraction] = await db.insert(offerInteractions).values(interaction).returning();
    
    // Update user's total revenue
    if (interaction.revenue && parseFloat(interaction.revenue.toString()) > 0) {
      await db
        .update(endUsers)
        .set({
          totalRevenue: sql`${endUsers.totalRevenue} + ${interaction.revenue}`,
          updatedAt: new Date()
        })
        .where(eq(endUsers.id, interaction.endUserId));
    }
    
    return newInteraction;
  }

  async getOfferInteractionsByUser(endUserId: string): Promise<OfferInteraction[]> {
    return await db
      .select()
      .from(offerInteractions)
      .where(eq(offerInteractions.endUserId, endUserId))
      .orderBy(desc(offerInteractions.createdAt));
  }

  async getOfferInteractionsByOffer(offerId: string): Promise<OfferInteraction[]> {
    return await db
      .select()
      .from(offerInteractions)
      .where(eq(offerInteractions.offerId, offerId))
      .orderBy(desc(offerInteractions.createdAt));
  }

  // Revenue and postback operations
  async createPostback(endUserId: string, totalRevenue: number, threshold: number): Promise<Postback> {
    const [postback] = await db
      .insert(postbacks)
      .values({
        endUserId,
        totalRevenue: totalRevenue.toString(),
        threshold: threshold.toString(),
        status: 'pending',
      })
      .returning();
    return postback;
  }

  async getPostbacksByUser(endUserId: string): Promise<Postback[]> {
    return await db
      .select()
      .from(postbacks)
      .where(eq(postbacks.endUserId, endUserId))
      .orderBy(desc(postbacks.createdAt));
  }

  async updatePostback(id: string, data: Partial<Postback>): Promise<Postback> {
    const [postback] = await db
      .update(postbacks)
      .set(data)
      .where(eq(postbacks.id, id))
      .returning();
    return postback;
  }

  // Analytics operations
  async getDailyStats(startDate: Date, endDate: Date): Promise<DailyStat[]> {
    return await db
      .select()
      .from(dailyStats)
      .where(
        and(
          gte(dailyStats.date, startDate.toISOString().split('T')[0]),
          lte(dailyStats.date, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(dailyStats.date);
  }

  async createOrUpdateDailyStats(date: Date, stats: Partial<DailyStat>): Promise<DailyStat> {
    const dateStr = date.toISOString().split('T')[0];
    
    const [existingStat] = await db
      .select()
      .from(dailyStats)
      .where(eq(dailyStats.date, dateStr));
    
    if (existingStat) {
      const [updated] = await db
        .update(dailyStats)
        .set(stats)
        .where(eq(dailyStats.id, existingStat.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(dailyStats)
        .values({ ...stats, date: dateStr })
        .returning();
      return created;
    }
  }

  async getDashboardMetrics(): Promise<{
    todayRevenue: number;
    activeUsers: number;
    conversionRate: number;
    avgRevenue: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's stats
    const [todayStats] = await db
      .select()
      .from(dailyStats)
      .where(eq(dailyStats.date, today));
    
    // Get active users today (users who started survey today)
    const [activeUsersResult] = await db
      .select({ count: count() })
      .from(endUsers)
      .where(gte(endUsers.createdAt, new Date(today)));
    
    // Get completed surveys today
    const [completedSurveysResult] = await db
      .select({ count: count() })
      .from(endUsers)
      .where(
        and(
          gte(endUsers.createdAt, new Date(today)),
          eq(endUsers.surveyCompleted, true)
        )
      );
    
    // Get today's revenue
    const [revenueResult] = await db
      .select({ total: sum(endUsers.totalRevenue) })
      .from(endUsers)
      .where(gte(endUsers.createdAt, new Date(today)));
    
    const activeUsers = activeUsersResult?.count || 0;
    const completedSurveys = completedSurveysResult?.count || 0;
    const todayRevenue = parseFloat(revenueResult?.total?.toString() || '0');
    
    const conversionRate = activeUsers > 0 ? (completedSurveys / activeUsers) * 100 : 0;
    const avgRevenue = completedSurveys > 0 ? todayRevenue / completedSurveys : 0;
    
    return {
      todayRevenue,
      activeUsers,
      conversionRate,
      avgRevenue,
    };
  }

  async getTopOffers(limit = 5): Promise<Offer[]> {
    return await db
      .select()
      .from(offers)
      .where(eq(offers.isActive, true))
      .orderBy(desc(offers.totalRevenue))
      .limit(limit);
  }

  async getRecentCompletions(limit = 10): Promise<EndUser[]> {
    return await db
      .select()
      .from(endUsers)
      .where(eq(endUsers.surveyCompleted, true))
      .orderBy(desc(endUsers.updatedAt))
      .limit(limit);
  }

  // Settings operations
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const [setting] = await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }

  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings).orderBy(settings.key);
  }

  // Giveaway operations
  async createGiveaway(giveaway: InsertGiveaway): Promise<Giveaway> {
    const [newGiveaway] = await db.insert(giveaways).values(giveaway).returning();
    return newGiveaway;
  }

  async getActiveGiveaway(): Promise<Giveaway | undefined> {
    const [giveaway] = await db
      .select()
      .from(giveaways)
      .where(eq(giveaways.isActive, true))
      .orderBy(desc(giveaways.createdAt))
      .limit(1);
    return giveaway;
  }

  async getGiveaways(): Promise<Giveaway[]> {
    return await db.select().from(giveaways).orderBy(desc(giveaways.createdAt));
  }

  async updateGiveaway(id: string, data: Partial<Giveaway>): Promise<Giveaway> {
    const [giveaway] = await db
      .update(giveaways)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(giveaways.id, id))
      .returning();
    return giveaway;
  }

  async deleteGiveaway(id: string): Promise<void> {
    await db.delete(giveaways).where(eq(giveaways.id, id));
  }

  // Postback management operations
  async getAllPostbacks(filters?: { status?: string; limit?: number; offset?: number }): Promise<Postback[]> {
    let query = db.select().from(postbacks);
    
    if (filters?.status) {
      query = query.where(eq(postbacks.status, filters.status)) as typeof query;
    }
    
    query = query.orderBy(desc(postbacks.createdAt)) as typeof query;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset) as typeof query;
    }
    
    return await query;
  }

  async getPostbackStats(): Promise<{
    totalPostbacks: number;
    successCount: number;
    failedCount: number;
    pendingCount: number;
    totalRevenuePostedBack: number;
    successRate: number;
  }> {
    const allPostbacks = await db.select().from(postbacks);
    
    const totalPostbacks = allPostbacks.length;
    const successCount = allPostbacks.filter(p => p.status === 'sent' || p.status === 'success').length;
    const failedCount = allPostbacks.filter(p => p.status === 'failed').length;
    const pendingCount = allPostbacks.filter(p => p.status === 'pending').length;
    const totalRevenuePostedBack = allPostbacks
      .filter(p => p.status === 'sent' || p.status === 'success')
      .reduce((sum, p) => sum + parseFloat(p.totalRevenue?.toString() || '0'), 0);
    const successRate = totalPostbacks > 0 ? (successCount / totalPostbacks) * 100 : 0;
    
    return {
      totalPostbacks,
      successCount,
      failedCount,
      pendingCount,
      totalRevenuePostedBack,
      successRate,
    };
  }

  async getUsersNearThreshold(thresholdPercent: number = 80): Promise<EndUser[]> {
    const defaultThreshold = 3.00;
    const minRevenue = (defaultThreshold * thresholdPercent) / 100;
    
    return await db
      .select()
      .from(endUsers)
      .where(
        and(
          gte(endUsers.totalRevenue, minRevenue.toString()),
          eq(endUsers.postbackFired, false)
        )
      )
      .orderBy(desc(endUsers.totalRevenue));
  }

  async getSourceThresholds(): Promise<Setting[]> {
    return await db
      .select()
      .from(settings)
      .where(sql`${settings.key} LIKE 'threshold_%'`)
      .orderBy(settings.key);
  }

  async deleteSourceThreshold(source: string): Promise<void> {
    await db.delete(settings).where(eq(settings.key, `threshold_${source}`));
  }

  // TY Brand operations
  async createTyBrand(brand: InsertTyBrand): Promise<TyBrand> {
    const [newBrand] = await db.insert(tyBrands).values(brand).returning();
    return newBrand;
  }

  async getTyBrands(): Promise<TyBrand[]> {
    return await db.select().from(tyBrands).orderBy(desc(tyBrands.createdAt));
  }

  async getTyBrand(id: string): Promise<TyBrand | undefined> {
    const [brand] = await db.select().from(tyBrands).where(eq(tyBrands.id, id));
    return brand;
  }

  async getTyBrandBySlug(slug: string): Promise<TyBrand | undefined> {
    const [brand] = await db.select().from(tyBrands).where(eq(tyBrands.slug, slug));
    return brand;
  }

  async updateTyBrand(id: string, data: Partial<TyBrand>): Promise<TyBrand> {
    const [brand] = await db
      .update(tyBrands)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tyBrands.id, id))
      .returning();
    return brand;
  }

  async deleteTyBrand(id: string): Promise<void> {
    await db.delete(tyPages).where(eq(tyPages.brandId, id));
    await db.delete(tyBrands).where(eq(tyBrands.id, id));
  }

  // TY Page operations
  async createTyPage(page: InsertTyPage): Promise<TyPage> {
    const [newPage] = await db.insert(tyPages).values(page).returning();
    return newPage;
  }

  async getTyPagesByBrand(brandId: string): Promise<TyPage[]> {
    return await db.select().from(tyPages).where(eq(tyPages.brandId, brandId)).orderBy(desc(tyPages.createdAt));
  }

  async getTyPage(id: string): Promise<TyPage | undefined> {
    const [page] = await db.select().from(tyPages).where(eq(tyPages.id, id));
    return page;
  }

  async getTyPageBySlug(brandId: string, slug: string): Promise<TyPage | undefined> {
    const [page] = await db
      .select()
      .from(tyPages)
      .where(and(eq(tyPages.brandId, brandId), eq(tyPages.slug, slug)));
    return page;
  }

  async updateTyPage(id: string, data: Partial<TyPage>): Promise<TyPage> {
    const [page] = await db
      .update(tyPages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tyPages.id, id))
      .returning();
    return page;
  }

  async deleteTyPage(id: string): Promise<void> {
    await db.delete(tyPages).where(eq(tyPages.id, id));
  }

  async incrementTyPageImpressions(id: string): Promise<void> {
    await db
      .update(tyPages)
      .set({ impressions: sql`${tyPages.impressions} + 1` })
      .where(eq(tyPages.id, id));
  }

  async incrementTyPageClicks(id: string): Promise<void> {
    await db
      .update(tyPages)
      .set({ clicks: sql`${tyPages.clicks} + 1` })
      .where(eq(tyPages.id, id));
  }

  async getTyPagesByBrandOrdered(brandId: string): Promise<TyPage[]> {
    return await db
      .select()
      .from(tyPages)
      .where(eq(tyPages.brandId, brandId))
      .orderBy(tyPages.displayOrder);
  }

  async getActiveTyPagesByBrandOrdered(brandId: string): Promise<TyPage[]> {
    return await db
      .select()
      .from(tyPages)
      .where(and(eq(tyPages.brandId, brandId), eq(tyPages.isActive, true)))
      .orderBy(tyPages.displayOrder);
  }

  async reorderTyPages(pageOrders: { id: string; displayOrder: number }[]): Promise<void> {
    for (const { id, displayOrder } of pageOrders) {
      await db
        .update(tyPages)
        .set({ displayOrder, updatedAt: new Date() })
        .where(eq(tyPages.id, id));
    }
  }

  async getNextEmbedPage(brandId: string): Promise<TyPage | undefined> {
    const brand = await this.getTyBrand(brandId);
    if (!brand) return undefined;

    const activePages = await this.getActiveTyPagesByBrandOrdered(brandId);
    if (activePages.length === 0) return undefined;

    const currentIndex = brand.nextEmbedIndex || 0;
    const nextIndex = (currentIndex + 1) % activePages.length;

    await db
      .update(tyBrands)
      .set({ nextEmbedIndex: nextIndex, updatedAt: new Date() })
      .where(eq(tyBrands.id, brandId));

    return activePages[currentIndex % activePages.length];
  }

  // TY Survey operations
  async createTySurvey(survey: InsertTySurvey): Promise<TySurvey> {
    const [newSurvey] = await db.insert(tySurveys).values(survey).returning();
    return newSurvey;
  }

  async getTySurveys(): Promise<TySurvey[]> {
    return await db.select().from(tySurveys).orderBy(desc(tySurveys.createdAt));
  }

  async getTySurvey(id: string): Promise<TySurvey | undefined> {
    const [survey] = await db.select().from(tySurveys).where(eq(tySurveys.id, id));
    return survey;
  }

  async getTySurveyBySlug(slug: string): Promise<TySurvey | undefined> {
    const [survey] = await db.select().from(tySurveys).where(eq(tySurveys.slug, slug));
    return survey;
  }

  async updateTySurvey(id: string, data: Partial<TySurvey>): Promise<TySurvey> {
    const [survey] = await db
      .update(tySurveys)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tySurveys.id, id))
      .returning();
    return survey;
  }

  async deleteTySurvey(id: string): Promise<void> {
    await db.delete(tySurveyResponses).where(eq(tySurveyResponses.surveyId, id));
    await db.delete(tySurveys).where(eq(tySurveys.id, id));
  }

  async incrementTySurveyResponses(id: string): Promise<void> {
    await db
      .update(tySurveys)
      .set({ totalResponses: sql`${tySurveys.totalResponses} + 1` })
      .where(eq(tySurveys.id, id));
  }

  // TY Survey Question operations
  async createTySurveyQuestion(question: InsertTySurveyQuestion): Promise<TySurveyQuestion> {
    const [newQuestion] = await db.insert(tySurveyQuestions).values(question).returning();
    return newQuestion;
  }

  async getTySurveyQuestions(surveyId: string): Promise<TySurveyQuestion[]> {
    return await db
      .select()
      .from(tySurveyQuestions)
      .where(eq(tySurveyQuestions.surveyId, surveyId))
      .orderBy(desc(tySurveyQuestions.createdAt));
  }

  async getTySurveyQuestionsOrdered(surveyId: string): Promise<TySurveyQuestion[]> {
    return await db
      .select()
      .from(tySurveyQuestions)
      .where(eq(tySurveyQuestions.surveyId, surveyId))
      .orderBy(tySurveyQuestions.displayOrder);
  }

  async getActiveTySurveyQuestionsOrdered(surveyId: string): Promise<TySurveyQuestion[]> {
    return await db
      .select()
      .from(tySurveyQuestions)
      .where(and(eq(tySurveyQuestions.surveyId, surveyId), eq(tySurveyQuestions.isActive, true)))
      .orderBy(tySurveyQuestions.displayOrder);
  }

  async getTySurveyQuestion(id: string): Promise<TySurveyQuestion | undefined> {
    const [question] = await db.select().from(tySurveyQuestions).where(eq(tySurveyQuestions.id, id));
    return question;
  }

  async updateTySurveyQuestion(id: string, data: Partial<TySurveyQuestion>): Promise<TySurveyQuestion> {
    const [question] = await db
      .update(tySurveyQuestions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tySurveyQuestions.id, id))
      .returning();
    return question;
  }

  async deleteTySurveyQuestion(id: string): Promise<void> {
    await db.delete(tySurveyQuestionOffers).where(eq(tySurveyQuestionOffers.questionId, id));
    await db.delete(tySurveyQuestions).where(eq(tySurveyQuestions.id, id));
  }

  async reorderTySurveyQuestions(questionOrders: { id: string; displayOrder: number }[]): Promise<void> {
    for (const { id, displayOrder } of questionOrders) {
      await db
        .update(tySurveyQuestions)
        .set({ displayOrder, updatedAt: new Date() })
        .where(eq(tySurveyQuestions.id, id));
    }
  }

  // TY Survey Question Offer operations
  async setTySurveyQuestionOffers(questionId: string, offersList: { offerId: string; displayOrder: number; displayMode: string }[]): Promise<TySurveyQuestionOffer[]> {
    await db.delete(tySurveyQuestionOffers).where(eq(tySurveyQuestionOffers.questionId, questionId));
    
    if (offersList.length === 0) return [];
    
    const values = offersList.map(o => ({
      questionId,
      offerId: o.offerId,
      displayOrder: o.displayOrder,
      displayMode: o.displayMode,
    }));
    
    return await db.insert(tySurveyQuestionOffers).values(values).returning();
  }

  async getTySurveyQuestionOffers(questionId: string): Promise<(TySurveyQuestionOffer & { offer: Offer })[]> {
    const questionOffers = await db
      .select()
      .from(tySurveyQuestionOffers)
      .where(eq(tySurveyQuestionOffers.questionId, questionId))
      .orderBy(tySurveyQuestionOffers.displayOrder);
    
    const result = [];
    for (const qo of questionOffers) {
      const [offer] = await db.select().from(offers).where(eq(offers.id, qo.offerId));
      if (offer) {
        result.push({ ...qo, offer });
      }
    }
    return result;
  }

  // TY Survey Response operations
  async createTySurveyResponse(response: InsertTySurveyResponse): Promise<TySurveyResponse> {
    const [newResponse] = await db.insert(tySurveyResponses).values(response).returning();
    return newResponse;
  }

  async getTySurveyResponsesBySession(surveyId: string, sessionId: string): Promise<TySurveyResponse[]> {
    return await db
      .select()
      .from(tySurveyResponses)
      .where(and(eq(tySurveyResponses.surveyId, surveyId), eq(tySurveyResponses.sessionId, sessionId)))
      .orderBy(tySurveyResponses.createdAt);
  }

  // Email List operations
  async createEmailList(list: InsertEmailList): Promise<EmailList> {
    const [newList] = await db.insert(emailLists).values(list).returning();
    return newList;
  }

  async getEmailLists(): Promise<EmailList[]> {
    return await db.select().from(emailLists).orderBy(desc(emailLists.createdAt));
  }

  async getEmailList(id: string): Promise<EmailList | undefined> {
    const [list] = await db.select().from(emailLists).where(eq(emailLists.id, id));
    return list;
  }

  async getEmailListBySlug(slug: string): Promise<EmailList | undefined> {
    const [list] = await db.select().from(emailLists).where(eq(emailLists.slug, slug));
    return list;
  }

  async updateEmailList(id: string, data: Partial<EmailList>): Promise<EmailList> {
    const [list] = await db
      .update(emailLists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailLists.id, id))
      .returning();
    return list;
  }

  async deleteEmailList(id: string): Promise<void> {
    await db.delete(emailAds).where(eq(emailAds.listId, id));
    await db.delete(emailLists).where(eq(emailLists.id, id));
  }

  // Email Ad operations
  async createEmailAd(ad: InsertEmailAd): Promise<EmailAd> {
    const [newAd] = await db.insert(emailAds).values(ad).returning();
    return newAd;
  }

  async getEmailAdsByList(listId: string): Promise<EmailAd[]> {
    return await db.select().from(emailAds).where(eq(emailAds.listId, listId));
  }

  async getEmailAdsByListOrdered(listId: string): Promise<EmailAd[]> {
    return await db
      .select()
      .from(emailAds)
      .where(eq(emailAds.listId, listId))
      .orderBy(emailAds.displayOrder);
  }

  async getActiveEmailAdsByListOrdered(listId: string): Promise<EmailAd[]> {
    return await db
      .select()
      .from(emailAds)
      .where(and(eq(emailAds.listId, listId), eq(emailAds.isActive, true)))
      .orderBy(emailAds.displayOrder);
  }

  async getEmailAd(id: string): Promise<EmailAd | undefined> {
    const [ad] = await db.select().from(emailAds).where(eq(emailAds.id, id));
    return ad;
  }

  async updateEmailAd(id: string, data: Partial<EmailAd>): Promise<EmailAd> {
    const [ad] = await db
      .update(emailAds)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailAds.id, id))
      .returning();
    return ad;
  }

  async deleteEmailAd(id: string): Promise<void> {
    await db.delete(emailAds).where(eq(emailAds.id, id));
  }

  async reorderEmailAds(adOrders: { id: string; displayOrder: number }[]): Promise<void> {
    for (const { id, displayOrder } of adOrders) {
      await db
        .update(emailAds)
        .set({ displayOrder, updatedAt: new Date() })
        .where(eq(emailAds.id, id));
    }
  }

  async incrementEmailAdImpressions(id: string): Promise<void> {
    await db
      .update(emailAds)
      .set({ impressions: sql`${emailAds.impressions} + 1` })
      .where(eq(emailAds.id, id));
  }

  async incrementEmailAdClicks(id: string): Promise<void> {
    await db
      .update(emailAds)
      .set({ clicks: sql`${emailAds.clicks} + 1` })
      .where(eq(emailAds.id, id));
  }

  async getNextRotatingEmailAd(listId: string): Promise<EmailAd | undefined> {
    const list = await this.getEmailList(listId);
    if (!list) return undefined;

    const activeAds = await this.getActiveEmailAdsByListOrdered(listId);
    if (activeAds.length === 0) return undefined;

    const currentIndex = list.nextAdIndex || 0;
    const ad = activeAds[currentIndex % activeAds.length];

    await db
      .update(emailLists)
      .set({ 
        nextAdIndex: (currentIndex + 1) % activeAds.length,
        totalImpressions: sql`${emailLists.totalImpressions} + 1`
      })
      .where(eq(emailLists.id, listId));

    return ad;
  }

  async getEmailAdBySid(listId: string, sid: string, adType?: string): Promise<EmailAd | undefined> {
    const activeAds = await this.getActiveEmailAdsByListOrdered(listId);
    let filteredAds = adType ? activeAds.filter(a => a.adType === adType) : activeAds;
    if (filteredAds.length === 0) return undefined;
    let hash = 0;
    for (let i = 0; i < sid.length; i++) {
      hash = ((hash << 5) - hash) + sid.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % filteredAds.length;
    return filteredAds[index];
  }

  // Email Ad Tracking operations
  async recordEmailAdImpression(data: { adId: string; listId: string; sendId?: string; sub?: string; sub1?: string; esp?: string; ipAddress?: string; userAgent?: string }): Promise<EmailAdImpression> {
    const [impression] = await db.insert(emailAdImpressions).values(data).returning();
    return impression;
  }

  async recordEmailAdClick(data: { adId: string; listId: string; sendId?: string; sub?: string; sub1?: string; esp?: string; ipAddress?: string; userAgent?: string }): Promise<EmailAdClick> {
    const [click] = await db.insert(emailAdClicks).values(data).returning();
    await db
      .update(emailLists)
      .set({ totalClicks: sql`${emailLists.totalClicks} + 1` })
      .where(eq(emailLists.id, data.listId));
    return click;
  }

  // === MMM Ad Revenue Intelligence (read-only) ===
  // The Python pipeline owns all writes to the mmm_* tables via psycopg2.
  // These methods only read the joined snapshot for the dashboard.

  private mmmCutoff(days: number): string {
    // Align the window to the pipeline's timezone (America/New_York) so day
    // boundaries match the dates the Python pipeline writes.
    const estToday = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    });
    const d = new Date(`${estToday}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - Math.max(0, days - 1));
    return d.toISOString().slice(0, 10);
  }

  async getMmmCreativePerformance(days: number): Promise<MmmCreativeRow[]> {
    const cutoff = this.mmmCutoff(days);
    const rows = await db
      .select({
        compoundKey: mmmPerformanceDaily.compoundKey,
        platform: sql<string>`max(${mmmPerformanceDaily.platform})`,
        adName: sql<string | null>`max(${mmmPerformanceDaily.adName})`,
        campaignName: sql<string | null>`max(${mmmPerformanceDaily.campaignName})`,
        spend: sql<number>`coalesce(sum(${mmmPerformanceDaily.spend}), 0)`,
        impressions: sql<number>`coalesce(sum(${mmmPerformanceDaily.impressions}), 0)`,
        clicks: sql<number>`coalesce(sum(${mmmPerformanceDaily.clicks}), 0)`,
        imsRevenue: sql<number>`coalesce(sum(${mmmPerformanceDaily.imsRevenue}), 0)`,
        aoRevenue: sql<number>`coalesce(sum(${mmmPerformanceDaily.aoRevenue}), 0)`,
        totalRevenue: sql<number>`coalesce(sum(${mmmPerformanceDaily.totalRevenue}), 0)`,
        adjustedRevenue: sql<number>`coalesce(sum(${mmmPerformanceDaily.adjustedRevenue}), 0)`,
        activeDays: sql<number>`count(distinct ${mmmPerformanceDaily.date})`,
      })
      .from(mmmPerformanceDaily)
      .where(gte(mmmPerformanceDaily.date, cutoff))
      .groupBy(mmmPerformanceDaily.compoundKey)
      .orderBy(desc(sql`sum(${mmmPerformanceDaily.spend})`));

    return rows.map((r) => {
      const spend = Number(r.spend) || 0;
      const totalRevenue = Number(r.totalRevenue) || 0;
      const adjustedRevenue = Number(r.adjustedRevenue) || 0;
      return {
        compoundKey: r.compoundKey,
        platform: r.platform ?? "Other",
        adName: r.adName ?? null,
        campaignName: r.campaignName ?? null,
        spend,
        impressions: Number(r.impressions) || 0,
        clicks: Number(r.clicks) || 0,
        imsRevenue: Number(r.imsRevenue) || 0,
        aoRevenue: Number(r.aoRevenue) || 0,
        totalRevenue,
        adjustedRevenue,
        day0Roas: spend > 0 ? totalRevenue / spend : null,
        adjustedRoas: spend > 0 ? adjustedRevenue / spend : null,
        activeDays: Number(r.activeDays) || 0,
      };
    });
  }

  async getMmmPerformanceRows(days: number): Promise<MmmPerformanceDaily[]> {
    const cutoff = this.mmmCutoff(days);
    return db
      .select()
      .from(mmmPerformanceDaily)
      .where(gte(mmmPerformanceDaily.date, cutoff))
      .orderBy(desc(mmmPerformanceDaily.date), desc(mmmPerformanceDaily.totalRevenue));
  }

  async getMmmCreativeDetail(compoundKey: string, days: number): Promise<MmmPerformanceDaily[]> {
    const cutoff = this.mmmCutoff(days);
    return db
      .select()
      .from(mmmPerformanceDaily)
      .where(
        and(
          eq(mmmPerformanceDaily.compoundKey, compoundKey),
          gte(mmmPerformanceDaily.date, cutoff),
        ),
      )
      .orderBy(mmmPerformanceDaily.date);
  }

  async getMmmDailyTotals(days: number): Promise<MmmDailyTotal[]> {
    const cutoff = this.mmmCutoff(days);

    // Day-level ad-platform spend comes from the RAW ingestion table
    // (mmm_ad_spend: Meta + creative-level Google only). We deliberately do NOT
    // sum mmm_performance_daily.spend here: the pipeline allocates sheet
    // Google/Taboola spend into those creative rows, so summing them and then
    // adding mmm_daily_spend would double-count the same dollars. mmm_ad_spend
    // never contains allocated sheet spend, so raw ad spend + precedence-adjusted
    // sheet spend (mmm_daily_spend) gives the true, single-counted day total.
    const adSpendByDay = await db
      .select({
        date: mmmAdSpend.date,
        adSpend: sql<number>`coalesce(sum(${mmmAdSpend.spend}), 0)`,
      })
      .from(mmmAdSpend)
      .where(gte(mmmAdSpend.date, cutoff))
      .groupBy(mmmAdSpend.date);

    // Revenue: total_revenue = IMS + AO (attributed, excludes gross sources).
    // At the DAY level, adjusted revenue (attributed + allocated gross) is
    // exactly attributed + gross source revenue, so we derive it as
    // combinedRevenue below rather than summing mmm_performance_daily.adjusted_
    // revenue. Summing the per-row allocated values would silently DROP the whole
    // gross_total on any day the allocation didn't fire (e.g. IMS impressions are
    // zero because IMS creds/scrape are absent — an explicitly supported state).
    const perfByDay = await db
      .select({
        date: mmmPerformanceDaily.date,
        creativeRevenue: sql<number>`coalesce(sum(${mmmPerformanceDaily.totalRevenue}), 0)`,
      })
      .from(mmmPerformanceDaily)
      .where(gte(mmmPerformanceDaily.date, cutoff))
      .groupBy(mmmPerformanceDaily.date);

    const spendRows = await db
      .select()
      .from(mmmDailySpend)
      .where(gte(mmmDailySpend.date, cutoff));

    const sourceByDay = await db
      .select({
        date: mmmSourceDaily.date,
        revenue: sql<number>`coalesce(sum(${mmmSourceDaily.revenue}), 0)`,
      })
      .from(mmmSourceDaily)
      .where(gte(mmmSourceDaily.date, cutoff))
      .groupBy(mmmSourceDaily.date);

    const adSpendMap = new Map(adSpendByDay.map((r) => [r.date, Number(r.adSpend) || 0]));
    const spendMap = new Map(spendRows.map((r) => [r.date, r]));
    const sourceMap = new Map(sourceByDay.map((r) => [r.date, Number(r.revenue) || 0]));

    const dates = new Set<string>([
      ...adSpendByDay.map((r) => r.date),
      ...perfByDay.map((r) => r.date),
      ...spendRows.map((r) => r.date),
      ...sourceByDay.map((r) => r.date),
    ]);

    const perfMap = new Map(perfByDay.map((r) => [r.date, r]));

    return Array.from(dates)
      .sort()
      .map((date) => {
        const p = perfMap.get(date);
        const s = spendMap.get(date);
        const creativeSpend = adSpendMap.get(date) || 0;
        const creativeRevenue = Number(p?.creativeRevenue) || 0;
        const googleSpend = Number(s?.googleSpend) || 0;
        const taboolaSpend = Number(s?.taboolaSpend) || 0;
        const sourceRevenue = sourceMap.get(date) || 0;
        const totalSpend = creativeSpend + googleSpend + taboolaSpend;
        const combinedRevenue = creativeRevenue + sourceRevenue;
        // adjusted == combined at the day level (attributed + gross once).
        const adjustedRevenue = combinedRevenue;
        return {
          date,
          creativeSpend,
          googleSpend,
          taboolaSpend,
          totalSpend,
          creativeRevenue,
          sourceRevenue,
          combinedRevenue,
          adjustedRevenue,
          roas: totalSpend > 0 ? combinedRevenue / totalSpend : null,
          adjustedRoas: totalSpend > 0 ? adjustedRevenue / totalSpend : null,
        };
      });
  }

  async getMmmRuns(limit: number): Promise<MmmRunLog[]> {
    return db
      .select()
      .from(mmmRunLog)
      .orderBy(desc(mmmRunLog.startedAt))
      .limit(limit);
  }

  async getMmmLatestRun(): Promise<MmmRunLog | undefined> {
    const [run] = await db
      .select()
      .from(mmmRunLog)
      .orderBy(desc(mmmRunLog.startedAt))
      .limit(1);
    return run;
  }

  async markMmmRunFailed(id: number, error: string): Promise<void> {
    await db
      .update(mmmRunLog)
      .set({ status: "failed", finishedAt: new Date(), errors: [error] })
      .where(eq(mmmRunLog.id, id));
  }
}

export const storage = new DatabaseStorage();
