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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte, sum, count, avg } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
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
}

export const storage = new DatabaseStorage();
