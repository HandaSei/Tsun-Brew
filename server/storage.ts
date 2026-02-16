import { 
  users, teas, teaLogs, brewingGuides, reviews, teaAttributes, heroPhrases, teaTypes, siteSettings, verificationCodes, footerLinks, pages, collectionPhrases,
  scoringSystems, teaScores, userPreferences,
  type User, type InsertUser, type Tea, type InsertTea, type TeaLog, type InsertTeaLog,
  type Guide, type InsertGuide, type Review, type InsertReview,
  type HeroPhrase, type InsertHeroPhrase,
  type TeaType, type InsertTeaType,
  type FooterLink, type InsertFooterLink,
  type Page, type InsertPage,
  type SiteSettings, type InsertSiteSettings,
  type VerificationCode, type InsertVerificationCode,
  type CollectionPhrase, type InsertCollectionPhrase,
  type ScoringSystem, type InsertScoringSystem,
  type TeaScore, type InsertTeaScore,
  type UserPreference, type InsertUserPreference
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gt, or, avg, count, sql } from "drizzle-orm";

export interface IStorage {
  // User & Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: string }): Promise<User>;
  updateUserPassword(id: number, password: string, isTemporary?: boolean): Promise<User>;
  setEmailVerified(id: number): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUserRole(id: number, role: string): Promise<User>;

  // Verification Codes
  createVerificationCode(code: InsertVerificationCode): Promise<VerificationCode>;
  getValidVerificationCode(email: string, code: string, type: string): Promise<VerificationCode | undefined>;
  markVerificationCodeUsed(id: number): Promise<void>;
  deleteVerificationCodesForEmail(email: string, type: string): Promise<void>;

  // Teas
  getTeas(userId?: number): Promise<Tea[]>;
  getTea(id: number): Promise<(Tea & { attributes: any[] }) | undefined>;
  getTeaBySlug(slug: string): Promise<(Tea & { attributes: any[] }) | undefined>;
  createTea(tea: InsertTea & { createdById: number, isCustom?: boolean, slug: string, attributes?: { key: string, value: string }[] }): Promise<Tea>;
  updateTea(id: number, tea: Partial<InsertTea> & { attributes?: { key: string, value: string }[] }): Promise<Tea>;
  
  // Logs / My List
  getTeaLog(userId: number, teaId: number): Promise<TeaLog | undefined>;
  getTeaLogs(userId: number): Promise<(TeaLog & { tea: Tea })[]>;
  upsertTeaLog(log: InsertTeaLog & { userId: number, incrementBrew?: boolean }): Promise<TeaLog>;
  deleteTeaLog(userId: number, teaId: number): Promise<void>;

  // Guides
  getGuides(teaId: number): Promise<(Guide & { author: User })[]>;
  createGuide(guide: InsertGuide & { userId: number }): Promise<Guide>;

  // Reviews
  getReviews(teaId: number): Promise<(Review & { user: User })[]>;
  createReview(review: InsertReview & { userId: number }): Promise<Review>;

  // Hero Phrases
  getHeroPhrases(): Promise<HeroPhrase[]>;
  createHeroPhrase(phrase: InsertHeroPhrase): Promise<HeroPhrase>;
  updateHeroPhrase(id: number, phrase: Partial<InsertHeroPhrase>): Promise<HeroPhrase>;
  deleteHeroPhrase(id: number): Promise<void>;

  // Tea Types
  getTeaTypes(): Promise<TeaType[]>;
  createTeaType(teaType: InsertTeaType): Promise<TeaType>;
  updateTeaType(id: number, teaType: Partial<InsertTeaType>): Promise<TeaType>;
  deleteTeaType(id: number): Promise<void>;

  // Footer Links
  getFooterLinks(): Promise<FooterLink[]>;
  createFooterLink(link: InsertFooterLink): Promise<FooterLink>;
  updateFooterLink(id: number, link: Partial<InsertFooterLink>): Promise<FooterLink>;
  deleteFooterLink(id: number): Promise<void>;

  // Pages
  getPages(): Promise<Page[]>;
  getPageBySlug(slug: string): Promise<Page | undefined>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(slug: string, page: Partial<InsertPage>): Promise<Page>;
  deletePage(slug: string): Promise<void>;

