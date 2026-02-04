import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, seedAdmin } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up authentication (passport)
  setupAuth(app);
  
  // Seed admin user
  await seedAdmin();

  // === Teas ===
  app.get(api.teas.list.path, async (req, res) => {
    const teas = await storage.getTeas();
    res.json(teas);
  });

  app.get(api.teas.get.path, async (req, res) => {
    const tea = await storage.getTea(Number(req.params.id));
    if (!tea) {
      return res.status(404).json({ message: "Tea not found" });
    }
    res.json(tea);
  });

  app.post(api.teas.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const input = api.teas.create.input.parse(req.body);
      // User must be at least a user, but maybe we restrict creation? 
      // User asked: "people... should be also able to score it" - implies people add teas?
      // "create an entry for an tea... people should pe also able to score it"
      // Let's allow any logged in user to add a tea for now.
      const tea = await storage.createTea({ ...input, createdById: req.user.id });
      res.status(201).json(tea);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        throw err;
      }
    }
  });

  // === Logs (My List) ===
  app.get(api.logs.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const logs = await storage.getTeaLogs(req.user.id);
    res.json(logs);
  });

  app.post(api.logs.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const logUpdateSchema = api.logs.update.input.omit({ userId: true });
    const input = logUpdateSchema.parse(req.body);
    const log = await storage.upsertTeaLog({ ...input, userId: req.user.id });
    res.json(log);
  });

  // === Guides ===
  app.get(api.guides.list.path, async (req, res) => {
    const guides = await storage.getGuides(Number(req.params.teaId));
    res.json(guides);
  });

  app.post(api.guides.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.guides.create.input.parse(req.body);
    const guide = await storage.createGuide({ ...input, userId: req.user.id });
    res.status(201).json(guide);
  });

  // === Reviews ===
  app.get(api.reviews.list.path, async (req, res) => {
    const reviews = await storage.getReviews(Number(req.params.teaId));
    res.json(reviews);
  });

  app.post(api.reviews.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const input = api.reviews.create.input.parse(req.body);
    const review = await storage.createReview({ ...input, userId: req.user.id });
    res.status(201).json(review);
  });

  // === Admin ===
  app.get(api.admin.getUsers.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.sendStatus(403);
    const users = await storage.getUsers();
    res.json(users);
  });

  app.patch(api.admin.updateRole.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.sendStatus(403);
    const input = api.admin.updateRole.input.parse(req.body);
    const user = await storage.updateUserRole(Number(req.params.id), input.role);
    res.json(user);
  });

  return httpServer;
}
