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

  // Giveaway routes (public)
  app.get('/api/giveaways/active', async (req, res) => {
    try {
      const giveaway = await storage.getActiveGiveaway();
      if (!giveaway) {
        return res.status(404).json({ message: "No active giveaway found" });
      }
      res.json(giveaway);
    } catch (error) {
      console.error("Error fetching active giveaway:", error);
      res.status(500).json({ message: "Failed to fetch active giveaway" });
    }
  });

  // Admin giveaway management routes
  app.get('/api/admin/giveaways', isAuthenticated, async (req, res) => {
    try {
      const giveaways = await storage.getGiveaways();
      res.json(giveaways);
    } catch (error) {
      console.error("Error fetching giveaways:", error);
      res.status(500).json({ message: "Failed to fetch giveaways" });
    }
  });

  app.post('/api/admin/giveaways', isAuthenticated, async (req, res) => {
    try {
      const giveawaySchema = z.object({
        title: z.string().min(1, "Title is required"),
        imageUrl: z.string().url("Valid image URL is required"),
        retailValue: z.string().regex(/^\d+(\.\d{1,2})?$/, "Valid price required"),
        shippingValue: z.string().regex(/^\d+(\.\d{1,2})?$/, "Valid price required").optional(),
        countdownHours: z.number().min(1).max(72).optional(),
        isActive: z.boolean().optional(),
      });

      const validatedData = giveawaySchema.parse(req.body);
      const giveaway = await storage.createGiveaway(validatedData);
      res.json(giveaway);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating giveaway:", error);
      res.status(500).json({ message: "Failed to create giveaway" });
    }
  });

  app.put('/api/admin/giveaways/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      const updateSchema = z.object({
        title: z.string().min(1).optional(),
        imageUrl: z.string().url().optional(),
        retailValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        shippingValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        countdownHours: z.number().min(1).max(72).optional(),
        isActive: z.boolean().optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      const giveaway = await storage.updateGiveaway(id, validatedData);
      res.json(giveaway);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating giveaway:", error);
      res.status(500).json({ message: "Failed to update giveaway" });
    }
  });

  app.delete('/api/admin/giveaways/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGiveaway(id);
      res.json({ message: "Giveaway deleted successfully" });
    } catch (error) {
      console.error("Error deleting giveaway:", error);
      res.status(500).json({ message: "Failed to delete giveaway" });
    }
  });

  app.post('/api/user/update-profile', async (req, res) => {
    try {
      // Security: Use sessionId instead of accepting endUserId from client
      const { sessionId, firstName, lastName, birthMonth, birthDay, birthYear, gender, currentStep, address, city, state, zip, phone } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      // Look up user by sessionId to prevent IDOR
      const existingUser = await storage.getEndUserBySessionId(sessionId);
      if (!existingUser) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Validate input using Zod schema
      const updateSchema = z.object({
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        birthMonth: z.string().optional(),
        birthDay: z.string().optional(), 
        birthYear: z.string().optional(),
        gender: z.enum(['male', 'female', 'other']).optional(),
        address: z.string().max(500).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(50).optional(),
        zip: z.string().max(20).optional(),
        phone: z.string().max(20).optional(),
        currentStep: z.number().min(1).max(3).optional(),
      });

      const validatedData = updateSchema.parse({
        firstName, lastName, birthMonth, birthDay, birthYear, gender,
        address, city, state, zip, phone, currentStep
      });

      const updateData: any = {
        updatedAt: new Date()
      };
      
      // Personal info
      if (validatedData.firstName) updateData.firstName = validatedData.firstName;
      if (validatedData.lastName) updateData.lastName = validatedData.lastName;
      if (validatedData.gender) updateData.gender = validatedData.gender;
      if (typeof validatedData.currentStep === 'number') updateData.currentQuestionIndex = validatedData.currentStep;
      
      // Address info
      if (validatedData.address) updateData.address = validatedData.address;
      if (validatedData.city) updateData.city = validatedData.city;
      if (validatedData.state) updateData.state = validatedData.state;
      if (validatedData.zip) updateData.zip = validatedData.zip;
      if (validatedData.phone) updateData.phone = validatedData.phone;
      
      // Update age based on birth date if provided
      if (validatedData.birthMonth && validatedData.birthDay && validatedData.birthYear) {
        const birthDate = new Date(parseInt(validatedData.birthYear), parseInt(validatedData.birthMonth) - 1, parseInt(validatedData.birthDay));
        const currentDate = new Date();
        let age = currentDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = currentDate.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
          age--;
        }
        updateData.age = age.toString();
      }

      const updatedUser = await storage.updateEndUser(existingUser.id, updateData);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
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

  // AI Batch Generation - Manual trigger for testing
  app.post('/api/questions/generate/batch', isAuthenticated, async (req, res) => {
    try {
      const { count = 75, saveToDatabase = false } = req.body;
      console.log(`Batch generation request: ${count} questions, save: ${saveToDatabase}`);
      
      const questions = await openaiService.generateBatchQuestions(count);
      
      if (saveToDatabase) {
        let savedCount = 0;
        for (const questionData of questions) {
          try {
            await storage.createQuestion({
              ...questionData,
              isActive: true,
              orderIndex: 0 // Will be updated by storage if needed
            });
            savedCount++;
          } catch (saveError) {
            console.error('Error saving question:', saveError);
            // Continue with other questions
          }
        }
        res.json({ 
          questions, 
          generated: questions.length,
          saved: savedCount,
          message: `Generated ${questions.length} questions, saved ${savedCount} to database`
        });
      } else {
        res.json({ 
          questions, 
          generated: questions.length,
          message: `Generated ${questions.length} questions (preview only)`
        });
      }
    } catch (error) {
      console.error("Error in batch generation:", error);
      res.status(500).json({ message: "Failed to generate batch questions" });
    }
  });

  // AI Daily Generation - Automated trigger (would be called by cron/scheduler)
  app.post('/api/questions/generate/daily', isAuthenticated, async (req, res) => {
    try {
      console.log('Daily AI generation triggered');
      
      const result = await openaiService.runDailyQuestionGeneration();
      
      if (result.success) {
        // Get the generated questions and save them
        const batchSize = Math.floor(Math.random() * 51) + 50; // Match the service logic
        const questions = await openaiService.generateBatchQuestions(batchSize);
        
        let savedCount = 0;
        for (const questionData of questions) {
          try {
            await storage.createQuestion({
              ...questionData,
              isActive: true,
              orderIndex: 0 // Storage will handle proper ordering
            });
            savedCount++;
          } catch (saveError) {
            console.error('Error saving daily generated question:', saveError);
          }
        }
        
        console.log(`Daily generation completed: ${savedCount}/${questions.length} questions saved`);
        res.json({ 
          success: true,
          generated: questions.length,
          saved: savedCount,
          message: `Daily batch completed: ${savedCount} questions added to database`
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: result.error || 'Daily generation failed'
        });
      }
    } catch (error) {
      console.error("Error in daily generation:", error);
      res.status(500).json({ success: false, message: "Failed to run daily generation" });
    }
  });

  // Survey response routes
  app.post('/api/user/response', async (req, res) => {
    try {
      // Security: Use sessionId instead of accepting endUserId from client
      const { sessionId, questionId, answer } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      // Look up user by sessionId to prevent IDOR
      const endUser = await storage.getEndUserBySessionId(sessionId);
      if (!endUser) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if survey is already completed
      if (endUser.surveyCompleted) {
        return res.status(400).json({ message: "Survey already completed" });
      }

      // Validate input using Zod schema
      const responseSchema = z.object({
        questionId: z.string().uuid("Invalid question ID"),
        answer: z.string().min(1, "Answer is required"),
      });

      const validatedData = responseSchema.parse({ questionId, answer });

      // Verify question exists and get details
      const question = await storage.getQuestion(validatedData.questionId);
      if (!question || !question.isActive) {
        return res.status(404).json({ message: "Question not found or inactive" });
      }

      // Validate answer against question options
      if (question.type === 'multiple_choice' || question.type === 'yes_no') {
        // Parse options if they're stored as JSON string
        let validOptions: string[];
        if (typeof question.options === 'string') {
          try {
            validOptions = JSON.parse(question.options);
          } catch (parseError) {
            console.error('Error parsing question options:', parseError, 'Raw options:', question.options);
            return res.status(500).json({ message: "Invalid question configuration" });
          }
        } else {
          validOptions = question.options as string[];
        }
        
        console.log(`Answer validation: question=${question.id}, type=${question.type}, received="${validatedData.answer}", validOptions=${JSON.stringify(validOptions)}`);
        
        // Case-insensitive comparison for user-friendly validation
        const normalizedAnswer = validatedData.answer.trim();
        const isValidAnswer = validOptions.some(option => 
          option.toLowerCase() === normalizedAnswer.toLowerCase()
        );
        
        if (!validOptions || !isValidAnswer) {
          return res.status(400).json({ 
            message: "Invalid answer for this question",
            validOptions: validOptions,
            receivedAnswer: validatedData.answer
          });
        }
      }

      const responseData = {
        endUserId: endUser.id,
        questionId: validatedData.questionId,
        answer: validatedData.answer,
      };
      
      // Get total active questions and enforce sequence
      const allQuestions = await storage.getQuestions();
      const activeQuestions = allQuestions.filter(q => q.isActive).sort((a, b) => a.orderIndex - b.orderIndex);
      const totalQuestions = activeQuestions.length;
      
      // Get current progress based on actual distinct responses
      const userResponseCount = await storage.getUserResponseCount(endUser.id);
      const currentIndex = Math.min(userResponseCount, totalQuestions - 1);
      
      // Enforce sequence: user must answer questions in order
      if (currentIndex < totalQuestions && activeQuestions[currentIndex].id !== validatedData.questionId) {
        return res.status(409).json({
          message: "Questions must be answered in sequence",
          expectedQuestionId: activeQuestions[currentIndex].id,
          currentQuestionIndex: currentIndex
        });
      }
      
      // Upsert response (update if exists, create if new)
      const response = await storage.upsertResponse(responseData);
      
      // Recalculate progress based on actual distinct responses
      const updatedResponseCount = await storage.getUserResponseCount(endUser.id);
      const newQuestionIndex = Math.min(updatedResponseCount, totalQuestions);
      const surveyCompleted = newQuestionIndex >= totalQuestions;
      
      await storage.updateEndUser(endUser.id, {
        currentQuestionIndex: newQuestionIndex,
        surveyCompleted: surveyCompleted
      });
      
      // Determine next action
      let nextAction = 'next_question';
      let offers: any[] = [];
      
      if (surveyCompleted) {
        nextAction = 'show_offers';
        // Get offers for the completed survey
        offers = await storage.getOffersByPage(3); // Step 3 = offers page
      }
      
      res.json({ 
        response, 
        nextAction,
        surveyCompleted,
        currentQuestionIndex: newQuestionIndex,
        totalQuestions,
        offers 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      console.error("Error creating response:", error);
      
      // Handle unique constraint violation gracefully
      if (error.message?.includes('unique_user_question')) {
        return res.status(409).json({ message: "Response already exists for this question" });
      }
      
      res.status(400).json({ message: "Invalid response data" });
    }
  });

  app.post('/api/user/complete', async (req, res) => {
    try {
      // Security: Use sessionId instead of accepting endUserId from client
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      // Look up user by sessionId to prevent IDOR
      const existingUser = await storage.getEndUserBySessionId(sessionId);
      if (!existingUser) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Validate input
      if (existingUser.surveyCompleted) {
        return res.status(400).json({ message: "Survey already completed" });
      }

      const endUser = await storage.updateEndUser(existingUser.id, {
        surveyCompleted: true
      });
      
      // Check if user has reached revenue threshold for postback
      const totalRevenue = parseFloat(endUser.totalRevenue?.toString() || '0');
      await revenueTracker.checkAndFirePostback(existingUser.id, totalRevenue);
      
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
      
      // If Tune offer ID provided, try to fetch details from Tune API
      if (offerData.tuneOfferId) {
        try {
          const tuneOfferDetails = await tuneApi.getOfferDetails(offerData.tuneOfferId);
          offerData = { ...offerData, ...tuneOfferDetails };
          console.log("Successfully fetched Tune offer details for:", offerData.tuneOfferId);
        } catch (tuneError) {
          console.warn("Could not fetch Tune offer details for offer ID:", offerData.tuneOfferId, "Error:", tuneError.message);
          // Continue with original data - Tune API failure should not block offer creation
        }
      }
      
      // Ensure required fields have defaults if not provided by Tune API
      if (!offerData.clickUrl) {
        offerData.clickUrl = `https://example.com/offer/${offerData.tuneOfferId || 'default'}`;
      }
      
      console.log("Creating offer with data:", JSON.stringify(offerData, null, 2));
      const offer = await storage.createOffer(offerData);
      console.log("Offer created successfully:", offer.id);
      res.json(offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      if (error.message && error.message.includes('column')) {
        res.status(400).json({ message: "Database schema error: " + error.message });
      } else {
        res.status(400).json({ message: "Failed to create offer: " + (error.message || "Unknown error") });
      }
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

  // Public offers endpoint for survey flow (minimal data)
  app.get('/api/offers/public', async (req, res) => {
    try {
      const offers = await storage.getOffers(true); // Active offers only
      
      // Filter for main offers only (exclude exit offers)
      const mainOffers = offers.filter(offer => offer.offerType !== 'exit');
      
      // Only return safe public fields for the survey
      const publicOffers = mainOffers.map(offer => ({
        id: offer.id,
        name: offer.name,
        description: offer.description,
        imageUrl: offer.imageUrl,
        category: offer.category,
        rating: offer.rating || 4.5,
        originalPrice: offer.originalPrice || '$99.99',
        discountPrice: offer.discountPrice || '$19.99',
        // Exclude sensitive fields: payout, conversionUrl, etc.
      }));
      
      res.json(publicOffers);
    } catch (error) {
      console.error("Error fetching public offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  // Exit offers endpoint for lottery system
  app.get('/api/offers/exit', async (req, res) => {
    try {
      const offers = await storage.getOffers(true); // Active offers only
      
      // Filter for exit offers only
      const exitOffers = offers.filter(offer => offer.offerType === 'exit');
      
      // Return safe public fields for exit lottery
      const publicExitOffers = exitOffers.map(offer => ({
        id: offer.id,
        name: offer.name,
        description: offer.description,
        imageUrl: offer.imageUrl,
        clickUrl: offer.clickUrl,
        category: offer.category,
        position: offer.position,
        offerType: offer.offerType,
        rating: offer.rating || 4.5,
        originalPrice: offer.originalPrice || '$100.00',
        discountPrice: offer.discountPrice || '$25.00',
      }));
      
      res.json(publicExitOffers);
    } catch (error) {
      console.error("Error fetching exit offers:", error);
      res.status(500).json({ message: "Failed to fetch exit offers" });
    }
  });

  // Offer interaction routes (public)
  app.post('/api/offer/interact', async (req, res) => {
    try {
      // Security: Use sessionId instead of accepting endUserId from client
      const { sessionId, offerId, interactionType, revenue, pageNumber } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      // Look up user by sessionId to prevent IDOR
      const endUser = await storage.getEndUserBySessionId(sessionId);
      if (!endUser) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Validate input using Zod schema - NO revenue from client!
      const interactionSchema = z.object({
        offerId: z.string().uuid("Invalid offer ID"),
        interactionType: z.enum(['view', 'click', 'spin'], { message: "Only view, click, and spin allowed from client" }),
        pageNumber: z.number().min(1).max(100, "Invalid page number").optional(),
      });

      const validatedData = interactionSchema.parse({
        offerId,
        interactionType,
        pageNumber
      });

      // Security: Revenue and conversions can only be set server-side
      if (revenue || interactionType === 'conversion') {
        return res.status(400).json({ message: "Revenue and conversions must come from server-side sources only" });
      }

      // Verify offer exists
      const offer = await storage.getOffer(validatedData.offerId);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      const interactionData = {
        endUserId: endUser.id,
        offerId: validatedData.offerId,
        interactionType: validatedData.interactionType,
        revenue: '0.00', // Client interactions never have revenue
        pageNumber: validatedData.pageNumber,
      };
      
      const interaction = await storage.createOfferInteraction(interactionData);
      
      // Client interactions (view/click) never trigger postbacks
      // Only server-to-server conversions should trigger revenue and postbacks
      
      res.json(interaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      console.error("Error creating offer interaction:", error);
      res.status(400).json({ message: "Invalid interaction data" });
    }
  });

  // Secure server-to-server conversion webhook (for legitimate conversions)
  app.post('/api/postback/conversion', async (req, res) => {
    try {
      // Validate server-to-server authentication (implement proper webhook security)
      const authHeader = req.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
        return res.status(401).json({ message: "Unauthorized webhook access" });
      }

      const { sessionId, offerId, revenue, source } = req.body;

      // Validate input for server-to-server conversions
      const conversionSchema = z.object({
        sessionId: z.string().min(1, "Session ID required"),
        offerId: z.string().uuid("Invalid offer ID"),
        revenue: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid revenue format"),
        source: z.string().min(1, "Conversion source required"),
      });

      const validatedData = conversionSchema.parse({ sessionId, offerId, revenue, source });

      // Look up user by sessionId
      const endUser = await storage.getEndUserBySessionId(validatedData.sessionId);
      if (!endUser) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Verify offer exists and get payout limit
      const offer = await storage.getOffer(validatedData.offerId);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      // Security: Clamp revenue to offer payout (prevent over-payment)
      const maxRevenue = parseFloat(offer.payout);
      const clampedRevenue = Math.min(parseFloat(validatedData.revenue), maxRevenue);

      // Create conversion interaction with server-validated revenue
      const interactionData = {
        endUserId: endUser.id,
        offerId: validatedData.offerId,
        interactionType: 'conversion' as const,
        revenue: clampedRevenue.toFixed(2),
        pageNumber: endUser.currentQuestionIndex || 1,
      };

      const interaction = await storage.createOfferInteraction(interactionData);

      // Check if this conversion triggers postback threshold
      const updatedUser = await storage.getEndUser(endUser.id);
      if (updatedUser) {
        const totalRevenue = parseFloat(updatedUser.totalRevenue?.toString() || '0');
        await revenueTracker.checkAndFirePostback(endUser.id, totalRevenue);
      }

      res.json({ 
        success: true, 
        interaction,
        clampedRevenue: clampedRevenue.toFixed(2),
        originalRevenue: validatedData.revenue 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid conversion data", errors: error.errors });
      }
      console.error("Error processing conversion:", error);
      res.status(500).json({ message: "Failed to process conversion" });
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
