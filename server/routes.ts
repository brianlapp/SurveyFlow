import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEndUserSchema, insertQuestionSchema, insertOfferSchema, insertResponseSchema, insertTySurveySchema, insertTySurveyQuestionSchema, insertTySurveyQuestionOfferSchema, insertEmailListSchema, insertEmailAdSchema } from "@shared/schema";
import { tuneApi } from "./services/tuneApi";
import { revenueTracker } from "./services/revenueTracker";
import { openaiService } from "./services/openaiService";
import { randomUUID } from "crypto";
import { z } from "zod";
import { spawn } from "child_process";
import path from "path";

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
      
      // Convert empty tuneOfferId to null to avoid unique constraint issues
      if (offerData.tuneOfferId === '' || offerData.tuneOfferId === undefined) {
        offerData.tuneOfferId = null;
      }
      
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
      const updateData = { ...req.body };
      
      // Convert empty tuneOfferId to null to avoid unique constraint issues
      if (updateData.tuneOfferId === '' || updateData.tuneOfferId === undefined) {
        updateData.tuneOfferId = null;
      }
      
      const offer = await storage.updateOffer(req.params.id, updateData);
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
        clickUrl: offer.clickUrl,
        category: offer.category,
        offerType: offer.offerType,
        displayPages: offer.displayPages,
        questionIds: offer.questionIds, // Question-based targeting
        position: offer.position,
        rating: offer.rating || 4.5,
        originalPrice: offer.originalPrice || '$99.99',
        discountPrice: offer.discountPrice || '$19.99',
        scriptContent: offer.scriptContent, // For popup_script offers
        linkText: offer.linkText, // For next_link offers
        impressionPixel: offer.impressionPixel, // For tune_standard tracking
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
      
      // Filter for offers that display on page 20 (exit page)
      const exitOffers = offers.filter(offer => offer.displayPages?.includes(20));
      
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

  app.get('/api/users/:id/responses', isAuthenticated, async (req, res) => {
    try {
      const endUser = await storage.getEndUser(req.params.id);
      if (!endUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const responsesWithQuestions = await storage.getResponsesWithQuestions(req.params.id);
      
      res.json({
        user: {
          id: endUser.id,
          firstName: endUser.firstName,
          lastName: endUser.lastName,
          email: endUser.email,
          source: endUser.source,
          subSource: endUser.subSource,
        },
        responses: responsesWithQuestions,
      });
    } catch (error) {
      console.error("Error fetching user responses:", error);
      res.status(500).json({ message: "Failed to fetch user responses" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/daily-stats/:startDate/:endDate', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.params;
      const stats = await storage.getDailyStats(
        new Date(startDate),
        new Date(endDate)
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ message: "Failed to fetch daily stats" });
    }
  });

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

  // TMG Coreg Revenue Report
  app.post('/api/revenue/coreg-report', isAuthenticated, async (req, res) => {
    try {
      const { startDateTime, endDateTime } = req.body;
      
      // Validate date format (MM/dd/yyyy HH:mm)
      const dateSchema = z.object({
        startDateTime: z.string().regex(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/, "Start date must be in MM/dd/yyyy HH:mm format"),
        endDateTime: z.string().regex(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/, "End date must be in MM/dd/yyyy HH:mm format"),
      });
      
      const validatedData = dateSchema.parse({ startDateTime, endDateTime });
      
      // Get TMG credentials from environment
      const username = process.env.TMG_REVENUE_USER;
      const password = process.env.TMG_REVENUE_PASSWORD;
      
      if (!username || !password) {
        return res.status(500).json({ message: "TMG API credentials not configured" });
      }
      
      // Build request URL with query parameters
      const url = new URL('http://services.tmginteractive.com/amsrevapi/TMGAPI/Revenue/');
      url.searchParams.append('StartDateTime', validatedData.startDateTime);
      url.searchParams.append('EndDateTime', validatedData.endDateTime);
      url.searchParams.append('Type', 'JSON');
      
      console.log('TMG API Request URL:', url.toString());
      console.log('TMG API Username:', username);
      
      // Make request to TMG API
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          'X-TMGRevenue-Version': '2',
        },
      });
      
      console.log('TMG API Response Status:', response.status, response.statusText);
      
      // Try to get response text for better error messages
      const responseText = await response.text();
      console.log('TMG API Response:', responseText);
      
      if (!response.ok) {
        // Return the actual TMG error response to help debug
        return res.status(response.status).json({ 
          message: `TMG API error: ${response.status} ${response.statusText}`,
          details: responseText 
        });
      }
      
      // Parse JSON response
      const data = JSON.parse(responseText);
      res.json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid date format", errors: error.errors });
      }
      console.error("Error fetching TMG revenue report:", error);
      res.status(500).json({ message: "Failed to fetch revenue report", error: error.message });
    }
  });

  // Postback Management Routes
  app.get('/api/postbacks', isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const postbacksList = await storage.getAllPostbacks({ status, limit, offset });
      
      // Join with user data for display
      const postbacksWithUsers = await Promise.all(
        postbacksList.map(async (postback) => {
          const user = await storage.getEndUser(postback.endUserId);
          return {
            ...postback,
            user: user ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              source: user.source,
            } : null,
          };
        })
      );
      
      res.json(postbacksWithUsers);
    } catch (error) {
      console.error("Error fetching postbacks:", error);
      res.status(500).json({ message: "Failed to fetch postbacks" });
    }
  });

  app.get('/api/postbacks/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getPostbackStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching postback stats:", error);
      res.status(500).json({ message: "Failed to fetch postback stats" });
    }
  });

  app.get('/api/postbacks/pending-users', isAuthenticated, async (req, res) => {
    try {
      const thresholdPercent = req.query.percent ? parseInt(req.query.percent as string) : 80;
      const users = await storage.getUsersNearThreshold(thresholdPercent);
      
      // Get default threshold for progress calculation
      const defaultThresholdSetting = await storage.getSetting('default_threshold');
      const defaultThreshold = defaultThresholdSetting ? parseFloat(defaultThresholdSetting.value) : 3.00;
      
      // Add progress percentage to each user
      const usersWithProgress = users.map(user => ({
        ...user,
        progress: Math.min(100, (parseFloat(user.totalRevenue?.toString() || '0') / defaultThreshold) * 100),
        threshold: defaultThreshold,
      }));
      
      res.json(usersWithProgress);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  });

  app.get('/api/postbacks/thresholds', isAuthenticated, async (req, res) => {
    try {
      const defaultThresholdSetting = await storage.getSetting('default_threshold');
      const sourceThresholds = await storage.getSourceThresholds();
      
      res.json({
        defaultThreshold: defaultThresholdSetting?.value || '3.00',
        sourceThresholds: sourceThresholds.map(s => ({
          source: s.key.replace('threshold_', ''),
          threshold: s.value,
        })),
      });
    } catch (error) {
      console.error("Error fetching thresholds:", error);
      res.status(500).json({ message: "Failed to fetch thresholds" });
    }
  });

  app.post('/api/postbacks/thresholds/source', isAuthenticated, async (req, res) => {
    try {
      const { source, threshold } = req.body;
      if (!source || !threshold) {
        return res.status(400).json({ message: "Source and threshold are required" });
      }
      
      const setting = await storage.setSetting(`threshold_${source}`, threshold.toString());
      res.json({ source, threshold: setting.value });
    } catch (error) {
      console.error("Error setting source threshold:", error);
      res.status(500).json({ message: "Failed to set source threshold" });
    }
  });

  app.delete('/api/postbacks/thresholds/source/:source', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSourceThreshold(req.params.source);
      res.json({ message: "Source threshold deleted" });
    } catch (error) {
      console.error("Error deleting source threshold:", error);
      res.status(500).json({ message: "Failed to delete source threshold" });
    }
  });

  app.get('/api/postbacks/config', isAuthenticated, async (req, res) => {
    try {
      const postbackUrl = await storage.getSetting('tune_postback_url');
      res.json({
        postbackUrl: postbackUrl?.value || '',
        isConfigured: !!postbackUrl?.value,
      });
    } catch (error) {
      console.error("Error fetching postback config:", error);
      res.status(500).json({ message: "Failed to fetch postback config" });
    }
  });

  app.put('/api/postbacks/config', isAuthenticated, async (req, res) => {
    try {
      const { postbackUrl } = req.body;
      await storage.setSetting('tune_postback_url', postbackUrl || '');
      res.json({ message: "Postback URL updated", postbackUrl });
    } catch (error) {
      console.error("Error updating postback config:", error);
      res.status(500).json({ message: "Failed to update postback config" });
    }
  });

  // Thank You Page Brand Routes
  app.get('/api/ty-brands', isAuthenticated, async (req, res) => {
    try {
      const brands = await storage.getTyBrands();
      res.json(brands);
    } catch (error) {
      console.error("Error fetching TY brands:", error);
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  app.post('/api/ty-brands', isAuthenticated, async (req, res) => {
    try {
      const brand = await storage.createTyBrand(req.body);
      res.json(brand);
    } catch (error: any) {
      console.error("Error creating TY brand:", error);
      if (error.code === '23505') {
        res.status(400).json({ message: "A brand with this slug already exists" });
      } else {
        res.status(500).json({ message: "Failed to create brand" });
      }
    }
  });

  app.get('/api/ty-brands/:id', isAuthenticated, async (req, res) => {
    try {
      const brand = await storage.getTyBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      res.json(brand);
    } catch (error) {
      console.error("Error fetching TY brand:", error);
      res.status(500).json({ message: "Failed to fetch brand" });
    }
  });

  app.put('/api/ty-brands/:id', isAuthenticated, async (req, res) => {
    try {
      const brand = await storage.updateTyBrand(req.params.id, req.body);
      res.json(brand);
    } catch (error: any) {
      console.error("Error updating TY brand:", error);
      if (error.code === '23505') {
        res.status(400).json({ message: "A brand with this slug already exists" });
      } else {
        res.status(500).json({ message: "Failed to update brand" });
      }
    }
  });

  app.delete('/api/ty-brands/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTyBrand(req.params.id);
      res.json({ message: "Brand deleted" });
    } catch (error) {
      console.error("Error deleting TY brand:", error);
      res.status(500).json({ message: "Failed to delete brand" });
    }
  });

  // Thank You Page Routes (within a brand)
  app.get('/api/ty-brands/:brandId/pages', isAuthenticated, async (req, res) => {
    try {
      const pages = await storage.getTyPagesByBrand(req.params.brandId);
      res.json(pages);
    } catch (error) {
      console.error("Error fetching TY pages:", error);
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });

  app.post('/api/ty-brands/:brandId/pages', isAuthenticated, async (req, res) => {
    try {
      const pageData = { ...req.body, brandId: req.params.brandId };
      const page = await storage.createTyPage(pageData);
      res.json(page);
    } catch (error: any) {
      console.error("Error creating TY page:", error);
      if (error.code === '23505') {
        res.status(400).json({ message: "A page with this slug already exists for this brand" });
      } else {
        res.status(500).json({ message: "Failed to create page" });
      }
    }
  });

  app.get('/api/ty-pages/:id', isAuthenticated, async (req, res) => {
    try {
      const page = await storage.getTyPage(req.params.id);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Error fetching TY page:", error);
      res.status(500).json({ message: "Failed to fetch page" });
    }
  });

  app.put('/api/ty-pages/:id', isAuthenticated, async (req, res) => {
    try {
      const page = await storage.updateTyPage(req.params.id, req.body);
      res.json(page);
    } catch (error: any) {
      console.error("Error updating TY page:", error);
      if (error.code === '23505') {
        res.status(400).json({ message: "A page with this slug already exists for this brand" });
      } else {
        res.status(500).json({ message: "Failed to update page" });
      }
    }
  });

  app.delete('/api/ty-pages/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTyPage(req.params.id);
      res.json({ message: "Page deleted" });
    } catch (error) {
      console.error("Error deleting TY page:", error);
      res.status(500).json({ message: "Failed to delete page" });
    }
  });

  // Embed metadata - get brand with ordered pages for embed dialog
  app.get('/api/ty-brands/:brandId/embed-metadata', isAuthenticated, async (req, res) => {
    try {
      const brand = await storage.getTyBrand(req.params.brandId);
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      const pages = await storage.getTyPagesByBrandOrdered(req.params.brandId);
      res.json({ brand, pages });
    } catch (error) {
      console.error("Error fetching embed metadata:", error);
      res.status(500).json({ message: "Failed to fetch embed metadata" });
    }
  });

  // Reorder pages for a brand
  app.post('/api/ty-brands/:brandId/reorder', isAuthenticated, async (req, res) => {
    try {
      const { pageOrders } = req.body; // Array of { id, displayOrder }
      if (!Array.isArray(pageOrders)) {
        return res.status(400).json({ message: "pageOrders must be an array" });
      }
      await storage.reorderTyPages(pageOrders);
      const pages = await storage.getTyPagesByBrandOrdered(req.params.brandId);
      res.json({ pages });
    } catch (error) {
      console.error("Error reordering pages:", error);
      res.status(500).json({ message: "Failed to reorder pages" });
    }
  });

  // Toggle page active status
  app.patch('/api/ty-pages/:id/status', isAuthenticated, async (req, res) => {
    try {
      const page = await storage.getTyPage(req.params.id);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      const updated = await storage.updateTyPage(req.params.id, { isActive: !page.isActive });
      res.json(updated);
    } catch (error) {
      console.error("Error toggling page status:", error);
      res.status(500).json({ message: "Failed to toggle status" });
    }
  });

  // Public TY page - no auth required
  app.get('/api/public/ty/:brandSlug/:pageSlug', async (req, res) => {
    try {
      const brand = await storage.getTyBrandBySlug(req.params.brandSlug);
      if (!brand || !brand.isActive) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      const page = await storage.getTyPageBySlug(brand.id, req.params.pageSlug);
      if (!page || !page.isActive) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      // Track impression
      await storage.incrementTyPageImpressions(page.id);
      
      // Generate Tune URLs
      const trackingDomain = page.trackingDomain || 'track.modemobile.com';
      const clickUrl = `https://${trackingDomain}/aff_c?offer_id=${page.tuneOfferId}&aff_id=${page.affiliateId}`;
      const impressionPixel = `https://${trackingDomain}/aff_i?offer_id=${page.tuneOfferId}&aff_id=${page.affiliateId}`;
      
      res.json({
        brand: {
          name: brand.name,
          logoUrl: brand.logoUrl,
          thankYouTitle: brand.thankYouTitle,
          fontFamily: brand.fontFamily,
          navItems: brand.navItems,
          primaryColor: brand.primaryColor,
          headingColor: brand.headingColor,
          taglineColor: brand.taglineColor,
          newsletterReminder: brand.newsletterReminder,
          footerCopyright: brand.footerCopyright,
          termsUrl: brand.termsUrl,
          privacyUrl: brand.privacyUrl,
        },
        page: {
          offerTitle: page.offerTitle,
          offerImageUrl: page.offerImageUrl,
          buttonText: page.buttonText,
          fbShareUrl: page.fbShareUrl,
          layoutType: page.layoutType || 'card',
          clickUrl,
          impressionPixel,
        },
      });
    } catch (error) {
      console.error("Error fetching public TY page:", error);
      res.status(500).json({ message: "Failed to fetch page" });
    }
  });

  // Track clicks on TY pages
  app.post('/api/public/ty/:brandSlug/:pageSlug/click', async (req, res) => {
    try {
      const brand = await storage.getTyBrandBySlug(req.params.brandSlug);
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      const page = await storage.getTyPageBySlug(brand.id, req.params.pageSlug);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      await storage.incrementTyPageClicks(page.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking click:", error);
      res.status(500).json({ message: "Failed to track click" });
    }
  });

  // Public embed cycling endpoint - returns next offer in rotation
  app.get('/api/embed/ty/:brandSlug', async (req, res) => {
    try {
      const brand = await storage.getTyBrandBySlug(req.params.brandSlug);
      if (!brand || !brand.isActive) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      const page = await storage.getNextEmbedPage(brand.id);
      if (!page) {
        return res.status(404).json({ message: "No active pages found" });
      }
      
      // Track impression
      await storage.incrementTyPageImpressions(page.id);
      
      // Generate Tune URLs
      const trackingDomain = page.trackingDomain || 'track.modemobile.com';
      const clickUrl = `https://${trackingDomain}/aff_c?offer_id=${page.tuneOfferId}&aff_id=${page.affiliateId}`;
      const impressionPixel = `https://${trackingDomain}/aff_i?offer_id=${page.tuneOfferId}&aff_id=${page.affiliateId}`;
      
      res.json({
        brand: {
          name: brand.name,
          slug: brand.slug,
          logoUrl: brand.logoUrl,
          thankYouTitle: brand.thankYouTitle,
          fontFamily: brand.fontFamily,
          navItems: brand.navItems,
          primaryColor: brand.primaryColor,
          headingColor: brand.headingColor,
          taglineColor: brand.taglineColor,
          newsletterReminder: brand.newsletterReminder,
          footerCopyright: brand.footerCopyright,
          termsUrl: brand.termsUrl,
          privacyUrl: brand.privacyUrl,
        },
        page: {
          id: page.id,
          slug: page.slug,
          offerTitle: page.offerTitle,
          offerImageUrl: page.offerImageUrl,
          buttonText: page.buttonText,
          fbShareUrl: page.fbShareUrl,
          layoutType: page.layoutType || 'card',
          clickUrl,
          impressionPixel,
        },
      });
    } catch (error) {
      console.error("Error fetching embed page:", error);
      res.status(500).json({ message: "Failed to fetch embed page" });
    }
  });

  // Track clicks on embed pages
  app.post('/api/embed/ty/:brandSlug/click', async (req, res) => {
    try {
      const { pageId } = req.body;
      if (!pageId) {
        return res.status(400).json({ message: "pageId required" });
      }
      await storage.incrementTyPageClicks(pageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking embed click:", error);
      res.status(500).json({ message: "Failed to track click" });
    }
  });

  // ============ TY SURVEYS API ============
  
  // Get all surveys
  app.get('/api/ty-surveys', isAuthenticated, async (req, res) => {
    try {
      const surveys = await storage.getTySurveys();
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ message: "Failed to fetch surveys" });
    }
  });

  // Create new survey
  app.post('/api/ty-surveys', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTySurveySchema.parse(req.body);
      const survey = await storage.createTySurvey(validatedData);
      res.json(survey);
    } catch (error: any) {
      console.error("Error creating survey:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid survey data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create survey" });
    }
  });

  // Get single survey
  app.get('/api/ty-surveys/:id', isAuthenticated, async (req, res) => {
    try {
      const survey = await storage.getTySurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      res.json(survey);
    } catch (error) {
      console.error("Error fetching survey:", error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  // Update survey
  app.put('/api/ty-surveys/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTySurveySchema.partial().parse(req.body);
      const survey = await storage.updateTySurvey(req.params.id, validatedData);
      res.json(survey);
    } catch (error: any) {
      console.error("Error updating survey:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid survey data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update survey" });
    }
  });

  // Delete survey
  app.delete('/api/ty-surveys/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTySurvey(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting survey:", error);
      res.status(500).json({ message: "Failed to delete survey" });
    }
  });

  // Get survey questions
  app.get('/api/ty-surveys/:surveyId/questions', isAuthenticated, async (req, res) => {
    try {
      const questions = await storage.getTySurveyQuestionsOrdered(req.params.surveyId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  // Create survey question
  app.post('/api/ty-surveys/:surveyId/questions', isAuthenticated, async (req, res) => {
    try {
      const existingQuestions = await storage.getTySurveyQuestionsOrdered(req.params.surveyId);
      const maxOrder = existingQuestions.length > 0 
        ? Math.max(...existingQuestions.map(q => q.displayOrder || 0)) 
        : -1;
      
      const questionData = {
        ...req.body,
        surveyId: req.params.surveyId,
        displayOrder: maxOrder + 1,
      };
      const validatedData = insertTySurveyQuestionSchema.parse(questionData);
      const question = await storage.createTySurveyQuestion(validatedData);
      res.json(question);
    } catch (error: any) {
      console.error("Error creating question:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid question data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  // Update survey question
  app.put('/api/ty-survey-questions/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTySurveyQuestionSchema.partial().parse(req.body);
      const question = await storage.updateTySurveyQuestion(req.params.id, validatedData);
      res.json(question);
    } catch (error: any) {
      console.error("Error updating question:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid question data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  // Delete survey question
  app.delete('/api/ty-survey-questions/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTySurveyQuestion(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // Toggle question status
  app.patch('/api/ty-survey-questions/:id/status', isAuthenticated, async (req, res) => {
    try {
      const question = await storage.getTySurveyQuestion(req.params.id);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      const updated = await storage.updateTySurveyQuestion(req.params.id, { 
        isActive: !question.isActive 
      });
      res.json(updated);
    } catch (error) {
      console.error("Error toggling question status:", error);
      res.status(500).json({ message: "Failed to toggle status" });
    }
  });

  // Reorder survey questions
  app.post('/api/ty-surveys/:surveyId/questions/reorder', isAuthenticated, async (req, res) => {
    try {
      const { questionOrders } = req.body;
      await storage.reorderTySurveyQuestions(questionOrders);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering questions:", error);
      res.status(500).json({ message: "Failed to reorder questions" });
    }
  });

  // Get question offers
  app.get('/api/ty-survey-questions/:questionId/offers', isAuthenticated, async (req, res) => {
    try {
      const offers = await storage.getTySurveyQuestionOffers(req.params.questionId);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching question offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  // Set question offers
  app.put('/api/ty-survey-questions/:questionId/offers', isAuthenticated, async (req, res) => {
    try {
      const offerSchema = z.object({
        offerId: z.string().uuid(),
        displayMode: z.enum(['with_question', 'after_question']).optional().default('with_question'),
        displayOrder: z.number().int().min(0).optional().default(0),
      });
      const requestSchema = z.object({
        offers: z.array(offerSchema),
      });
      const validatedData = requestSchema.parse(req.body);
      const result = await storage.setTySurveyQuestionOffers(req.params.questionId, validatedData.offers);
      res.json(result);
    } catch (error: any) {
      console.error("Error setting question offers:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid offers data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to set offers" });
    }
  });

  // AI Generate questions
  app.post('/api/ty-surveys/:surveyId/generate-questions', isAuthenticated, async (req, res) => {
    try {
      const { topic, count = 5 } = req.body;
      
      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }

      const openai = new OpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a survey question generator. Generate engaging survey questions that would be relevant for lead generation and user profiling. Return a JSON array of questions.`
          },
          {
            role: "user",
            content: `Generate ${count} survey questions about "${topic}". 
            
Return a JSON array with this format:
[
  {
    "questionText": "The question text",
    "questionType": "multiple_choice" or "yes_no" or "text_input",
    "options": ["Option 1", "Option 2", "Option 3"] // only for multiple_choice, null otherwise
  }
]

Make questions engaging and relevant for consumer surveys. Include a mix of question types.`
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "Failed to generate questions" });
      }

      const parsed = JSON.parse(content);
      const questions = parsed.questions || parsed;
      
      res.json({ questions });
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ message: "Failed to generate questions" });
    }
  });

  // Add generated questions to survey
  app.post('/api/ty-surveys/:surveyId/add-generated', isAuthenticated, async (req, res) => {
    try {
      const { questions } = req.body;
      const surveyId = req.params.surveyId;
      
      const existingQuestions = await storage.getTySurveyQuestionsOrdered(surveyId);
      let maxOrder = existingQuestions.length > 0 
        ? Math.max(...existingQuestions.map(q => q.displayOrder || 0)) 
        : -1;
      
      const created = [];
      for (const q of questions) {
        maxOrder++;
        const question = await storage.createTySurveyQuestion({
          surveyId,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          displayOrder: maxOrder,
          isActive: true,
          isRequired: true,
        });
        created.push(question);
      }
      
      res.json(created);
    } catch (error) {
      console.error("Error adding generated questions:", error);
      res.status(500).json({ message: "Failed to add questions" });
    }
  });

  // ============ PUBLIC SURVEY API ============
  
  // Get public survey data
  app.get('/api/public/survey/:surveySlug', async (req, res) => {
    try {
      const survey = await storage.getTySurveyBySlug(req.params.surveySlug);
      if (!survey || !survey.isActive) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      const questions = await storage.getActiveTySurveyQuestionsOrdered(survey.id);
      
      // Get offers for each question
      const questionsWithOffers = await Promise.all(questions.map(async (q) => {
        const questionOffers = await storage.getTySurveyQuestionOffers(q.id);
        return {
          ...q,
          offers: questionOffers.map(qo => ({
            ...qo.offer,
            displayMode: qo.displayMode,
            displayOrder: qo.displayOrder,
          }))
        };
      }));
      
      res.json({
        survey: {
          id: survey.id,
          name: survey.name,
          slug: survey.slug,
          logoUrl: survey.logoUrl,
          primaryColor: survey.primaryColor,
          headingColor: survey.headingColor,
          fontFamily: survey.fontFamily,
          thankYouTitle: survey.thankYouTitle,
          redirectUrl: survey.redirectUrl,
        },
        questions: questionsWithOffers,
      });
    } catch (error) {
      console.error("Error fetching public survey:", error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  // Submit survey response
  app.post('/api/public/survey/:surveySlug/respond', async (req, res) => {
    try {
      const { sessionId, questionId, answer } = req.body;
      
      const survey = await storage.getTySurveyBySlug(req.params.surveySlug);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      await storage.createTySurveyResponse({
        surveyId: survey.id,
        questionId,
        sessionId,
        answer,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving response:", error);
      res.status(500).json({ message: "Failed to save response" });
    }
  });

  // Mark survey complete
  app.post('/api/public/survey/:surveySlug/complete', async (req, res) => {
    try {
      const survey = await storage.getTySurveyBySlug(req.params.surveySlug);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      await storage.incrementTySurveyResponses(survey.id);
      
      res.json({ 
        success: true,
        redirectUrl: survey.redirectUrl,
        thankYouTitle: survey.thankYouTitle,
      });
    } catch (error) {
      console.error("Error completing survey:", error);
      res.status(500).json({ message: "Failed to complete survey" });
    }
  });

  // ============ EMAIL HOUSE ADS API ============

  // Get all email lists
  app.get('/api/email-lists', isAuthenticated, async (req, res) => {
    try {
      const lists = await storage.getEmailLists();
      res.json(lists);
    } catch (error) {
      console.error("Error fetching email lists:", error);
      res.status(500).json({ message: "Failed to fetch email lists" });
    }
  });

  // Create new email list
  app.post('/api/email-lists', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmailListSchema.parse(req.body);
      const list = await storage.createEmailList(validatedData);
      res.json(list);
    } catch (error: any) {
      console.error("Error creating email list:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid list data", errors: error.errors });
      }
      if (error.code === '23505') {
        return res.status(400).json({ message: "A list with this slug already exists" });
      }
      res.status(500).json({ message: "Failed to create email list" });
    }
  });

  // Get single email list
  app.get('/api/email-lists/:id', isAuthenticated, async (req, res) => {
    try {
      const list = await storage.getEmailList(req.params.id);
      if (!list) {
        return res.status(404).json({ message: "Email list not found" });
      }
      res.json(list);
    } catch (error) {
      console.error("Error fetching email list:", error);
      res.status(500).json({ message: "Failed to fetch email list" });
    }
  });

  // Update email list
  app.put('/api/email-lists/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmailListSchema.partial().parse(req.body);
      const list = await storage.updateEmailList(req.params.id, validatedData);
      res.json(list);
    } catch (error: any) {
      console.error("Error updating email list:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid list data", errors: error.errors });
      }
      if (error.code === '23505') {
        return res.status(400).json({ message: "A list with this slug already exists" });
      }
      res.status(500).json({ message: "Failed to update email list" });
    }
  });

  // Delete email list
  app.delete('/api/email-lists/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEmailList(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting email list:", error);
      res.status(500).json({ message: "Failed to delete email list" });
    }
  });

  // Get email ads for a list
  app.get('/api/email-lists/:listId/ads', isAuthenticated, async (req, res) => {
    try {
      const ads = await storage.getEmailAdsByListOrdered(req.params.listId);
      res.json(ads);
    } catch (error) {
      console.error("Error fetching email ads:", error);
      res.status(500).json({ message: "Failed to fetch email ads" });
    }
  });

  // Create email ad
  app.post('/api/email-lists/:listId/ads', isAuthenticated, async (req, res) => {
    try {
      const existingAds = await storage.getEmailAdsByListOrdered(req.params.listId);
      const maxOrder = existingAds.length > 0 
        ? Math.max(...existingAds.map(a => a.displayOrder || 0)) 
        : -1;
      
      const adData = {
        ...req.body,
        listId: req.params.listId,
        displayOrder: maxOrder + 1,
      };
      
      const validatedData = insertEmailAdSchema.parse(adData);
      const ad = await storage.createEmailAd(validatedData);
      res.json(ad);
    } catch (error: any) {
      console.error("Error creating email ad:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid ad data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create email ad" });
    }
  });

  // Update email ad
  app.put('/api/email-lists/:listId/ads/:adId', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmailAdSchema.partial().parse(req.body);
      const ad = await storage.updateEmailAd(req.params.adId, validatedData);
      res.json(ad);
    } catch (error: any) {
      console.error("Error updating email ad:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid ad data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update email ad" });
    }
  });

  // Delete email ad
  app.delete('/api/email-lists/:listId/ads/:adId', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEmailAd(req.params.adId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting email ad:", error);
      res.status(500).json({ message: "Failed to delete email ad" });
    }
  });

  // Reorder email ads
  app.post('/api/email-lists/:listId/reorder', isAuthenticated, async (req, res) => {
    try {
      const { adOrders } = req.body;
      if (!Array.isArray(adOrders)) {
        return res.status(400).json({ message: "adOrders must be an array" });
      }
      await storage.reorderEmailAds(adOrders);
      const ads = await storage.getEmailAdsByListOrdered(req.params.listId);
      res.json({ ads });
    } catch (error) {
      console.error("Error reordering email ads:", error);
      res.status(500).json({ message: "Failed to reorder email ads" });
    }
  });

  // Get embed metadata for email list
  app.get('/api/email-lists/:listId/embed-metadata', isAuthenticated, async (req, res) => {
    try {
      const list = await storage.getEmailList(req.params.listId);
      if (!list) {
        return res.status(404).json({ message: "Email list not found" });
      }
      const ads = await storage.getEmailAdsByListOrdered(req.params.listId);
      res.json({ list, ads });
    } catch (error) {
      console.error("Error fetching embed metadata:", error);
      res.status(500).json({ message: "Failed to fetch embed metadata" });
    }
  });

  // ============ PUBLIC EMAIL AD ENDPOINTS ============

  // Serve rotating ad image (tracks impression)
  app.get('/api/email/ad.png', async (req, res) => {
    try {
      const { property, send, sub, sub1, esp, w, h } = req.query;
      
      if (!property) {
        return res.status(400).send('Missing property parameter');
      }
      
      const list = await storage.getEmailListBySlug(property as string);
      if (!list || !list.isActive) {
        return res.status(404).send('List not found');
      }
      
      const ad = await storage.getNextRotatingEmailAd(list.id);
      if (!ad) {
        return res.status(404).send('No active ads');
      }
      
      // Track impression
      await storage.incrementEmailAdImpressions(ad.id);
      await storage.recordEmailAdImpression({
        adId: ad.id,
        listId: list.id,
        sendId: send as string,
        sub: sub as string,
        sub1: sub1 as string,
        esp: esp as string,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      
      // Determine which image to serve (mobile vs desktop)
      const requestedWidth = parseInt(w as string) || list.defaultWidth;
      const isMobile = requestedWidth <= 400;
      const selectedImageUrl = (isMobile && ad.mobileImageUrl) ? ad.mobileImageUrl : ad.imageUrl;
      
      // Redirect to the ad image with cache-busting
      const imageUrl = selectedImageUrl.includes('?') 
        ? `${selectedImageUrl}&cb=${Date.now()}` 
        : `${selectedImageUrl}?cb=${Date.now()}`;
      
      res.redirect(302, imageUrl);
    } catch (error) {
      console.error("Error serving email ad:", error);
      res.status(500).send('Error');
    }
  });

  // Track click and redirect to offer
  app.get('/api/email/click', async (req, res) => {
    try {
      const { property, send, sub, sub1, esp, ad: adId } = req.query;
      
      if (!property) {
        return res.status(400).send('Missing property parameter');
      }
      
      const list = await storage.getEmailListBySlug(property as string);
      if (!list) {
        return res.status(404).send('List not found');
      }
      
      let ad;
      if (adId) {
        ad = await storage.getEmailAd(adId as string);
      }
      
      if (!ad) {
        ad = await storage.getNextRotatingEmailAd(list.id);
      }
      
      if (!ad) {
        return res.status(404).send('No active ads');
      }
      
      // Track click
      await storage.incrementEmailAdClicks(ad.id);
      await storage.recordEmailAdClick({
        adId: ad.id,
        listId: list.id,
        sendId: send as string,
        sub: sub as string,
        sub1: sub1 as string,
        esp: esp as string,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      
      // Build Tune click URL with sub parameters
      const trackingDomain = ad.trackingDomain || 'track.modemobile.com';
      let clickUrl = `https://${trackingDomain}/aff_c?offer_id=${ad.tuneOfferId}&aff_id=${ad.affiliateId}`;
      
      if (sub) clickUrl += `&aff_sub=${encodeURIComponent(sub as string)}`;
      if (sub1) clickUrl += `&aff_sub2=${encodeURIComponent(sub1 as string)}`;
      if (send) clickUrl += `&aff_sub3=${encodeURIComponent(send as string)}`;
      if (esp) clickUrl += `&aff_sub4=${encodeURIComponent(esp as string)}`;
      
      res.redirect(302, clickUrl);
    } catch (error) {
      console.error("Error tracking email click:", error);
      res.status(500).send('Error');
    }
  });

  // Get current rotating ad data (for dynamic email rendering)
  app.get('/api/email/ad/:listSlug', async (req, res) => {
    try {
      const list = await storage.getEmailListBySlug(req.params.listSlug);
      if (!list || !list.isActive) {
        return res.status(404).json({ message: "List not found" });
      }
      
      const ad = await storage.getNextRotatingEmailAd(list.id);
      if (!ad) {
        return res.status(404).json({ message: "No active ads" });
      }
      
      // Track impression
      await storage.incrementEmailAdImpressions(ad.id);
      
      const trackingDomain = ad.trackingDomain || 'track.modemobile.com';
      const clickUrl = `https://${trackingDomain}/aff_c?offer_id=${ad.tuneOfferId}&aff_id=${ad.affiliateId}`;
      
      res.json({
        id: ad.id,
        title: ad.title,
        imageUrl: ad.imageUrl,
        buttonText: ad.buttonText,
        clickUrl,
        listSlug: list.slug,
      });
    } catch (error) {
      console.error("Error fetching email ad:", error);
      res.status(500).json({ message: "Failed to fetch ad" });
    }
  });

  app.get('/api/email/subject', async (req, res) => {
    try {
      const { property, sid, type } = req.query;
      
      if (!property) {
        return res.status(400).send('');
      }
      
      const list = await storage.getEmailListBySlug(property as string);
      if (!list || !list.isActive) {
        return res.status(404).send('');
      }
      
      const adType = (type as string) || 'text';
      let ad: any;
      
      if (sid) {
        ad = await storage.getEmailAdBySid(list.id, sid as string, adType);
      } else {
        const activeAds = await storage.getActiveEmailAdsByListOrdered(list.id);
        const filtered = activeAds.filter(a => a.adType === adType);
        ad = filtered.length > 0 ? filtered[0] : undefined;
      }
      
      if (!ad || !ad.subjectLine) {
        return res.status(404).send('');
      }
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(ad.subjectLine);
    } catch (error) {
      console.error("Error serving subject line:", error);
      res.status(500).send('');
    }
  });

  // Serve text ad as email-safe HTML (for text-based email ad units)
  app.get('/api/email/text-ad', async (req, res) => {
    try {
      const { property, send, sub, sub1, esp, sid } = req.query;
      
      if (!property) {
        return res.status(400).send('Missing property parameter');
      }
      
      const list = await storage.getEmailListBySlug(property as string);
      if (!list || !list.isActive) {
        return res.status(404).send('List not found');
      }
      
      let ad;
      if (sid) {
        ad = await storage.getEmailAdBySid(list.id, sid as string, 'text');
      } else {
        ad = await storage.getNextRotatingEmailAd(list.id);
        if (ad && ad.adType !== 'text') ad = undefined;
      }
      if (!ad) {
        return res.status(404).send('No active text ads');
      }
      
      await storage.incrementEmailAdImpressions(ad.id);
      await storage.recordEmailAdImpression({
        adId: ad.id,
        listId: list.id,
        sendId: send as string,
        sub: sub as string,
        sub1: sub1 as string,
        esp: esp as string,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      
      const trackingDomain = ad.trackingDomain || 'track.modemobile.com';
      let clickUrl = `https://${trackingDomain}/aff_c?offer_id=${ad.tuneOfferId}&aff_id=${ad.affiliateId}`;
      if (sub) clickUrl += `&aff_sub=${encodeURIComponent(sub as string)}`;
      if (sub1) clickUrl += `&aff_sub2=${encodeURIComponent(sub1 as string)}`;
      if (send) clickUrl += `&aff_sub3=${encodeURIComponent(send as string)}`;
      if (esp) clickUrl += `&aff_sub4=${encodeURIComponent(esp as string)}`;
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      let trackClickUrl = `${baseUrl}/api/email/click?property=${encodeURIComponent(property as string)}&ad=${ad.id}`;
      if (send) trackClickUrl += `&send=${encodeURIComponent(send as string)}`;
      if (sub) trackClickUrl += `&sub=${encodeURIComponent(sub as string)}`;
      if (sub1) trackClickUrl += `&sub1=${encodeURIComponent(sub1 as string)}`;
      if (esp) trackClickUrl += `&esp=${encodeURIComponent(esp as string)}`;
      
      const fontSize = ad.fontSize || 14;
      const textColor = ad.textColor || '#333333';
      const linkColor = ad.linkColor || '#0066cc';
      const buttonColor = ad.buttonColor || '#4CAF50';
      const buttonText = ad.buttonText || 'CONTINUE';
      const ctaText = ad.ctaText || '';
      
      let bodyContent = (ad.bodyHtml || '').replace(/\n/g, '<br>');
      bodyContent = bodyContent.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        `<a href="${trackClickUrl}" style="color:${linkColor};text-decoration:underline;font-weight:600" target="_blank">$1</a>`
      );
      
      let ctaRow = '';
      if (ctaText) {
        ctaRow = `<tr><td style="padding:12px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:${fontSize}px;line-height:1.6;color:${textColor}"><a href="${trackClickUrl}" style="color:${linkColor};text-decoration:underline;font-weight:600" target="_blank">${ctaText}</a></td></tr>`;
      }
      
      let buttonRow = '';
      if (buttonText) {
        buttonRow = `<tr><td align="center" style="padding:16px 0 4px"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${trackClickUrl}" style="height:44px;v-text-anchor:middle;width:220px" arcsize="10%" stroke="f" fillcolor="${buttonColor}"><w:anchorlock/><center style="color:#fff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold">${buttonText}</center></v:roundrect><![endif]--><!--[if !mso]><!--><a href="${trackClickUrl}" target="_blank" style="display:inline-block;background-color:${buttonColor};color:#fff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:12px 40px;border-radius:4px;text-align:center">${buttonText}</a><!--<![endif]--></td></tr>`;
      }
      
      const html = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:${fontSize}px;line-height:1.6;color:${textColor};padding:0">${bodyContent}</td></tr>${ctaRow}${buttonRow}</table>`;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(html);
    } catch (error) {
      console.error("Error serving text ad:", error);
      res.status(500).send('Error');
    }
  });

  // Get text ad data as JSON (for preview and embed code generation)
  app.get('/api/email/text-ad/:listSlug', async (req, res) => {
    try {
      const list = await storage.getEmailListBySlug(req.params.listSlug);
      if (!list || !list.isActive) {
        return res.status(404).json({ message: "List not found" });
      }
      
      const activeAds = await storage.getActiveEmailAdsByListOrdered(list.id);
      const textAds = activeAds.filter(a => a.adType === 'text');
      
      if (textAds.length === 0) {
        return res.status(404).json({ message: "No active text ads" });
      }
      
      const ad = textAds[0];
      const trackingDomain = ad.trackingDomain || 'track.modemobile.com';
      const clickUrl = `https://${trackingDomain}/aff_c?offer_id=${ad.tuneOfferId}&aff_id=${ad.affiliateId}`;
      
      res.json({
        id: ad.id,
        title: ad.title,
        bodyHtml: ad.bodyHtml,
        ctaText: ad.ctaText,
        buttonText: ad.buttonText,
        buttonColor: ad.buttonColor,
        linkColor: ad.linkColor,
        textColor: ad.textColor,
        fontSize: ad.fontSize,
        clickUrl,
        listSlug: list.slug,
      });
    } catch (error) {
      console.error("Error fetching text ad:", error);
      res.status(500).json({ message: "Failed to fetch text ad" });
    }
  });

  // ===========================================================================
  // MMM Ad Revenue Intelligence
  // Read the joined snapshot written by the Python pipeline + trigger runs.
  // ===========================================================================
  const parseDays = (raw: unknown, fallback: number) => {
    const n = parseInt(String(raw ?? ""), 10);
    if (Number.isNaN(n) || n < 1) return fallback;
    return Math.min(n, 365);
  };

  app.get('/api/mmm/performance', isAuthenticated, async (req, res) => {
    try {
      const days = parseDays(req.query.days, 30);
      const [creatives, dailyTotals] = await Promise.all([
        storage.getMmmCreativePerformance(days),
        storage.getMmmDailyTotals(days),
      ]);
      res.json({ days, creatives, dailyTotals });
    } catch (error) {
      console.error("Error fetching MMM performance:", error);
      res.status(500).json({ message: "Failed to fetch MMM performance" });
    }
  });

  app.get('/api/mmm/creative/:key', isAuthenticated, async (req, res) => {
    try {
      const days = parseDays(req.query.days, 90);
      const detail = await storage.getMmmCreativeDetail(req.params.key, days);
      res.json({ compoundKey: req.params.key, days, detail });
    } catch (error) {
      console.error("Error fetching MMM creative detail:", error);
      res.status(500).json({ message: "Failed to fetch MMM creative detail" });
    }
  });

  app.get('/api/mmm/runs', isAuthenticated, async (req, res) => {
    try {
      const limit = parseDays(req.query.limit, 50);
      const [runs, latest] = await Promise.all([
        storage.getMmmRuns(limit),
        storage.getMmmLatestRun(),
      ]);
      res.json({ runs, latest });
    } catch (error) {
      console.error("Error fetching MMM runs:", error);
      res.status(500).json({ message: "Failed to fetch MMM runs" });
    }
  });

  const MMM_RUN_STALE_MS = 30 * 60 * 1000; // a "running" row older than this is stale

  app.post('/api/mmm/run', isAuthenticated, async (_req, res) => {
    try {
      // Refuse a second run only while one is genuinely in progress. A row can
      // get stuck in "running" if the detached child is killed (deploy restart,
      // OOM) before finish_run_log fires — treat such stale rows as finished so
      // Run Now is never permanently bricked.
      const latest = await storage.getMmmLatestRun();
      if (latest && latest.status === "running") {
        const startedMs = latest.startedAt ? new Date(latest.startedAt).getTime() : 0;
        const isFresh = startedMs > 0 && Date.now() - startedMs < MMM_RUN_STALE_MS;
        if (isFresh) {
          return res.status(409).json({ message: "A pipeline run is already in progress" });
        }
      }

      const pkgDir = path.join(process.cwd(), "mmm-pipeline-package");
      const child = spawn("python3", ["pipeline/run_intraday.py"], {
        cwd: pkgDir,
        detached: true,
        stdio: "ignore",
        env: process.env,
      });
      child.on("error", (err) => {
        console.error("Failed to spawn MMM intraday run:", err);
      });
      child.unref();

      res.status(202).json({ message: "Intraday pipeline run started" });
    } catch (error) {
      console.error("Error triggering MMM run:", error);
      res.status(500).json({ message: "Failed to trigger MMM run" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