  // Site Settings
  getSiteSettings(): Promise<SiteSettings>;
  updateSiteSettings(settings: Partial<InsertSiteSettings>): Promise<SiteSettings>;

  // Collection Phrases
  getCollectionPhrases(): Promise<CollectionPhrase[]>;
  upsertCollectionPhrase(ownerStatus: string, visitorStatus: string, data: Partial<InsertCollectionPhrase>): Promise<CollectionPhrase>;
  seedCollectionPhrases(): Promise<void>;

  // Scoring Systems
  getScoringSystems(): Promise<ScoringSystem[]>;
  getScoringSystem(id: number): Promise<ScoringSystem | undefined>;
  createScoringSystem(system: InsertScoringSystem): Promise<ScoringSystem>;
  updateScoringSystem(id: number, system: Partial<InsertScoringSystem>): Promise<ScoringSystem>;
  deleteScoringSystem(id: number): Promise<void>;
  seedDefaultScoringSystem(): Promise<void>;

  // Tea Scores
  upsertTeaScore(userId: number, data: InsertTeaScore): Promise<TeaScore>;
  getTeaScoresForUser(userId: number, teaId: number): Promise<TeaScore[]>;
  getTeaScoresForTea(teaId: number): Promise<{ scoringSystemId: number; avgScore: number; voteCount: number }[]>;
  getUserScoresForTeas(userId: number): Promise<TeaScore[]>;

