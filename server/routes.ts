import type { Express } from "express";
import { type Server } from "http";
import { setupAuth, seedAdmin } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { type User } from "@shared/schema";

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

  app.patch(api.teas.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin' && user.role !== 'mod') return res.sendStatus(403);
    
    try {
      const input = api.teas.update.input.parse(req.body);
      const tea = await storage.updateTea(Number(req.params.id), input);
      res.json(tea);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        throw err;
      }
    }
  });

  app.post(api.teas.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    
    try {
      const input = api.teas.create.input.parse(req.body);
      const tea = await storage.createTea({ ...input, createdById: user.id });
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
    const user = req.user as User;
    const logs = await storage.getTeaLogs(user.id);
    res.json(logs);
  });

  app.post(api.logs.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    
    const existingLog = await storage.getTeaLog(user.id, req.body.teaId);
    
    const isUpdate = req.body.timerSettings || req.body.incrementBrew || req.body.personalScore || 
                     (req.body.status && existingLog);
    
    if (!isUpdate && existingLog) {
      return res.status(400).json({ message: "This tea is already in your list." });
    }

    const input = api.logs.update.input.parse(req.body);
    const log = await storage.upsertTeaLog({ ...input, userId: user.id });
    res.json(log);
  });

  app.delete(api.logs.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    const teaId = Number(req.params.teaId);
    
    const existingLog = await storage.getTeaLog(user.id, teaId);
    if (!existingLog) {
      return res.status(404).json({ message: "Tea log not found." });
    }

    await storage.deleteTeaLog(user.id, teaId);
    res.sendStatus(200);
  });

  // === Guides ===
  app.get(api.guides.list.path, async (req, res) => {
    const guides = await storage.getGuides(Number(req.params.teaId));
    res.json(guides);
  });

  app.post(api.guides.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    const input = api.guides.create.input.parse(req.body);
    const guide = await storage.createGuide({ ...input, userId: user.id });
    res.status(201).json(guide);
  });

  // === Reviews ===
  app.get(api.reviews.list.path, async (req, res) => {
    const reviews = await storage.getReviews(Number(req.params.teaId));
    res.json(reviews);
  });

  app.post(api.reviews.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    const input = api.reviews.create.input.parse(req.body);
    const review = await storage.createReview({ ...input, userId: user.id });
    res.status(201).json(review);
  });

  // === Hero Phrases ===
  app.get(api.heroPhrases.list.path, async (req, res) => {
    const phrases = await storage.getHeroPhrases();
    res.json(phrases);
  });

  app.post(api.heroPhrases.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin' && user.role !== 'mod') return res.sendStatus(403);
    const input = api.heroPhrases.create.input.parse(req.body);
    const phrase = await storage.createHeroPhrase(input);
    res.status(201).json(phrase);
  });

  app.patch(api.heroPhrases.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin' && user.role !== 'mod') return res.sendStatus(403);
    const input = api.heroPhrases.update.input.parse(req.body);
    const phrase = await storage.updateHeroPhrase(Number(req.params.id), input);
    res.json(phrase);
  });

  app.delete(api.heroPhrases.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin' && user.role !== 'mod') return res.sendStatus(403);
    await storage.deleteHeroPhrase(Number(req.params.id));
    res.sendStatus(200);
  });

  // === Admin ===
  app.get(api.admin.getUsers.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const users = await storage.getUsers();
    res.json(users);
  });

  app.patch(api.admin.updateRole.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const input = api.admin.updateRole.input.parse(req.body);
    const updatedUser = await storage.updateUserRole(Number(req.params.id), input.role);
    res.json(updatedUser);
  });

  return httpServer;
}
