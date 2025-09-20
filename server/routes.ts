import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEndUserSchema, insertQuestionSchema, insertOfferSchema, insertResponseSchema } from "@shared/schema";
import { tuneApi } from "./services/tuneApi";
import { revenueTracker } from "./services/revenueTracker";
import { openaiService } from "./services/openaiService";
import { randomUUID } from "crypto";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/metrics', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get('/api/dashboard/top-offers', isAuthenticated, async (req, res) => {
    try {
      const topOffers = await storage.getTopOffers(5);
      res.json(topOffers);
    } catch (error) {
      console.error("Error fetching top offers:", error);
      res.status(500).json({ message: "Failed to fetch top offers" });
    }
  });

  app.get('/api/dashboard/recent-completions', isAuthenticated, async (req, res) => {
    try {
      const recentCompletions = await storage.getRecentCompletions(10);
      res.json(recentCompletions);
    } catch (error) {
      console.error("Error fetching recent completions:", error);
      res.status(500).json({ message: "Failed to fetch recent completions" });
    }
  });

  // End user registration and survey routes (public)
  app.post('/api/user/register', async (req, res) => {
    try {
      const userData = insertEndUserSchema.parse({
        ...req.body,
        sessionId: req.body.sessionId || randomUUID(),
        browserFingerprint: req.body.browserFingerprint || req.get('X-Fingerprint'),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      const endUser = await storage.createEndUser(userData);
      res.json(endUser);
    } catch (error) {
      console.error("Error registering user:", error);
      console.error("Request body:", req.body);
      res.status(400).json({ message: "Invalid user data", error: error.message });
    }
  });

  app.get('/api/user/session/:sessionId', async (req, res) => {
    try {
      const endUser = await storage.getEndUserBySessionId(req.params.sessionId);
      if (!endUser) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(endUser);
    } catch (error) {
      console.error("Error fetching user session:", error);
      res.status(500).json({ message: "Failed to fetch user session" });
    }
  });

  // Question routes
  app.get('/api/questions', async (req, res) => {
    try {
      const activeOnly = req.query.active === 'true';
      const questions = await storage.getQuestions(activeOnly);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post('/api/questions', isAuthenticated, async (req, res) => {
    try {
      const questionData = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(questionData);
      res.json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(400).json({ message: "Invalid question data" });
    }
  });

  app.put('/api/questions/:id', isAuthenticated, async (req, res) => {
    try {
      const question = await storage.updateQuestion(req.params.id, req.body);
      res.json(question);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.delete('/api/questions/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteQuestion(req.params.id);
      res.json({ message: "Question deleted" });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  app.post('/api/questions/reorder', isAuthenticated, async (req, res) => {
    try {
      const { questionOrders } = req.body;
      await storage.reorderQuestions(questionOrders);
      res.json({ message: "Questions reordered" });
    } catch (error) {
      console.error("Error reordering questions:", error);
      res.status(500).json({ message: "Failed to reorder questions" });
    }
  });

  app.post('/api/questions/generate', isAuthenticated, async (req, res) => {
    try {
      const { category, count = 10 } = req.body;
      const questions = await openaiService.generateQuestions(category, count);
      res.json({ questions });
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ message: "Failed to generate questions" });
    }
  });

  // Survey response routes
  app.post('/api/user/response', async (req, res) => {
    try {
      const responseData = insertResponseSchema.parse(req.body);
      const response = await storage.createResponse(responseData);
      
      // Update user's current question index
      const endUser = await storage.getEndUser(responseData.endUserId);
      if (endUser) {
        await storage.updateEndUser(responseData.endUserId, {
          currentQuestionIndex: endUser.currentQuestionIndex + 1
        });
        
        // Check if user should see offers on this page
        const currentPage = Math.ceil((endUser.currentQuestionIndex + 1) / 1); // Assuming 1 question per page
        const offers = await storage.getOffersByPage(currentPage);
        
        res.json({ response, offers });
      } else {
        res.json({ response, offers: [] });
      }
    } catch (error) {
      console.error("Error creating response:", error);
      res.status(400).json({ message: "Invalid response data" });
    }
  });

  app.post('/api/user/complete', async (req, res) => {
    try {
      const { endUserId } = req.body;
      const endUser = await storage.updateEndUser(endUserId, {
        surveyCompleted: true
      });
      
      // Check if user has reached revenue threshold for postback
      const totalRevenue = parseFloat(endUser.totalRevenue?.toString() || '0');
      await revenueTracker.checkAndFirePostback(endUserId, totalRevenue);
      
      res.json(endUser);
    } catch (error) {
      console.error("Error completing survey:", error);
      res.status(500).json({ message: "Failed to complete survey" });
    }
  });

  // Offer routes
  app.get('/api/offers', isAuthenticated, async (req, res) => {
    try {
      const activeOnly = req.query.active === 'true';
      const offers = await storage.getOffers(activeOnly);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  app.post('/api/offers', isAuthenticated, async (req, res) => {
    try {
      let offerData = insertOfferSchema.parse(req.body);
      
      // If Tune offer ID provided, fetch details from Tune API
      if (offerData.tuneOfferId) {
        try {
          const tuneOfferDetails = await tuneApi.getOfferDetails(offerData.tuneOfferId);
          offerData = { ...offerData, ...tuneOfferDetails };
        } catch (tuneError) {
          console.warn("Could not fetch Tune offer details:", tuneError);
        }
      }
      
      const offer = await storage.createOffer(offerData);
      res.json(offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(400).json({ message: "Invalid offer data" });
    }
  });

  app.put('/api/offers/:id', isAuthenticated, async (req, res) => {
    try {
      const offer = await storage.updateOffer(req.params.id, req.body);
      res.json(offer);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ message: "Failed to update offer" });
    }
  });

  app.delete('/api/offers/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteOffer(req.params.id);
      res.json({ message: "Offer deleted" });
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ message: "Failed to delete offer" });
    }
  });

  app.get('/api/offers/:id/stats', isAuthenticated, async (req, res) => {
    try {
      const interactions = await storage.getOfferInteractionsByOffer(req.params.id);
      const stats = {
        totalInteractions: interactions.length,
        totalRevenue: interactions.reduce((sum, int) => sum + parseFloat(int.revenue?.toString() || '0'), 0),
        conversions: interactions.filter(int => int.interactionType === 'conversion').length,
        clicks: interactions.filter(int => int.interactionType === 'click').length,
        views: interactions.filter(int => int.interactionType === 'view').length,
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching offer stats:", error);
      res.status(500).json({ message: "Failed to fetch offer stats" });
    }
  });

  // Offer interaction routes (public)
  app.post('/api/offer/interact', async (req, res) => {
    try {
      const interactionData = {
        endUserId: req.body.endUserId,
        offerId: req.body.offerId,
        interactionType: req.body.interactionType,
        revenue: req.body.revenue || '0.00',
        pageNumber: req.body.pageNumber,
      };
      
      const interaction = await storage.createOfferInteraction(interactionData);
      
      // Check if this interaction triggers postback threshold
      if (interaction.revenue && parseFloat(interaction.revenue.toString()) > 0) {
        const endUser = await storage.getEndUser(interaction.endUserId);
        if (endUser) {
          const totalRevenue = parseFloat(endUser.totalRevenue?.toString() || '0');
          await revenueTracker.checkAndFirePostback(interaction.endUserId, totalRevenue);
        }
      }
      
      res.json(interaction);
    } catch (error) {
      console.error("Error creating offer interaction:", error);
      res.status(400).json({ message: "Invalid interaction data" });
    }
  });

  // User management routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const endUsers = await storage.getEndUsers(Number(limit), Number(offset));
      res.json(endUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const endUser = await storage.getEndUser(req.params.id);
      if (!endUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const responses = await storage.getResponsesByUser(req.params.id);
      const interactions = await storage.getOfferInteractionsByUser(req.params.id);
      const postbacks = await storage.getPostbacksByUser(req.params.id);
      
      res.json({
        user: endUser,
        responses,
        interactions,
        postbacks,
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/daily-stats', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const stats = await storage.getDailyStats(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ message: "Failed to fetch daily stats" });
    }
  });

  // Settings routes
  app.get('/api/settings', isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/settings/:key', isAuthenticated, async (req, res) => {
    try {
      const { value } = req.body;
      const setting = await storage.setSetting(req.params.key, value);
      res.json(setting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Manual postback trigger
  app.post('/api/postback/manual/:userId', isAuthenticated, async (req, res) => {
    try {
      const endUser = await storage.getEndUser(req.params.userId);
      if (!endUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const totalRevenue = parseFloat(endUser.totalRevenue?.toString() || '0');
      const result = await revenueTracker.firePostback(req.params.userId, totalRevenue, true);
      res.json(result);
    } catch (error) {
      console.error("Error firing manual postback:", error);
      res.status(500).json({ message: "Failed to fire postback" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
