import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // 'admin', 'mod', 'user'
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
  caffeineLevel: text("caffeine_level"), // 'None', 'Low', 'Medium', 'High'
  
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

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTeaSchema = createInsertSchema(teas).omit({ id: true, createdAt: true, averageScore: true, createdById: true });
export const insertTeaLogSchema = createInsertSchema(teaLogs).omit({ id: true, lastBrewedAt: true, userId: true });
export const insertGuideSchema = createInsertSchema(brewingGuides).omit({ id: true, createdAt: true, userId: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true, userId: true });

// === TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Tea = typeof teas.$inferSelect;
export type InsertTea = z.infer<typeof insertTeaSchema>;
export type TeaLog = typeof teaLogs.$inferSelect;
export type InsertTeaLog = z.infer<typeof insertTeaLogSchema>;
export type Guide = typeof brewingGuides.$inferSelect;
export type InsertGuide = z.infer<typeof insertGuideSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
