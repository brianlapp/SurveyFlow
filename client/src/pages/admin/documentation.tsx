import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  BookOpen, 
  Users, 
  FileQuestion, 
  Gift, 
  DollarSign, 
  Settings as SettingsIcon,
  BarChart3,
  Eye
} from "lucide-react";

export default function Documentation() {
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Platform Documentation</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive guide to understanding and managing the co-registration platform
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-4" defaultValue="overview">
        {/* Platform Overview */}
        <AccordionItem value="overview" className="border rounded-lg px-6 bg-card">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Platform Overview</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            <p className="text-muted-foreground">
              This is a multi-brand co-registration platform designed to transform user engagement into revenue through intelligent survey flows and offer optimization.
            </p>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Core Concept</h3>
              <p>The platform targets <strong>$3+ revenue per user</strong> through strategic offer placement and smart question sequencing.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Key Features</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Multi-Brand Support:</strong> ModeFreeFinds.com (consumer goods) and ModeMarketMunchies.com (finance/investing)</li>
                <li><strong>Intelligent Survey Flow:</strong> 4-step process optimized for maximum engagement</li>
                <li><strong>Smart Offer Targeting:</strong> Display offers at specific pages or after specific questions</li>
                <li><strong>Revenue Tracking:</strong> Real-time analytics and postback management</li>
                <li><strong>Live Preview Mode:</strong> Test survey flow without database pollution</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">User Journey</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>Step 1:</strong> Registration (name, age, gender, contact info)</p>
                <p><strong>Step 2:</strong> Survey Questions (12 questions with offers displayed after specific questions)</p>
                <p><strong>Step 3:</strong> Main Offers Page (bulk offers display)</p>
                <p><strong>Step 4:</strong> Exit Lottery (final offers before giveaway entry confirmation)</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* User Management */}
        <AccordionItem value="users" className="border rounded-lg px-6 bg-card">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">User Management</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            <p className="text-muted-foreground">
              Track and manage survey participants (end users) who go through your survey flow.
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-2">User Data Captured</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Personal Info:</strong> Name, age range, gender</li>
                <li><strong>Contact Info:</strong> Email, phone number</li>
                <li><strong>Location:</strong> Address, city, state, zip code</li>
                <li><strong>Session Info:</strong> Session ID, brand, IP address, user agent</li>
                <li><strong>Completion Status:</strong> Track which step user is on</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Viewing User Details</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>1.</strong> Navigate to Users page from admin sidebar</p>
                <p><strong>2.</strong> Click the Eye icon next to any user</p>
                <p><strong>3.</strong> View complete profile and survey responses</p>
                <p className="text-sm text-muted-foreground mt-4">
                  The detail view shows all survey answers with question text, categories, and response timestamps.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">User Filtering</h3>
              <p>Filter users by completion status, brand, or search by name/email to quickly find specific participants.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Survey Questions */}
        <AccordionItem value="questions" className="border rounded-lg px-6 bg-card">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <FileQuestion className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Survey Questions</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            <p className="text-muted-foreground">
              Manage the 12 standardized questions that users answer during Step 2 of the survey flow.
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-2">Question Structure</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Text:</strong> The actual question displayed to users</li>
                <li><strong>Category:</strong> Group questions by topic (e.g., Demographics, Interests)</li>
                <li><strong>Input Type:</strong> text, textarea, select, radio, checkbox, number</li>
                <li><strong>Options:</strong> For select/radio/checkbox types</li>
                <li><strong>Order:</strong> Questions display in order (0-11)</li>
                <li><strong>Status:</strong> Active questions appear in survey, inactive are hidden</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Creating/Editing Questions</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>1.</strong> Click "Create Question" or Edit icon</p>
                <p><strong>2.</strong> Fill in question text and category</p>
                <p><strong>3.</strong> Choose input type (determines how users answer)</p>
                <p><strong>4.</strong> For select/radio/checkbox: add options (one per line)</p>
                <p><strong>5.</strong> Set order index (0 = first question)</p>
                <p><strong>6.</strong> Mark as Active to display in survey</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Question-Based Offer Targeting</h3>
              <p className="text-sm">
                Questions serve as targeting anchors for offers. When creating offers, you can select specific questions - 
                the offer will display immediately after the user answers those questions.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Offers & Targeting */}
        <AccordionItem value="offers" className="border rounded-lg px-6 bg-card">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Gift className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Offers & Targeting</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            <p className="text-muted-foreground">
              Manage co-registration offers with three distinct types and flexible targeting options.
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-2">Three Offer Types</h3>
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <p className="font-semibold">1. Tune Standard (Tracking + Pixel)</p>
                  <p className="text-sm">Clickable image ads with impression tracking. Auto-generates impression pixels for Tune domains.</p>
                  <p className="text-xs text-muted-foreground mt-1">Fields: Image URL, Click URL, Impression Pixel URL</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg">
                  <p className="font-semibold">2. Popup Script</p>
                  <p className="text-sm">JavaScript modal popups that execute on page load.</p>
                  <p className="text-xs text-muted-foreground mt-1">Fields: Script Content (raw JavaScript/HTML)</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                  <p className="font-semibold">3. Next Link (Coreg)</p>
                  <p className="text-sm">Teal "Next" button that navigates to external signup flow.</p>
                  <p className="text-xs text-muted-foreground mt-1">Fields: Link URL, Link Text</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Targeting Options</h3>
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div>
                  <p className="font-semibold">Page-Based Targeting</p>
                  <p className="text-sm">Display offers on specific pages (one-time display):</p>
                  <ul className="list-disc list-inside ml-4 text-sm">
                    <li>Page 5: Registration page</li>
                    <li>Page 15: Main offers page</li>
                    <li>Page 20: Exit lottery page</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold">Question-Based Targeting</p>
                  <p className="text-sm">Display offers after specific survey questions. Select one or more questions - the offer appears immediately after user answers.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Note:</strong> Question targeting overrides page targeting. If questionIds array is not empty, displayPages is ignored.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Creating Offers</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>1.</strong> Click "Create Offer" button</p>
                <p><strong>2.</strong> Enter basic info: name, category, payout, description</p>
                <p><strong>3.</strong> Choose offer type (determines which fields appear)</p>
                <p><strong>4.</strong> Fill type-specific fields (URLs, scripts, etc.)</p>
                <p><strong>5.</strong> Set targeting: select pages OR questions (not both)</p>
                <p><strong>6.</strong> Mark as Active and save</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Offer Table Layout</h3>
              <p className="text-sm mb-2">
                The offers page uses an affiliate dashboard-style table for easy comparison:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li><strong>Offer Name:</strong> Quick identification</li>
                <li><strong>Type:</strong> Visual badge (Tune/Popup/Link)</li>
                <li><strong>Payout:</strong> Revenue per conversion</li>
                <li><strong>Conv. Rate:</strong> Conversion percentage</li>
                <li><strong>Revenue:</strong> Total earnings from offer</li>
                <li><strong>Conversions:</strong> Number of successful conversions</li>
                <li><strong>Targeting:</strong> Badge showing pages/questions count</li>
                <li><strong>Status:</strong> Active/Paused/Inactive</li>
                <li><strong>Actions:</strong> Edit, Pause/Play toggle, Delete</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Edit Modal Preview</h3>
              <p className="text-sm">
                When editing offers, the modal shows a live preview of how the offer appears to users.
                Desktop layout displays details on the left (2/3 width) and preview on the right (1/3 width).
                Mobile layout stacks preview below details.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Revenue & Postbacks */}
        <AccordionItem value="revenue" className="border rounded-lg px-6 bg-card">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Revenue & Postbacks</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            <p className="text-muted-foreground">
              Smart postback system ensures we only fire affiliate postbacks after reaching the $3.00 revenue threshold per user.
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-2">How It Works</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>1.</strong> User interacts with offers (clicks, impressions)</p>
                <p><strong>2.</strong> System tracks cumulative revenue per user session</p>
                <p><strong>3.</strong> Once user reaches $3.00, system fires postbacks to affiliates</p>
                <p><strong>4.</strong> Daily stats aggregate total revenue, conversions, and payouts</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Revenue Tables</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Offer Interactions:</strong> Every click/impression with timestamp and payout</li>
                <li><strong>Postbacks:</strong> Record of when postbacks were fired to affiliates</li>
                <li><strong>Daily Stats:</strong> Aggregated metrics per day (conversions, revenue, users)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Viewing Revenue Analytics</h3>
              <p className="text-sm mb-2">
                Navigate to Revenue page from admin sidebar to view:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>Total revenue across all offers</li>
                <li>Per-offer performance metrics</li>
                <li>Conversion rates and trends</li>
                <li>Daily revenue charts</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Postback Configuration</h3>
              <p className="text-sm">
                Each offer can have a postback URL configured in the offer settings. When the $3 threshold is reached,
                the system automatically fires the postback with user session data and revenue information.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Brand Configuration */}
        <AccordionItem value="brands" className="border rounded-lg px-6 bg-card">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Brand Configuration</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            <p className="text-muted-foreground">
              Manage the two distinct brand experiences: ModeFreeFinds.com and ModeMarketMunchies.com.
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-2">Brand Settings</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Name:</strong> Brand display name</li>
                <li><strong>Domain:</strong> Website domain (e.g., modefrefeinds.com)</li>
                <li><strong>Description:</strong> Brief description of brand focus</li>
                <li><strong>Theme Color:</strong> Primary color for branding</li>
                <li><strong>Focus Area:</strong> Target market (consumer goods, finance, etc.)</li>
                <li><strong>Status:</strong> Active brands appear in survey selector</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Configuring Brands</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>1.</strong> Navigate to Brands page from admin sidebar</p>
                <p><strong>2.</strong> Click "Configure" button next to brand</p>
                <p><strong>3.</strong> Update brand settings in modal dialog</p>
                <p><strong>4.</strong> Changes persist immediately</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Brand Selection</h3>
              <p className="text-sm">
                When users land on the platform, they select which brand's survey flow to enter.
                Each brand can have different offers, questions, and giveaway products.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Analytics & Reports */}
        <AccordionItem value="analytics" className="border rounded-lg px-6 bg-card">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Analytics & Reports</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            <p className="text-muted-foreground">
              Comprehensive analytics to track performance, conversions, and user engagement.
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-2">Dashboard Metrics</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Total Users:</strong> Number of survey participants</li>
                <li><strong>Active Offers:</strong> Currently running offers</li>
                <li><strong>Total Revenue:</strong> Cumulative earnings</li>
                <li><strong>Avg Revenue Per User:</strong> Efficiency metric (target: $3+)</li>
                <li><strong>Completion Rate:</strong> % of users who finish survey</li>
                <li><strong>Conversion Rate:</strong> % of users who convert on offers</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Survey Preview Tool</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-semibold">Location: /admin/survey-preview</p>
                <p className="text-sm">
                  Shows which offers appear on each page based on displayPages configuration with summary statistics.
                  Useful for planning offer distribution and avoiding oversaturation.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Analytics Page</h3>
              <p className="text-sm mb-2">
                View detailed charts and graphs showing:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>Revenue trends over time</li>
                <li>Conversion funnel visualization</li>
                <li>Top performing offers</li>
                <li>User drop-off points</li>
                <li>Brand comparison metrics</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Live Preview Mode */}
        <AccordionItem value="livepreview" className="border rounded-lg px-6 bg-card">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Live Preview Mode</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            <p className="text-muted-foreground">
              Test the exact user-facing survey experience without saving any data to the database.
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-2">Accessing Live Preview</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>1.</strong> Navigate to Admin Dashboard</p>
                <p><strong>2.</strong> Click "Live Preview" button in header</p>
                <p><strong>3.</strong> Experience the survey flow as a user would see it</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">How It Works</h3>
              <p className="mb-2">Live Preview mode creates a special session ID starting with "preview_" and:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Auto-advances:</strong> Click Continue to instantly fill forms and move forward</li>
                <li><strong>Zero database writes:</strong> No data saved to users, responses, or interactions tables</li>
                <li><strong>Full experience:</strong> See all offers, questions, and pages exactly as users do</li>
                <li><strong>Safe testing:</strong> No impact on analytics or revenue tracking</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">What to Test</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm"><strong>✓</strong> Offer placement and targeting</p>
                <p className="text-sm"><strong>✓</strong> Question flow and ordering</p>
                <p className="text-sm"><strong>✓</strong> Visual appearance of different offer types</p>
                <p className="text-sm"><strong>✓</strong> Navigation between steps</p>
                <p className="text-sm"><strong>✓</strong> Giveaway product images</p>
                <p className="text-sm"><strong>✓</strong> Mobile responsiveness</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Key Differences from Production</h3>
              <ol className="list-decimal list-inside space-y-1 ml-4 text-sm">
                <li>Auto-fill on Continue clicks (production requires manual input)</li>
                <li>No database saves (production records everything)</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                Everything else mirrors production exactly - same offers, same questions, same targeting logic.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
