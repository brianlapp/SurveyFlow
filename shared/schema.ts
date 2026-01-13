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
  date,
  uniqueIndex
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
}, (table) => [
  uniqueIndex("unique_user_question").on(table.endUserId, table.questionId),
]);

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
  offerType: varchar("offer_type", { length: 50 }).default('tune_standard'), // tune_standard, popup_script, next_link
  impressionPixel: text("impression_pixel"), // Tune impression tracking pixel URL
  scriptContent: text("script_content"), // JavaScript code for popup_script type
  linkText: varchar("link_text", { length: 100 }).default('Next'), // Text for next_link type
  triggerSettings: jsonb("trigger_settings"), // When/where offer displays: { triggerType, triggerValue, displayLocation }
  displayPages: integer("display_pages").array(), // Pages where offer should appear
  questionIds: uuid("question_ids").array().default(sql`ARRAY[]::uuid[]`), // Specific questions after which offer should appear
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
  offerId: uuid("offer_id").references(() => offers.id, { onDelete: 'cascade' }).notNull(),
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

// Thank You Page Brands
export const tyBrands = pgTable("ty_brands", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  thankYouTitle: varchar("thank_you_title", { length: 255 }).default('Thank you for joining!'),
  fontFamily: varchar("font_family", { length: 100 }).default('Inter'),
  navItems: jsonb("nav_items").default([]), // Array of { label: string, url: string }
  primaryColor: varchar("primary_color", { length: 20 }).default('#22c55e'), // Button color
  headingColor: varchar("heading_color", { length: 20 }).default('#22c55e'), // "Thank you" heading color
  taglineColor: varchar("tagline_color", { length: 20 }).default('#22c55e'), // Offer tagline color
  newsletterReminder: text("newsletter_reminder"), // Footer reminder text
  footerCopyright: varchar("footer_copyright", { length: 255 }), // e.g., "Copyright 2025© Mode Mobile"
  termsUrl: varchar("terms_url", { length: 500 }),
  privacyUrl: varchar("privacy_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Thank You Pages (offers within brands)
export const tyPages = pgTable("ty_pages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: uuid("brand_id").references(() => tyBrands.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  offerTitle: varchar("offer_title", { length: 255 }).notNull(),
  offerImageUrl: varchar("offer_image_url", { length: 500 }),
  tuneOfferId: varchar("tune_offer_id", { length: 100 }).notNull(),
  affiliateId: varchar("affiliate_id", { length: 100 }).notNull(),
  trackingDomain: varchar("tracking_domain", { length: 255 }).default('track.modemobile.com'),
  buttonText: varchar("button_text", { length: 50 }).default('CONTINUE'),
  fbShareUrl: varchar("fb_share_url", { length: 500 }), // URL to share on Facebook
  isActive: boolean("is_active").default(true),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("unique_brand_page_slug").on(table.brandId, table.slug),
]);

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

export const tyBrandsRelations = relations(tyBrands, ({ many }) => ({
  pages: many(tyPages),
}));

export const tyPagesRelations = relations(tyPages, ({ one }) => ({
  brand: one(tyBrands, {
    fields: [tyPages.brandId],
    references: [tyBrands.id],
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

export const insertTyBrandSchema = createInsertSchema(tyBrands).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTyPageSchema = createInsertSchema(tyPages).omit({
  id: true,
  impressions: true,
  clicks: true,
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
export type TyBrand = typeof tyBrands.$inferSelect;
export type InsertTyBrand = z.infer<typeof insertTyBrandSchema>;
export type TyPage = typeof tyPages.$inferSelect;
export type InsertTyPage = z.infer<typeof insertTyPageSchema>;
