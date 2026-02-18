import type { Express } from "express";
import { type Server } from "http";
import { setupAuth, seedAdmin } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { type User } from "@shared/schema";
import { seedProductionData } from "./seed-production";

function findTeaType(types: any[], teaType: string) {
  const lower = teaType.toLowerCase();
  return types.find(t => t.name.toLowerCase() === lower) ||
    types.find(t => t.name.toLowerCase().replace(/\s*tea$/i, '') === lower) ||
    types.find(t => lower.startsWith(t.name.toLowerCase())) ||
    types.find(t => t.name.toLowerCase().startsWith(lower));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up authentication (passport)
  setupAuth(app);
  
  // Seed admin user
  try {
    await seedAdmin();
  } catch (err) {
    console.error("Failed to seed admin:", err);
  }
  
  // Seed production data if empty
  try {
    await seedProductionData();
  } catch (err) {
    console.error("Failed to seed production data:", err);
  }

  // Seed collection phrases
  try {
    await storage.seedCollectionPhrases();
  } catch (err) {
    console.error("Failed to seed collection phrases:", err);
  }

  // Seed default scoring system
  try {
    await storage.seedDefaultScoringSystem();
  } catch (err) {
    console.error("Failed to seed default scoring system:", err);
  }

  // === Browse Teas ===
  app.get('/api/browse-teas', async (req, res) => {
    try {
      const user = req.isAuthenticated() ? req.user as User : undefined;
      const sort = (req.query.sort as string) || 'latest';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 36;
      const customOnly = req.query.customOnly === 'true';
      const typesParam = req.query.types as string;
      const types = typesParam ? typesParam.split(',').filter(Boolean) : undefined;

      const result = await storage.browseTeas({
        userId: user?.id,
        customOnly,
        sort,
        types,
        page,
        limit,
      });

      const teaTypes = await storage.getTeaTypes();
      const teasWithColors = result.teas.map(tea => {
        const tt = findTeaType(teaTypes, tea.type);
        return {
          ...tea,
          typeColorHue: tt?.colorHue ?? null,
          typeColorSaturation: tt?.colorSaturation ?? null,
          typeColorLightness: tt?.colorLightness ?? null,
        };
      });

      res.json({ teas: teasWithColors, total: result.total, page, limit });
    } catch (err) {
      console.error("Browse teas error:", err);
      res.status(500).json({ message: "Failed to browse teas" });
    }
  });

  // === Teas ===
  app.get(api.teas.list.path, async (req, res) => {
    const user = req.isAuthenticated() ? req.user as User : undefined;
    const teas = await storage.getTeas(user?.id);
    const types = await storage.getTeaTypes();
    const result = teas.map(tea => {
      const tt = findTeaType(types, tea.type);
      return {
        ...tea,
        typeColorHue: tt?.colorHue ?? null,
        typeColorSaturation: tt?.colorSaturation ?? null,
        typeColorLightness: tt?.colorLightness ?? null,
      };
    });
    res.json(result);
  });

  app.get(api.teas.get.path, async (req, res) => {
    const tea = await storage.getTeaBySlug(req.params.slug);
    if (!tea) {
      return res.status(404).json({ message: "Tea not found" });
    }
    if (tea.isCustom) {
      const currentUser = req.isAuthenticated() ? req.user as User : undefined;
      if (!currentUser || tea.createdById !== currentUser.id) {
        return res.status(404).json({ message: "Tea not found" });
      }
    }
    const types = await storage.getTeaTypes();
    const tt = findTeaType(types, tea.type);
    res.json({
      ...tea,
      typeColorHue: tt?.colorHue ?? null,
      typeColorSaturation: tt?.colorSaturation ?? null,
      typeColorLightness: tt?.colorLightness ?? null,
    });
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
      const { isCustom, ...rest } = req.body;
      const input = api.teas.create.input.parse(rest);
      const baseSlug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      const slug = isCustom
        ? baseSlug + '-' + Math.floor(Math.random() * 900000000000 + 100000000000)
        : baseSlug;
      const tea = await storage.createTea({ ...input, createdById: user.id, isCustom: !!isCustom, slug });
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
    const types = await storage.getTeaTypes();
    const result = logs.map(log => {
      const tt = log.tea ? findTeaType(types, log.tea.type) : undefined;
      return {
        ...log,
        tea: log.tea ? {
          ...log.tea,
          typeColorHue: tt?.colorHue ?? null,
          typeColorSaturation: tt?.colorSaturation ?? null,
          typeColorLightness: tt?.colorLightness ?? null,
        } : log.tea,
      };
    });
    res.json(result);
  });

  app.get(api.logs.publicList.path, async (req, res) => {
    const username = req.params.username;
    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(404).json({ message: "User not found" });

    const logs = await storage.getTeaLogs(user.id);
    const types = await storage.getTeaTypes();
    const result = logs.map(log => {
      const tt = log.tea ? findTeaType(types, log.tea.type) : undefined;
      return {
        ...log,
        tea: log.tea ? {
          ...log.tea,
          typeColorHue: tt?.colorHue ?? null,
          typeColorSaturation: tt?.colorSaturation ?? null,
          typeColorLightness: tt?.colorLightness ?? null,
        } : log.tea,
      };
    });
    res.json(result);
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

  // === Tea Types ===
  app.get(api.teaTypes.list.path, async (req, res) => {
    const types = await storage.getTeaTypes();
    res.json(types);
  });

  app.post(api.teaTypes.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const input = api.teaTypes.create.input.parse(req.body);
    const teaType = await storage.createTeaType(input);
    res.status(201).json(teaType);
  });

  app.patch(api.teaTypes.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const input = api.teaTypes.update.input.parse(req.body);
    const teaType = await storage.updateTeaType(Number(req.params.id), input);
    res.json(teaType);
  });

  app.delete(api.teaTypes.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    await storage.deleteTeaType(Number(req.params.id));
    res.sendStatus(200);
  });

  // === Site Settings ===
  app.get(api.siteSettings.get.path, async (req, res) => {
    const settings = await storage.getSiteSettings();
    res.json(settings);
  });

  app.patch(api.siteSettings.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const input = api.siteSettings.update.input.parse(req.body);
    const settings = await storage.updateSiteSettings(input);
    res.json(settings);
  });

  // === Footer Links ===
  app.get(api.footerLinks.list.path, async (req, res) => {
    const links = await storage.getFooterLinks();
    res.json(links);
  });

  app.post(api.footerLinks.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const input = api.footerLinks.create.input.parse(req.body);
    const existingPage = await storage.getPageBySlug(input.pageSlug);
    if (!existingPage) {
      await storage.createPage({
        slug: input.pageSlug,
        title: input.label,
        content: "",
      });
    }
    const link = await storage.createFooterLink(input);
    res.status(201).json(link);
  });

  app.patch(api.footerLinks.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const input = api.footerLinks.update.input.parse(req.body);
    const link = await storage.updateFooterLink(Number(req.params.id), input);
    res.json(link);
  });

  app.delete(api.footerLinks.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const links = await storage.getFooterLinks();
    const link = links.find(l => l.id === Number(req.params.id));
    await storage.deleteFooterLink(Number(req.params.id));
    if (link) {
      const otherLinksToSameSlug = links.filter(l => l.id !== link.id && l.pageSlug === link.pageSlug);
      if (otherLinksToSameSlug.length === 0) {
        try { await storage.deletePage(link.pageSlug); } catch (_) {}
      }
    }
    res.sendStatus(200);
  });

  // === Pages ===
  app.get(api.pages.list.path, async (req, res) => {
    const allPages = await storage.getPages();
    res.json(allPages);
  });

  app.get(api.pages.get.path, async (req, res) => {
    const page = await storage.getPageBySlug(String(req.params.slug));
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json(page);
  });

  app.post(api.pages.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const input = api.pages.create.input.parse(req.body);
    const page = await storage.createPage(input);
    res.status(201).json(page);
  });

  app.patch(api.pages.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const input = api.pages.update.input.parse(req.body);
    const page = await storage.updatePage(String(req.params.slug), input);
    res.json(page);
  });

  app.delete(api.pages.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    await storage.deletePage(String(req.params.slug));
    res.sendStatus(200);
  });

  // === Collection Phrases ===
  app.get(api.collectionPhrases.list.path, async (req, res) => {
    const phrases = await storage.getCollectionPhrases();
    res.json(phrases);
  });

  app.patch(api.collectionPhrases.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const input = api.collectionPhrases.update.input.parse(req.body);
    const { ownerStatus, visitorStatus, ...data } = input;
    const phrase = await storage.upsertCollectionPhrase(ownerStatus, visitorStatus, data);
    res.json(phrase);
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

  // === Scoring Systems ===
  app.get(api.scoringSystems.list.path, async (req, res) => {
    const systems = await storage.getScoringSystems();
    res.json(systems);
  });

  app.get("/api/scoring-systems/:id/definitions", async (req, res) => {
    const definitions = await storage.getScoreDefinitions(Number(req.params.id));
    res.json(definitions);
  });

  app.put("/api/scoring-systems/:id/definitions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const definitions = z.array(insertScoreDefinitionSchema).parse(req.body);
    await storage.updateScoreDefinitions(Number(req.params.id), definitions);
    res.sendStatus(200);
  });

  app.post(api.scoringSystems.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const input = api.scoringSystems.create.input.parse(req.body);
    const system = await storage.createScoringSystem(input);
    res.status(201).json(system);
  });

  app.patch(api.scoringSystems.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    const input = api.scoringSystems.update.input.parse(req.body);
    const system = await storage.updateScoringSystem(Number(req.params.id), input);
    res.json(system);
  });

  app.delete(api.scoringSystems.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    if (user.role !== 'admin') return res.sendStatus(403);
    await storage.deleteScoringSystem(Number(req.params.id));
    res.sendStatus(200);
  });

  // === Tea Scores ===
  app.post(api.teaScores.upsert.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    const input = api.teaScores.upsert.input.parse(req.body);
    const score = await storage.upsertTeaScore(user.id, input);
    res.json(score);
  });

  app.get(api.teaScores.forTea.path, async (req, res) => {
    const teaId = Number(req.params.teaId);
    const user = req.isAuthenticated() ? req.user as User : undefined;
    const userScores = user ? await storage.getTeaScoresForUser(user.id, teaId) : [];
    const communityScores = await storage.getTeaScoresForTea(teaId);
    res.json({ userScores, communityScores });
  });

  app.get(api.teaScores.userScores.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    const scores = await storage.getUserScoresForTeas(user.id);
    res.json(scores);
  });

  // === User Preferences ===
  app.get(api.userPreferences.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    const pref = await storage.getUserPreference(user.id);
    res.json(pref || null);
  });

  app.patch(api.userPreferences.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as User;
    const input = api.userPreferences.update.input.parse(req.body);
    const pref = await storage.upsertUserPreference(user.id, input);
    res.json(pref);
  });

  return httpServer;
}
