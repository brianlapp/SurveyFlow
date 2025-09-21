import OpenAI from "openai";

class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key",
    });
  }

  async generateQuestions(category: string, count: number = 10) {
    try {
      // Use GPT-4 as it's the most capable available model
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a survey question generator for a co-registration platform. Generate engaging, relevant survey questions that will help profile users for targeted offers. Focus on the ${category} category. Return your response in JSON format.`,
          },
          {
            role: "user",
            content: `Generate ${count} survey questions for the ${category} category. Each question should have:
            - text: The question text
            - type: one of "multiple_choice", "yes_no", "text", "multiple_select"
            - options: array of options for multiple choice questions (null for text questions)
            - category: "${category}"
            - isRequired: boolean
            
            Make the questions engaging and relevant for profiling users. Avoid sensitive personal information.
            
            Respond with JSON in this format: { "questions": [...] }`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.questions || [];
    } catch (error) {
      console.error('Error generating questions with OpenAI:', error);
      throw new Error('Failed to generate questions');
    }
  }

  async optimizeQuestionPerformance(questions: any[], performanceData: any[]) {
    try {
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an AI optimization expert for survey questions. Analyze question performance and provide optimization recommendations.",
          },
          {
            role: "user",
            content: `Analyze these survey questions and their performance data to provide optimization recommendations:
            
            Questions: ${JSON.stringify(questions)}
            Performance Data: ${JSON.stringify(performanceData)}
            
            Provide recommendations for:
            1. Questions to retire (low performance)
            2. Questions to promote (high performance)
            3. New question variations to test
            4. Order optimization suggestions
            
            Respond with JSON in this format: { "recommendations": { "retire": [...], "promote": [...], "newVariations": [...], "orderOptimization": [...] } }`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.recommendations || {};
    } catch (error) {
      console.error('Error optimizing questions with OpenAI:', error);
      throw new Error('Failed to optimize questions');
    }
  }

  async generateOfferRecommendations(userProfile: any, availableOffers: any[]) {
    try {
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an AI recommendation engine for co-registration offers. Analyze user profiles to recommend the most relevant offers.",
          },
          {
            role: "user",
            content: `Based on this user profile, recommend the most relevant offers from the available list:
            
            User Profile: ${JSON.stringify(userProfile)}
            Available Offers: ${JSON.stringify(availableOffers)}
            
            Consider factors like:
            - Demographics match
            - Interest alignment
            - Previous behavior patterns
            - Offer performance history
            
            Respond with JSON in this format: { "recommendations": [{"offerId": "...", "relevanceScore": 0.95, "reasoning": "..."}] }`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.recommendations || [];
    } catch (error) {
      console.error('Error generating offer recommendations with OpenAI:', error);
      throw new Error('Failed to generate offer recommendations');
    }
  }

  async generateBatchQuestions(totalQuestions: number = 75): Promise<any[]> {
    // Limit to top 6 categories for faster processing
    const demographicCategories = [
      'Demographics', 'Lifestyle', 'Technology', 
      'Financial Services', 'Health & Wellness', 'Entertainment'
    ];

    const questionsPerCategory = Math.ceil(totalQuestions / demographicCategories.length);
    const allGeneratedQuestions: any[] = [];

    console.log(`🚀 Starting AI batch generation: ${totalQuestions} questions across ${demographicCategories.length} categories`);

    try {
      // Process categories in parallel for faster generation
      const categoryPromises = demographicCategories.map(async (category, i) => {
        console.log(`📝 Generating ${questionsPerCategory} questions for ${category}... (${i + 1}/${demographicCategories.length})`);
        
        try {
          // Allow 25 seconds per category for OpenAI API calls
          const categoryQuestions = await Promise.race([
            this.generateQuestions(category, questionsPerCategory),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout for ${category}`)), 25000))
          ]) as any[];
          
          console.log(`✅ Generated ${categoryQuestions.length} questions for ${category}`);
          return { category, questions: categoryQuestions, success: true };
          
        } catch (categoryError) {
          const errorMsg = categoryError instanceof Error ? categoryError.message : String(categoryError);
          console.error(`❌ Failed to generate questions for ${category}:`, errorMsg);
          return { category, questions: [], success: false, error: errorMsg };
        }
      });

      // Wait for all categories to complete (or timeout)
      const results = await Promise.all(categoryPromises);
      
      // Collect all successful questions
      results.forEach(result => {
        if (result.success) {
          allGeneratedQuestions.push(...result.questions);
        }
      });

      // Trim to exact count if needed
      const finalQuestions = allGeneratedQuestions.slice(0, totalQuestions);
      
      const successCount = results.filter(r => r.success).length;
      console.log(`🎉 AI batch generation completed: ${finalQuestions.length} questions generated from ${successCount}/${demographicCategories.length} categories`);
      
      return finalQuestions;

    } catch (error) {
      console.error('💥 Critical error in batch question generation:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error('Failed to generate batch questions: ' + errorMsg);
    }
  }

  async runDailyQuestionGeneration(): Promise<{success: boolean, questionsGenerated: number, error?: string}> {
    try {
      const batchSize = Math.floor(Math.random() * 51) + 50; // Random between 50-100
      console.log(`Daily AI generation started: Creating ${batchSize} questions`);

      const questions = await this.generateBatchQuestions(batchSize);
      
      // Here we would typically save to database via storage service
      // For now, return the results for the API to handle
      
      return {
        success: true,
        questionsGenerated: questions.length
      };
      
    } catch (error) {
      console.error('Daily question generation failed:', error);
      return {
        success: false,
        questionsGenerated: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const openaiService = new OpenAIService();