  // User Preferences
  getUserPreference(userId: number): Promise<UserPreference | undefined>;
  upsertUserPreference(userId: number, data: InsertUserPreference): Promise<UserPreference>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser & { role?: string }): Promise<User> {
    const [newUser] = await db.insert(users).values(user as any).returning();
    return newUser;
  }

  async updateUserPassword(id: number, password: string, isTemporary: boolean = false): Promise<User> {
    const [updated] = await db.update(users).set({ password, passwordIsTemporary: isTemporary }).where(eq(users.id, id)).returning();
    return updated;
  }

  async setEmailVerified(id: number): Promise<User> {
    const [updated] = await db.update(users).set({ emailVerified: true }).where(eq(users.id, id)).returning();
    return updated;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.id);
  }

  async updateUserRole(id: number, role: string): Promise<User> {
    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return updated;
  }

  async createVerificationCode(code: InsertVerificationCode): Promise<VerificationCode> {
    const [created] = await db.insert(verificationCodes).values(code as any).returning();
    return created;
  }

  async getValidVerificationCode(email: string, code: string, type: string): Promise<VerificationCode | undefined> {
    const [found] = await db.select().from(verificationCodes).where(
      and(
        eq(verificationCodes.email, email),
        eq(verificationCodes.code, code),
        eq(verificationCodes.type, type),
        eq(verificationCodes.used, false),
        gt(verificationCodes.expiresAt, new Date())
      )
    );
    return found;
  }

  async markVerificationCodeUsed(id: number): Promise<void> {
    await db.update(verificationCodes).set({ used: true }).where(eq(verificationCodes.id, id));
  }

  async deleteVerificationCodesForEmail(email: string, type: string): Promise<void> {
    await db.delete(verificationCodes).where(
      and(eq(verificationCodes.email, email), eq(verificationCodes.type, type))
    );
  }

  async getTeas(userId?: number): Promise<Tea[]> {
    if (userId) {
      return await db.select().from(teas)
        .where(
          or(
            eq(teas.isCustom, false),
            and(eq(teas.isCustom, true), eq(teas.createdById, userId))
          )
        )
        .orderBy(desc(teas.createdAt));
    }
    return await db.select().from(teas)
      .where(eq(teas.isCustom, false))
      .orderBy(desc(teas.createdAt));
  }

  async getTea(id: number): Promise<(Tea & { attributes: any[] }) | undefined> {
    const [tea] = await db.select().from(teas).where(eq(teas.id, id));
    if (!tea) return undefined;

    const attributes = await db.select().from(teaAttributes).where(eq(teaAttributes.teaId, id));
    return { ...tea, attributes };
  }

  async getTeaBySlug(slug: string): Promise<(Tea & { attributes: any[] }) | undefined> {
    const [tea] = await db.select().from(teas).where(eq(teas.slug, slug));
    if (!tea) return undefined;

    const attributes = await db.select().from(teaAttributes).where(eq(teaAttributes.teaId, tea.id));
    return { ...tea, attributes };
  }

  async createTea(tea: InsertTea & { createdById: number, isCustom?: boolean, slug: string, attributes?: { key: string, value: string }[] }): Promise<Tea> {
    const { attributes, ...teaData } = tea;
    const [newTea] = await db.insert(teas).values(teaData as any).returning();

    if (attributes && attributes.length > 0) {
      await db.insert(teaAttributes).values(
        attributes.map(attr => ({ ...attr, teaId: newTea.id }))
      );
    }

    return newTea;
  }

  async updateTea(id: number, tea: Partial<InsertTea> & { attributes?: { key: string, value: string }[] }): Promise<Tea> {
    const { attributes, ...teaData } = tea;
    
    const [updatedTea] = await db.update(teas)
      .set(teaData as any)
      .where(eq(teas.id, id))
      .returning();

    if (attributes) {
      // Simple approach: delete all and re-insert
      await db.delete(teaAttributes).where(eq(teaAttributes.teaId, id));
      if (attributes.length > 0) {
        await db.insert(teaAttributes).values(
          attributes.map(attr => ({ ...attr, teaId: id }))
        );
      }
    }

    return updatedTea;
  }

  async getTeaLog(userId: number, teaId: number): Promise<TeaLog | undefined> {
    const [log] = await db.select().from(teaLogs).where(
      and(eq(teaLogs.userId, userId), eq(teaLogs.teaId, teaId))
    );
    return log;
  }

  async getTeaLogs(userId: number): Promise<(TeaLog & { tea: Tea })[]> {
    const results = await db.select({
      log: teaLogs,
      tea: teas,
    })
    .from(teaLogs)
    .innerJoin(teas, eq(teaLogs.teaId, teas.id))
    .where(eq(teaLogs.userId, userId))
    .orderBy(desc(teaLogs.lastBrewedAt));

    return results.map(r => ({ ...r.log, tea: r.tea }));
  }

  async upsertTeaLog(log: InsertTeaLog & { userId: number, incrementBrew?: boolean }): Promise<TeaLog> {
    const existing = await this.getTeaLog(log.userId, log.teaId);
    
    if (existing) {
      const updates: any = {};
      if (log.status) updates.status = log.status;
      if (log.personalScore) updates.personalScore = log.personalScore;
      if (log.currentInfusion !== undefined) updates.currentInfusion = log.currentInfusion;
      if (log.timerSettings) updates.timerSettings = log.timerSettings;

      if (log.incrementBrew) {
        updates.totalBrews = (existing.totalBrews || 0) + 1;
        updates.lastBrewedAt = new Date();
      }
      
      const [updated] = await db.update(teaLogs)
        .set(updates)
        .where(eq(teaLogs.id, existing.id))
        .returning();
      
      if (!updated) throw new Error("Failed to update tea log");
      return updated;
    } else {
      const [created] = await db.insert(teaLogs).values({
        ...log,
        totalBrews: log.incrementBrew ? 1 : 0,
        lastBrewedAt: log.incrementBrew ? new Date() : null
      } as any).returning();
      
      if (!created) throw new Error("Failed to create tea log");
      return created;
    }
  }

  async deleteTeaLog(userId: number, teaId: number): Promise<void> {
    await db.delete(teaLogs).where(
      and(eq(teaLogs.userId, userId), eq(teaLogs.teaId, teaId))
    );
  }

  async getGuides(teaId: number): Promise<(Guide & { author: User })[]> {
    const results = await db.select({
      guide: brewingGuides,
      author: users,
    })
    .from(brewingGuides)
    .innerJoin(users, eq(brewingGuides.userId, users.id))
    .where(eq(brewingGuides.teaId, teaId))
    .orderBy(desc(brewingGuides.isOfficial));

    return results.map(r => ({ ...r.guide, author: r.author }));
  }

  async createGuide(guide: InsertGuide & { userId: number }): Promise<Guide> {
    const [newGuide] = await db.insert(brewingGuides).values(guide as any).returning();
    return newGuide;
  }

  async getReviews(teaId: number): Promise<(Review & { user: User })[]> {
    const results = await db.select({
      review: reviews,
      user: users,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.teaId, teaId))
    .orderBy(desc(reviews.createdAt));

    return results.map(r => ({ ...r.review, user: r.user }));
  }

  async createReview(review: InsertReview & { userId: number }): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review as any).returning();
    return newReview;
  }

  async getHeroPhrases(): Promise<HeroPhrase[]> {
    return await db.select().from(heroPhrases).orderBy(heroPhrases.sortOrder);
  }

  async createHeroPhrase(phrase: InsertHeroPhrase): Promise<HeroPhrase> {
    const [newPhrase] = await db.insert(heroPhrases).values(phrase as any).returning();
    return newPhrase;
  }

  async updateHeroPhrase(id: number, phrase: Partial<InsertHeroPhrase>): Promise<HeroPhrase> {
    const [updated] = await db.update(heroPhrases).set(phrase as any).where(eq(heroPhrases.id, id)).returning();
    return updated;
  }

  async deleteHeroPhrase(id: number): Promise<void> {
    await db.delete(heroPhrases).where(eq(heroPhrases.id, id));
  }

  async getTeaTypes(): Promise<TeaType[]> {
    return await db.select().from(teaTypes).orderBy(teaTypes.sortOrder);
  }

  async createTeaType(teaType: InsertTeaType): Promise<TeaType> {
    const [newType] = await db.insert(teaTypes).values(teaType as any).returning();
    return newType;
  }

  async updateTeaType(id: number, teaType: Partial<InsertTeaType>): Promise<TeaType> {
    const [updated] = await db.update(teaTypes).set(teaType as any).where(eq(teaTypes.id, id)).returning();
    return updated;
  }

  async deleteTeaType(id: number): Promise<void> {
    await db.delete(teaTypes).where(eq(teaTypes.id, id));
  }

  async getSiteSettings(): Promise<SiteSettings> {
    const [settings] = await db.select().from(siteSettings);
    if (!settings) {
      const [created] = await db.insert(siteSettings).values({
        siteName: "Tsun Brew",
        showSiteName: true,
        statusTag: "Open Alpha Build",
      } as any).returning();
      return created;
    }
    return settings;
  }

  async updateSiteSettings(settings: Partial<InsertSiteSettings>): Promise<SiteSettings> {
    const existing = await this.getSiteSettings();
    const [updated] = await db.update(siteSettings).set(settings as any).where(eq(siteSettings.id, existing.id)).returning();
    return updated;
  }

  async getFooterLinks(): Promise<FooterLink[]> {
    return db.select().from(footerLinks).orderBy(footerLinks.sortOrder);
  }

  async createFooterLink(link: InsertFooterLink): Promise<FooterLink> {
    const [created] = await db.insert(footerLinks).values(link).returning();
    return created;
  }

  async updateFooterLink(id: number, link: Partial<InsertFooterLink>): Promise<FooterLink> {
    const [updated] = await db.update(footerLinks).set(link).where(eq(footerLinks.id, id)).returning();
    return updated;
  }

  async deleteFooterLink(id: number): Promise<void> {
    await db.delete(footerLinks).where(eq(footerLinks.id, id));
  }

  async getPages(): Promise<Page[]> {
    return db.select().from(pages);
  }

  async getPageBySlug(slug: string): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(eq(pages.slug, slug));
    return page;
  }

  async createPage(page: InsertPage): Promise<Page> {
    const [created] = await db.insert(pages).values(page).returning();
    return created;
  }

  async updatePage(slug: string, page: Partial<InsertPage>): Promise<Page> {
    const [updated] = await db.update(pages).set({ ...page, updatedAt: new Date() } as any).where(eq(pages.slug, slug)).returning();
    return updated;
  }

  async deletePage(slug: string): Promise<void> {
    await db.delete(pages).where(eq(pages.slug, slug));
  }

  async getCollectionPhrases(): Promise<CollectionPhrase[]> {
    return db.select().from(collectionPhrases);
  }

  async upsertCollectionPhrase(ownerStatus: string, visitorStatus: string, data: Partial<InsertCollectionPhrase>): Promise<CollectionPhrase> {
    const [existing] = await db.select().from(collectionPhrases).where(
      and(eq(collectionPhrases.ownerStatus, ownerStatus), eq(collectionPhrases.visitorStatus, visitorStatus))
    );
    if (existing) {
      const [updated] = await db.update(collectionPhrases).set(data as any).where(eq(collectionPhrases.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(collectionPhrases).values({
        ownerStatus,
        visitorStatus,
        phrase: data.phrase || "",
        colorHue: data.colorHue ?? 120,
        colorSaturation: data.colorSaturation ?? 20,
        colorLightness: data.colorLightness ?? 40,
        icon: data.icon || "CheckCircle",
      } as any).returning();
      return created;
    }
  }

  async seedCollectionPhrases(): Promise<void> {
    const existing = await db.select().from(collectionPhrases);
    if (existing.length > 0) return;

    const defaults: InsertCollectionPhrase[] = [
      { ownerStatus: "drinking", visitorStatus: "drinking", phrase: "I had it first!", colorHue: 142, colorSaturation: 60, colorLightness: 40, icon: "CheckCircle" },
      { ownerStatus: "want_to_try", visitorStatus: "drinking", phrase: "Eyeing mine?", colorHue: 45, colorSaturation: 70, colorLightness: 45, icon: "Eye" },
      { ownerStatus: "not_rebuying", visitorStatus: "drinking", phrase: "I knew you couldn't handle it.", colorHue: 0, colorSaturation: 60, colorLightness: 45, icon: "Flame" },
      { ownerStatus: "want_to_try", visitorStatus: "want_to_try", phrase: "Get in line.", colorHue: 210, colorSaturation: 55, colorLightness: 45, icon: "Users" },
      { ownerStatus: "want_to_try", visitorStatus: "not_rebuying", phrase: "Go ahead. Waste your time.", colorHue: 270, colorSaturation: 50, colorLightness: 45, icon: "Skull" },
      { ownerStatus: "not_rebuying", visitorStatus: "not_rebuying", phrase: "Finally. Something we agree on.", colorHue: 180, colorSaturation: 50, colorLightness: 40, icon: "Handshake" },
      { ownerStatus: "drinking", visitorStatus: "want_to_try", phrase: "Join the club!", colorHue: 120, colorSaturation: 20, colorLightness: 40, icon: "CheckCircle" },
      { ownerStatus: "drinking", visitorStatus: "not_rebuying", phrase: "We clearly don't steep the same.", colorHue: 330, colorSaturation: 55, colorLightness: 45, icon: "Ban" },
      { ownerStatus: "not_rebuying", visitorStatus: "want_to_try", phrase: "Save yourself while you can.", colorHue: 120, colorSaturation: 20, colorLightness: 40, icon: "CheckCircle" },
    ];

    for (const phrase of defaults) {
      await db.insert(collectionPhrases).values(phrase as any);
    }
  }

  // Scoring Systems
  async getScoringSystems(): Promise<(ScoringSystem & { definitions: ScoreDefinition[] })[]> {
    const systems = await db.select().from(scoringSystems).orderBy(scoringSystems.sortOrder);
    const results = [];
    for (const system of systems) {
      const definitions = await db.select().from(scoreDefinitions).where(eq(scoreDefinitions.scoringSystemId, system.id)).orderBy(scoreDefinitions.scoreValue);
      results.push({ ...system, definitions });
    }
    return results;
  }

  async getScoringSystem(id: number): Promise<ScoringSystem | undefined> {
    const [system] = await db.select().from(scoringSystems).where(eq(scoringSystems.id, id));
    return system;
  }

  async createScoringSystem(system: InsertScoringSystem & { definitions?: InsertScoreDefinition[] }): Promise<ScoringSystem> {
    const { definitions, ...systemData } = system;
    const [created] = await db.insert(scoringSystems).values(systemData as any).returning();
    if (definitions && definitions.length > 0) {
      await db.insert(scoreDefinitions).values(
        definitions.map(d => ({ ...d, scoringSystemId: created.id }))
      );
    }
    return created;
  }

  async updateScoringSystem(id: number, system: Partial<InsertScoringSystem> & { definitions?: InsertScoreDefinition[] }): Promise<ScoringSystem> {
    const { definitions, ...systemData } = system;
    const [updated] = await db.update(scoringSystems).set(systemData as any).where(eq(scoringSystems.id, id)).returning();
    
    if (definitions) {
      await db.delete(scoreDefinitions).where(eq(scoreDefinitions.scoringSystemId, id));
      if (definitions.length > 0) {
        await db.insert(scoreDefinitions).values(
          definitions.map(d => ({ ...d, scoringSystemId: id }))
        );
      }
    }
    return updated;
  }

  async deleteScoringSystem(id: number): Promise<void> {
    await db.delete(scoreDefinitions).where(eq(scoreDefinitions.scoringSystemId, id));
    await db.delete(teaScores).where(eq(teaScores.scoringSystemId, id));
    await db.delete(scoringSystems).where(eq(scoringSystems.id, id));
  }

  async getScoreDefinitions(systemId: number): Promise<ScoreDefinition[]> {
    return await db.select().from(scoreDefinitions).where(eq(scoreDefinitions.scoringSystemId, systemId)).orderBy(scoreDefinitions.scoreValue);
  }

  async updateScoreDefinitions(systemId: number, definitions: InsertScoreDefinition[]): Promise<void> {
    await db.delete(scoreDefinitions).where(eq(scoreDefinitions.scoringSystemId, systemId));
    if (definitions.length > 0) {
      await db.insert(scoreDefinitions).values(
        definitions.map(d => ({ ...d, scoringSystemId: systemId }))
      );
    }
  }

  async seedDefaultScoringSystem(): Promise<void> {
    const existing = await db.select().from(scoringSystems);
    if (existing.length > 0) return;
    const [system] = await db.insert(scoringSystems).values({
      name: "Classic (1-10)",
      maxScore: 10,
      sortOrder: 0,
      isActive: true,
    } as any).returning();

    const defs = Array.from({ length: 10 }, (_, i) => ({
      scoringSystemId: system.id,
      scoreValue: i + 1,
      label: `${i + 1}`,
      logoUrl: null
    }));
    await db.insert(scoreDefinitions).values(defs);
  }

  async upsertTeaScore(userId: number, data: InsertTeaScore): Promise<TeaScore> {
    const [existing] = await db.select().from(teaScores).where(
      and(
        eq(teaScores.userId, userId),
        eq(teaScores.teaId, data.teaId),
        eq(teaScores.scoringSystemId, data.scoringSystemId)
      )
    );
    if (existing) {
      const [updated] = await db.update(teaScores)
        .set({ score: data.score, updatedAt: new Date() })
        .where(eq(teaScores.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(teaScores).values({ ...data, userId } as any).returning();
    return created;
  }

  async getTeaScoresForUser(userId: number, teaId: number): Promise<TeaScore[]> {
    return await db.select().from(teaScores).where(
      and(eq(teaScores.userId, userId), eq(teaScores.teaId, teaId))
    );
  }

  async getTeaScoresForTea(teaId: number): Promise<{ scoringSystemId: number; avgScore: number; voteCount: number }[]> {
    const results = await db
      .select({
        scoringSystemId: teaScores.scoringSystemId,
        avgScore: sql<number>`round(avg(${teaScores.score})::numeric, 1)::float`,
        voteCount: sql<number>`count(*)::int`,
      })
      .from(teaScores)
      .where(eq(teaScores.teaId, teaId))
      .groupBy(teaScores.scoringSystemId);
    return results;
  }

  async getUserScoresForTeas(userId: number): Promise<TeaScore[]> {
    return await db.select().from(teaScores).where(eq(teaScores.userId, userId));
  }

  async getUserPreference(userId: number): Promise<UserPreference | undefined> {
    const [pref] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return pref;
  }

  async upsertUserPreference(userId: number, data: InsertUserPreference): Promise<UserPreference> {
    const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    if (existing) {
      const [updated] = await db.update(userPreferences).set(data as any).where(eq(userPreferences.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(userPreferences).values({ ...data, userId } as any).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
