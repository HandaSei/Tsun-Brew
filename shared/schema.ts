import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(), // 'registration', 'password_reset'
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teas = pgTable("teas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  photoUrl: text("photo_url"),
  type: text("type").notNull(), // 'Green', 'Black', 'Oolong', 'White', 'Yellow', 'Dark'
  origin: text("origin"),
  cultivar: text("cultivar"),
  averageScore: integer("average_score").default(0),
  
  // Brewing Parameters
  recommendedTemp: integer("recommended_temp"), // General default
  recommendedDuration: integer("recommended_duration"), // General default
  
  // Oriental/Gongfu
  orientalTemp: integer("oriental_temp"),
  orientalDuration: integer("oriental_duration"),
  orientalInfusionIncrement: integer("oriental_infusion_increment"), 
  orientalMaxInfusions: integer("oriental_max_infusions"),
  
  // Occidental/Western
  occidentalTemp: integer("occidental_temp"),
  occidentalDuration: integer("occidental_duration"),
  occidentalInfusions: jsonb("occidental_infusions"), // Array of seconds: [180, 240, 300]
  
  washingStep: boolean("washing_step").default(false),
  washingDuration: integer("washing_duration"),
  
  orientalLeafAmount: text("oriental_leaf_amount"),
  orientalWaterAmount: text("oriental_water_amount"),
  occidentalLeafAmount: text("occidental_leaf_amount"),
  occidentalWaterAmount: text("occidental_water_amount"),
  
  showOriental: boolean("show_oriental").default(true),
  showOccidental: boolean("show_occidental").default(true),
  orientalTimerEnabled: boolean("oriental_timer_enabled").default(true),
  occidentalTimerEnabled: boolean("occidental_timer_enabled").default(true),
  brewingNote: text("brewing_note"),
  showBrewingNote: boolean("show_brewing_note").default(false),
  
  isCustom: boolean("is_custom").default(false),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teaAttributes = pgTable("tea_attributes", {
  id: serial("id").primaryKey(),
  teaId: integer("tea_id").notNull().references(() => teas.id),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

export const teaLogs = pgTable("tea_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  teaId: integer("tea_id").notNull().references(() => teas.id),
  personalScore: jsonb("personal_score"),
  status: text("status").notNull().default("want_to_try"),
  totalBrews: integer("total_brews").default(0),
  currentInfusion: integer("current_infusion").default(1),
  timerSettings: jsonb("timer_settings"), // { temp, method, infusion, orientalDuration, orientalIncrement, occidentalInfusions }
  lastBrewedAt: timestamp("last_brewed_at"),
});

export const brewingGuides = pgTable("brewing_guides", {
  id: serial("id").primaryKey(),
  teaId: integer("tea_id").notNull().references(() => teas.id),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  isOfficial: boolean("is_official").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  teaId: integer("tea_id").notNull().references(() => teas.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const heroPhrases = pgTable("hero_phrases", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const teaTypes = pgTable("tea_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  colorHue: integer("color_hue").notNull().default(120),
  colorSaturation: integer("color_saturation").notNull().default(20),
  colorLightness: integer("color_lightness").notNull().default(40),
  sortOrder: integer("sort_order").default(0),
});

export const footerLinks = pgTable("footer_links", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  pageSlug: text("page_slug").notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull().default("Tsun Brew"),
  showSiteName: boolean("show_site_name").notNull().default(true),
  statusTag: text("status_tag"),
  logoUrl: text("logo_url"),
  displayFont: text("display_font"),
  faviconUrl: text("favicon_url"),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  teas: many(teas),
  logs: many(teaLogs),
  reviews: many(reviews),
  guides: many(brewingGuides),
}));

export const teasRelations = relations(teas, ({ one, many }) => ({
  creator: one(users, {
    fields: [teas.createdById],
    references: [users.id],
  }),
  attributes: many(teaAttributes),
  logs: many(teaLogs),
  reviews: many(reviews),
  guides: many(brewingGuides),
}));

export const teaLogsRelations = relations(teaLogs, ({ one }) => ({
  user: one(users, {
    fields: [teaLogs.userId],
    references: [users.id],
  }),
  tea: one(teas, {
    fields: [teaLogs.teaId],
    references: [teas.id],
  }),
}));

export const brewingGuidesRelations = relations(brewingGuides, ({ one }) => ({
  tea: one(teas, {
    fields: [brewingGuides.teaId],
    references: [teas.id],
  }),
  author: one(users, {
    fields: [brewingGuides.userId],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  tea: one(teas, {
    fields: [reviews.teaId],
    references: [teas.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, emailVerified: true });
export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({ id: true, createdAt: true, used: true });
export const insertTeaSchema = createInsertSchema(teas).omit({ id: true, createdAt: true, averageScore: true, createdById: true, isCustom: true });
export const insertTeaLogSchema = createInsertSchema(teaLogs).omit({ id: true, lastBrewedAt: true, userId: true });
export const insertGuideSchema = createInsertSchema(brewingGuides).omit({ id: true, createdAt: true, userId: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true, userId: true });
export const insertHeroPhraseSchema = createInsertSchema(heroPhrases).omit({ id: true });
export const insertTeaTypeSchema = createInsertSchema(teaTypes).omit({ id: true });
export const insertFooterLinkSchema = createInsertSchema(footerLinks).omit({ id: true });
export const insertPageSchema = createInsertSchema(pages).omit({ id: true, updatedAt: true });
export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({ id: true });

// === TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
export type Tea = typeof teas.$inferSelect;
export type InsertTea = z.infer<typeof insertTeaSchema>;
export type TeaLog = typeof teaLogs.$inferSelect;
export type InsertTeaLog = z.infer<typeof insertTeaLogSchema>;
export type Guide = typeof brewingGuides.$inferSelect;
export type InsertGuide = z.infer<typeof insertGuideSchema>;
export type HeroPhrase = typeof heroPhrases.$inferSelect;
export type InsertHeroPhrase = z.infer<typeof insertHeroPhraseSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type TeaType = typeof teaTypes.$inferSelect;
export type InsertTeaType = z.infer<typeof insertTeaTypeSchema>;
export type FooterLink = typeof footerLinks.$inferSelect;
export type InsertFooterLink = z.infer<typeof insertFooterLinkSchema>;
export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
