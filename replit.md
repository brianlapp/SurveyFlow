# Overview

A multi-brand co-registration platform designed to transform user engagement into revenue through intelligent survey flows and offer optimization. The platform targets $3+ revenue per user through strategic offer placement and smart question sequencing, featuring two main brands: ModeFreeFinds.com (consumer goods) and ModeMarketMunchies.com (finance/investing). The system includes a comprehensive admin dashboard for managing surveys, offers, revenue tracking with real-time analytics, and brand configuration management.

# Recent Changes

## Latest Updates (October 2, 2025)
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