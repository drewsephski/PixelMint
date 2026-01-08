# Track Specification: Core MVP

## Overview
This track focuses on building the foundational MVP for the AI image generation app. The goal is to provide a functional end-to-end workflow for social media managers to generate styled images using Fal.ai.

## User Stories
- As a user, I want to sign up and log in using Clerk so that my generations are saved.
- As a user, I want to enter a prompt, select a style, and choose an aspect ratio to generate an image.
- As a user, I want to see my generated images in a gallery.
- As a user, I want to download my generated images for social media use.

## Technical Requirements
- **Next.js App Router** for the frontend and API routes.
- **Clerk** for user authentication.
- **Supabase** for storing image metadata (URL, prompt, style, user_id).
- **Supabase Storage** for hosting generated image files.
- **Fal.ai API** for the core image generation (using models like Flux or SDXL).
- **Tailwind CSS & shadcn/ui** for a clean, professional interface.

## Success Criteria
- Successful user authentication flow.
- Working image generation with style/aspect ratio selection.
- Images correctly saved to Supabase and displayed in a user gallery.
- Mobile-responsive UI that allows downloading images.
