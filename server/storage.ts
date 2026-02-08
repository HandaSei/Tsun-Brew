import { 
  users, teas, teaLogs, brewingGuides, reviews, teaAttributes,
  type User, type InsertUser, type Tea, type InsertTea, type TeaLog, type InsertTeaLog,
  type Guide, type InsertGuide, type Review, type InsertReview
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User & Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: string }): Promise<User>;
  getUsers(): Promise<User[]>; // For admin
  updateUserRole(id: number, role: string): Promise<User>;

  // Teas
  getTeas(): Promise<Tea[]>;
  getTea(id: number): Promise<(Tea & { attributes: any[] }) | undefined>;
  createTea(tea: InsertTea & { createdById: number, attributes?: { key: string, value: string }[] }): Promise<Tea>;
  updateTea(id: number, tea: Partial<InsertTea> & { attributes?: { key: string, value: string }[] }): Promise<Tea>;
  
  // Logs / My List
  getTeaLog(userId: number, teaId: number): Promise<TeaLog | undefined>;
  getTeaLogs(userId: number): Promise<(TeaLog & { tea: Tea })[]>;
  upsertTeaLog(log: InsertTeaLog & { userId: number, incrementBrew?: boolean }): Promise<TeaLog>;

  // Guides
  getGuides(teaId: number): Promise<(Guide & { author: User })[]>;
  createGuide(guide: InsertGuide & { userId: number }): Promise<Guide>;

  // Reviews
  getReviews(teaId: number): Promise<(Review & { user: User })[]>;
  createReview(review: InsertReview & { userId: number }): Promise<Review>;
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

  async createUser(user: InsertUser & { role?: string }): Promise<User> {
    const [newUser] = await db.insert(users).values(user as any).returning();
    return newUser;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.id);
  }

  async updateUserRole(id: number, role: string): Promise<User> {
    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return updated;
  }

  async getTeas(): Promise<Tea[]> {
    return await db.select().from(teas).orderBy(desc(teas.createdAt));
  }

  async getTea(id: number): Promise<(Tea & { attributes: any[] }) | undefined> {
    const [tea] = await db.select().from(teas).where(eq(teas.id, id));
    if (!tea) return undefined;

    const attributes = await db.select().from(teaAttributes).where(eq(teaAttributes.teaId, id));
    return { ...tea, attributes };
  }

  async createTea(tea: InsertTea & { createdById: number, attributes?: { key: string, value: string }[] }): Promise<Tea> {
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
}

export const storage = new DatabaseStorage();
