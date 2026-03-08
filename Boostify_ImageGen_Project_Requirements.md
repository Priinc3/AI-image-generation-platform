# Boostify ImageGen Platform - Project Requirements & Developer Handoff

## Project Overview
We are building a comprehensive, user-friendly SaaS platform for AI-powered product image generation. The primary goal is to completely redesign and develop the frontend from scratch, integrating with our existing backend workflows (n8n webhooks) and Supabase database/authentication.

**Timeline:**
- **Start Date:** Immediate
- **Target Deadline:** March 16th, 2026 (1-week development sprint)

## Core Architecture & Tech Stack
- **Frontend Framework:** Next.js (React) - App Router
- **Styling:** Modern, clean, professional UI (White/Light theme by default). Premium animations and glassmorphism where appropriate.
- **Authentication & Database:** Supabase
- **Workflow Automation:** n8n (External webhooks)
- **Object Storage:** AWS S3 (for storing generated images)

---

## Key Features & Page Requirements

### 1. Authentication (Login / Signup)
- **Flow:** Users must sign up or log in to access the platform.
- **Provider:** Supabase Auth (Phone Number / OTP).
- **Default Credits:** New signups automatically receive $6 worth of free credits.
- **Route Protection:** Unauthenticated users should be redirected to the login page.

### 2. Pricing & Subscription Plans
The platform will offer the following tiers:
- **Free Plan:** $6 initial credits (Free)
- **Plus Plan:** High quality, $50 credits/month — **₹250 INR**
- **Pro Plan:** High quality, $100 credits/month — **₹499 INR**
- **Enterprise Plan:** Custom workflows, very high quality — **Contact us at contact@boostifycorp.dev**

### 3. Settings Page 
- **Note on Credentials:** The AWS S3 and n8n webhook URLs will be provided centrally by the client later. They should **not** be included as user-configurable inputs on the settings page.
- **User Profile:** Allow users to manage their basic profile information linked to their Supabase account.

### 4. Image Editor (Single Image Generation)
- **Uploads:** Allow up to 3 reference images (minimum 1 required).
- **Settings:** Prompt input, negative prompt, aspect ratio, style presets.
- **Execution:** Sends a payload containing the images, prompt, and logic parameters to the central n8n webhook.
- **UI UX:** Display a loading state with an animated progress bar and elapsed time while waiting for the webhook response.

### 5. Amazon PDP (Catalogue Generation)
- **Input:** Amazon Product URL/ASIN.
- **Execution:** Triggers the Amazon PDP webhook in n8n.
- **UI/UX:** Similar premium loading states and parameter configurations as the Image Editor.

### 6. Gallery
- **Functionality:** View previously generated images.
- **Storage:** Fetched directly from the user's configured AWS S3 bucket.
- **Features:** Lightbox view, download buttons, pagination/infinite scroll.

---

## Design Guidelines
- **Theme:** White/light theme by default. Clean, minimal, spacious, and professional.
- **Typography:** Modern sans-serif fonts (Inter, SF Pro, Geist).
- **Animations:** Include smooth, purposeful animations (hover states, loading spinners, page transitions).
- **Responsiveness:** Must work flawlessly on all screen sizes (Mobile, Tablet, Desktop).

## Developer Instructions
1. **GitHub Setup:** Clone the repository. The collaboration invite has been sent to Boostify.
2. **Environment Variables:** Set up your `.env.local` with Supabase URLs/Keys.
3. **Database Setup:** Ensure the Supabase migration script (`supabase-migration.sql`) has been executed to set up the `imagegen_user_settings` table and Row Level Security (RLS) policies.
4. **Code Quality:** Ensure modular, reusable components. Document complex logic.

**Contact:** If you face any blockers, reach out immediately to ensure we hit the March 16th deadline.
