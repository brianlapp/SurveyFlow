# Overview

A multi-brand co-registration platform designed to transform user engagement into revenue through intelligent survey flows and offer optimization. The platform targets $3+ revenue per user through strategic offer placement and smart question sequencing, featuring two main brands: ModeFreeFinds.com (consumer goods) and ModeMarketMunchies.com (finance/investing). The system includes a comprehensive admin dashboard for managing surveys, offers, revenue tracking with real-time analytics, and brand configuration management.

# Recent Changes

## Latest Updates (January 13, 2026)
- **Thank You Page Manager**: New admin feature at `/admin/ty-brands` for creating branded post-conversion offer pages. Supports brand management (logo, font family, primary color, navigation items for FB compliance) and page management per brand (offer title, image, Tune offer ID + affiliate ID, button text). Public pages render at `/ty/{brand-slug}/{page-slug}` with mobile-first design, hamburger navigation, impression pixel firing, and click tracking. Includes embed code generator for iframe embedding on external sites. Database tables: ty_brands, ty_pages with impression/click metrics.
- **Postback Management Page**: New admin page at `/admin/postbacks` for comprehensive affiliate postback management. Features include: postback history table with status filtering (success/failed/pending), statistics dashboard (total postbacks, success rate, revenue posted, pending count), pending users monitor showing users at 80%+ of threshold with manual trigger capability, threshold configuration (default $3.00 threshold plus source-specific overrides), and Tune postback URL configuration with show/hide toggle. APIs: GET/PUT /api/postbacks/config, GET /api/postbacks/stats, GET /api/postbacks/pending-users, CRUD for thresholds.

## Previous Updates (November 3, 2025)
- **Comprehensive Documentation System**: Added dedicated documentation page at /admin/docs with 8 detailed sections covering platform overview, user management, survey questions, offers & targeting, revenue tracking, brand configuration, analytics, and live preview mode. Documentation accessible via sidebar navigation and help icon (?) in admin header with tooltip.
- **Affiliate Dashboard Table Layout**: Redesigned offers page from card grid to affiliate dashboard-style table for easy comparison of 20+ offers. Table displays columns: Offer Name, Type badge, Payout ($), Conversion rate (%), Total revenue ($), Conversions (#), Targeting (pages/questions badges), Status badge, Actions (Edit/Pause/Delete buttons). Column header clearly labeled "Offer Name" for easy identification.
- **Responsive Edit Modal Layout**: Restructured edit modal with side-by-side layout on desktop (form details on left 2/3 width, live preview on right 1/3 width) and stacked layout on mobile (preview below details). Preview section uses sticky positioning and displays offer appearance based on type (images for tune_standard, code snippets for popup_script, buttons for next_link) with consistent aspect-video containers.
- **Improved Offer Form Labels**: Updated targeting section labels to "Display on Pages (Non Survey Questions)" and "Display on Questions" for clearer distinction between one-time page-based targeting and question-specific targeting.
- **Form Bug Fixes**: Fixed checkbox unchecking bug in page display selector (was comparing number to object), and fixed description field to properly save empty/null values with clear "(Optional)" labeling.

## Previous Updates (October 28, 2025)
- **Live Preview Mode**: New admin feature at `/admin/live-preview` renders the exact user-facing survey experience without saving any data to the database. Click "Live Preview" button on admin dashboard to test the real survey flow with auto-fill on Continue clicks, instant navigation through all steps, and zero database pollution. All mutations (profile updates, survey responses, offer interactions) are safely skipped in preview mode.
- **DisplayPages Offer Filtering**: Fixed survey questions page (Step 2) to display offers filtered by displayPages settings. Offers now properly appear on three pages: survey questions (page 10), main offers (page 15), and exit lottery (page 20). Backend includes displayPages in API responses, frontend filters offers by current page number.

## Previous Updates (October 27, 2025)
- **Survey Flow Preview Tool**: Admin stats view at `/admin/survey-preview` showing which offers appear on each page based on displayPages configuration with summary statistics
- **Universal Tune Pixel Auto-Generation**: Enhanced automatic impression pixel generation to work with ANY Tune tracking domain (previously limited to go2cloud.org). Now detects path-based `/aff_c` pattern, supporting track.modemobile.com, go2cloud.org, and all other Tune/HasOffers domains. Maintains smart features: auto-generation with cachebuster, manual edit preservation, and clearing on URL changes.

## Previous Updates (October 2, 2025)
- **Two-Step Registration Form**: Split registration into Step 1 (name, age range, gender) and Step 2 (phone, zip, address, city, state) with validated progression between steps
- **Product Image on Survey Questions**: Implemented product giveaway image display above each survey question to motivate users through the survey flow ("carrot on a stick" psychology)
- **Field Binding Fixes**: Corrected registration form field bindings - age dropdown properly maps to age field with ranges (18-24, 25-34, etc.), gender buttons map to gender field

## Previous Updates (September 30, 2025)
- **Admin User Detail View**: Added Eye icon button on Users page to view individual user's complete survey responses with question details, categories, and tracking info
- **Brand Configuration Dialog**: Implemented Configure buttons on Brands page with fully controlled forms for managing brand settings (name, domain, description, theme, focus area, status)
- **State Persistence**: Brand configuration changes persist in session state and display correctly when reopening dialogs

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React SPA** with TypeScript using Vite as the build tool
- **UI Framework**: shadcn/ui components built on Radix UI primitives for consistent design
- **Styling**: Tailwind CSS with CSS variables for theming and dark mode support
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **Form Handling**: React Hook Form with Zod validation for type-safe forms

## Backend Architecture
- **Express.js** server with TypeScript
- **Authentication**: Replit Auth integration with OpenID Connect and session management
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection Pooling**: Neon serverless database with connection pooling
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple

## Database Design
- **Users Table**: Admin users with Replit Auth integration
- **End Users Table**: Survey participants with demographic data and session tracking
- **Questions Table**: Survey questions with conditional logic and categorization
- **Offers Table**: Co-registration offers with targeting and payout configuration
- **Responses Table**: User survey responses with question-answer mapping
- **Revenue Tracking**: Offer interactions, postbacks, and daily statistics tables
- **TY Brands/Pages**: Branded thank you page templates with inherited settings and per-page offer configuration

## Revenue System
- **Smart Postback Logic**: Tracks cumulative revenue per user and fires affiliate postbacks only after reaching $3.00 threshold
- **Offer Management**: CRUD operations with Tune API integration for offer details
- **Real-time Analytics**: Dashboard metrics for conversion rates, revenue tracking, and performance monitoring

## Security & Authentication
- **Admin Authentication**: Replit Auth with secure session management
- **Public Survey Access**: No authentication required for end users
- **CSRF Protection**: Express middleware for form submission security
- **Environment Variables**: Secure configuration for API keys and database credentials

# External Dependencies

## Database & Hosting
- **Neon Database**: Serverless PostgreSQL with connection pooling
- **Replit Hosting**: Platform hosting with integrated authentication

## Third-party APIs
- **Tune API**: Affiliate network integration for offer management and postback firing
- **OpenAI API**: GPT-5 integration for automated question generation and survey optimization

## Authentication
- **Replit Auth**: OpenID Connect provider for admin authentication
- **Session Management**: PostgreSQL-backed sessions with automatic cleanup

## UI Components & Styling
- **Radix UI**: Accessible component primitives for all UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide Icons**: Consistent iconography throughout the application

## Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Fast JavaScript bundling for production builds
- **TypeScript**: Type safety across frontend, backend, and shared schemas