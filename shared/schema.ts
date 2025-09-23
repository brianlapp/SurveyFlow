import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  uuid,
  date
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Admin users table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Giveaway management
export const giveaways = pgTable("giveaways", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull().default('Free Product Giveaway'),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  retailValue: decimal("retail_value", { precision: 10, scale: 2 }).notNull().default('29.99'),
  shippingValue: decimal("shipping_value", { precision: 10, scale: 2 }).default('15.00'),
  countdownHours: integer("countdown_hours").default(8),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// End users (survey participants)
export const endUsers = pgTable("end_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  age: varchar("age", { length: 20 }).notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zip: varchar("zip", { length: 20 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  source: varchar("source", { length: 100 }),
  subSource: varchar("sub_source", { length: 100 }),
  sessionId: varchar("session_id", { length: 100 }).unique().notNull(),
  browserFingerprint: varchar("browser_fingerprint", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default('0.00'),
  postbackFired: boolean("postback_fired").default(false),
  surveyCompleted: boolean("survey_completed").default(false),
  currentQuestionIndex: integer("current_question_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Survey questions
export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  text: text("text").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // multiple_choice, yes_no, text, multiple_select
  options: jsonb("options"), // Array of options for multiple choice
  category: varchar("category", { length: 50 }),
  stepNumber: integer("step_number").default(2), // Which step this question appears on
  questionCategory: varchar("question_category", { length: 100 }), // demographic, lead_gen, qualifying
  isRequired: boolean("is_required").default(true),
  orderIndex: integer("order_index").notNull(),
  conditionalLogic: jsonb("conditional_logic"), // Conditions for showing this question
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User responses to questions
export const responses = pgTable("responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  endUserId: uuid("end_user_id").references(() => endUsers.id).notNull(),
  questionId: uuid("question_id").references(() => questions.id).notNull(),
  answer: jsonb("answer").notNull(), // Flexible storage for different answer types
  createdAt: timestamp("created_at").defaultNow(),
});

// Offers management
export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tuneOfferId: varchar("tune_offer_id", { length: 100 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),
  clickUrl: varchar("click_url", { length: 500 }),
  payout: decimal("payout", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }),
  offerType: varchar("offer_type", { length: 50 }).default('main'), // main, exit, giveaway
  displayPages: integer("display_pages").array(), // Pages where offer should appear
  position: integer("position").default(1), // Position on page
  demographics: jsonb("demographics"), // Target demographics
  geoTargeting: jsonb("geo_targeting"), // Geographic targeting
  deviceTargeting: jsonb("device_targeting"), // Device targeting
  timeBasedDisplay: jsonb("time_based_display"), // Dayparting
  dailyCap: integer("daily_cap"),
  totalCap: integer("total_cap"),
  isActive: boolean("is_active").default(true),
  isPaused: boolean("is_paused").default(false),
  startDate: date("start_date"),
  endDate: date("end_date"),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default('0.00'),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default('0.00'),
  totalConversions: integer("total_conversions").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User offer interactions
export const offerInteractions = pgTable("offer_interactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  endUserId: uuid("end_user_id").references(() => endUsers.id).notNull(),
  offerId: uuid("offer_id").references(() => offers.id).notNull(),
  interactionType: varchar("interaction_type", { length: 50 }).notNull(), // view, click, conversion
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default('0.00'),
  pageNumber: integer("page_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Revenue tracking and postbacks
export const postbacks = pgTable("postbacks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  endUserId: uuid("end_user_id").references(() => endUsers.id).notNull(),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).notNull(),
  threshold: decimal("threshold", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default('pending'), // pending, sent, failed
  affiliateResponse: text("affiliate_response"),
  firedAt: timestamp("fired_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics and performance tracking
export const dailyStats = pgTable("daily_stats", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  date: date("date").notNull(),
  totalUsers: integer("total_users").default(0),
  completedSurveys: integer("completed_surveys").default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default('0.00'),
  postbacksFired: integer("postbacks_fired").default(0),
  avgRevenuePerUser: decimal("avg_revenue_per_user", { precision: 10, scale: 2 }).default('0.00'),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default('0.00'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Platform settings
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const endUsersRelations = relations(endUsers, ({ many }) => ({
  responses: many(responses),
  offerInteractions: many(offerInteractions),
  postbacks: many(postbacks),
}));

export const questionsRelations = relations(questions, ({ many }) => ({
  responses: many(responses),
}));

export const offersRelations = relations(offers, ({ many }) => ({
  interactions: many(offerInteractions),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  endUser: one(endUsers, {
    fields: [responses.endUserId],
    references: [endUsers.id],
  }),
  question: one(questions, {
    fields: [responses.questionId],
    references: [questions.id],
  }),
}));

export const offerInteractionsRelations = relations(offerInteractions, ({ one }) => ({
  endUser: one(endUsers, {
    fields: [offerInteractions.endUserId],
    references: [endUsers.id],
  }),
  offer: one(offers, {
    fields: [offerInteractions.offerId],
    references: [offers.id],
  }),
}));

export const postbacksRelations = relations(postbacks, ({ one }) => ({
  endUser: one(endUsers, {
    fields: [postbacks.endUserId],
    references: [endUsers.id],
  }),
}));

// Insert schemas
export const insertEndUserSchema = createInsertSchema(endUsers).omit({
  id: true,
  totalRevenue: true,
  postbackFired: true,
  surveyCompleted: true,
  currentQuestionIndex: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  conversionRate: true,
  totalRevenue: true,
  totalConversions: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResponseSchema = createInsertSchema(responses).omit({
  id: true,
  createdAt: true,
});

export const insertOfferInteractionSchema = createInsertSchema(offerInteractions).omit({
  id: true,
  createdAt: true,
});

export const insertGiveawaySchema = createInsertSchema(giveaways).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type EndUser = typeof endUsers.$inferSelect;
export type InsertEndUser = z.infer<typeof insertEndUserSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Response = typeof responses.$inferSelect;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type OfferInteraction = typeof offerInteractions.$inferSelect;
export type InsertOfferInteraction = z.infer<typeof insertOfferInteractionSchema>;
export type Giveaway = typeof giveaways.$inferSelect;
export type InsertGiveaway = z.infer<typeof insertGiveawaySchema>;
export type Postback = typeof postbacks.$inferSelect;
export type DailyStat = typeof dailyStats.$inferSelect;
export type Setting = typeof settings.$inferSelect;
