# REPOSITORY INVENTORY

**Generated**: Complete deterministic inventory of TENERIFE-ACTIVITY repository  
**Total Size**: ~743 MB (includes node_modules and build artifacts)

---

## REPO ROOT

### ARCHITECTURE.md [type: file] [size: ~25 KB]
- SUMMARY: Architecture proposal document outlining technical architecture for Tenerife Activity platform, including Clean Architecture structure, layout system, design system, SEO strategy, i18n readiness, and technology stack decisions
- FIRST_LINES:
  1: # Tenerife Activity — Architecture Proposal
  2: 
  3: ## Executive Summary
  4: 
  5: This document outlines the technical architecture for Tenerife Activity, a premium international tourism platform. The architecture is designed to support:

### DESIGN_SYSTEM.md [type: file] [size: ~20 KB]
- SUMMARY: Design system component skeleton document defining component library structure, design principles, typography system, color system, spacing system, and component specifications for premium aesthetic
- FIRST_LINES:
  1: # Design System — Component Skeleton
  2: 
  3: ## Overview
  4: 
  5: This document defines the component library structure for Tenerife Activity. Components are organized by purpose and follow a premium, sober aesthetic.

### desktop.ini [type: file] [size: ~1 KB]
- SUMMARY: Windows desktop configuration file (system file)
- FIRST_LINES:
  1: [.ShellClassInfo]
  2: IconResource=C:\Windows\System32\imageres.dll,3

### FOUNDATION_COMPLETE.md [type: file] [size: ~7 KB]
- SUMMARY: Foundation implementation completion document summarizing all core systems implemented including layout system, design tokens, domain architecture, tracking system, and path aliases
- FIRST_LINES:
  1: # Foundation Implementation — Complete
  2: 
  3: ## Summary
  4: 
  5: The project foundation has been successfully implemented according to the architecture specifications. All core systems are in place and ready for page development.

### HOME_IMPLEMENTATION.md [type: file] [size: ~10 KB]
- SUMMARY: Home page implementation completion document detailing all components created, page structure, layout compliance, design system compliance, tracking implementation, and responsive behavior
- FIRST_LINES:
  1: # Home Page Implementation — Complete
  2: 
  3: ## Summary
  4: 
  5: The Home page has been successfully implemented with all required sections, components, and tracking integration.

### LAYOUT_SYSTEM.md [type: file] [size: ~12 KB]
- SUMMARY: Layout system technical specification defining Section, Container, and Grid components with usage examples, forbidden patterns, responsive behavior, and alignment guarantees
- FIRST_LINES:
  1: # Layout System — Technical Specification
  2: 
  3: ## Overview
  4: 
  5: The layout system enforces consistent spacing, alignment, and responsive behavior across all pages. It is built on two core primitives: **Section** and **Container**.

### LOGO_TRIMMING_INSTRUCTIONS.md [type: file] [size: ~5 KB]
- SUMMARY: Instructions for trimming logo PNG file to remove excessive transparent padding, including automated and manual methods
- FIRST_LINES:
  1: # Logo Trimming Instructions
  2: 
  3: ## Problem
  4: The logo PNG (`/public/logo.png`) has excessive transparent padding, making the visible logo appear tiny even when the container is large.

### PROPOSAL_SUMMARY.md [type: file] [size: ~8 KB]
- SUMMARY: Architecture proposal summary document with executive summary, key decisions, technical stack, project structure, component library overview, and validation questions
- FIRST_LINES:
  1: # Tenerife Activity — Architecture Proposal Summary
  2: 
  3: ## Executive Summary
  4: 
  5: This proposal outlines the technical foundation for Tenerife Activity, a premium international tourism platform. The architecture is designed to support professional operator partnerships, API integration, and international expansion while maintaining code quality and scalability.

### README.md [type: file] [size: ~4 KB]
- SUMMARY: Project README with tech stack information, getting started instructions, Windows setup notes, commands, project structure, architecture overview, and environment variables documentation
- FIRST_LINES:
  1: # Tenerife Activity
  2: 
  3: Premium international tourism platform for Tenerife experiences.
  4: 
  5: ## Tech Stack

### middleware.ts [type: file] [size: ~6 KB]
- SUMMARY: Next.js middleware handling locale routing, next-intl integration, legacy debug route rewrites, and nested locale path detection/fixing
- FIRST_LINES:
  1: import createMiddleware from 'next-intl/middleware'
  2: import { NextResponse } from 'next/server'
  3: import type { NextRequest } from 'next/server'
  4: import { locales } from './src/i18n/request'

### next-env.d.ts [type: file] [size: ~200 bytes]
- SUMMARY: Next.js TypeScript environment type definitions (auto-generated, should not be edited)
- FIRST_LINES:
  1: /// <reference types="next" />
  2: /// <reference types="next/image-types/global" />
  3: 
  4: // NOTE: This file should not be edited
  5: // see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.

### next.config.mjs [type: file] [size: ~800 bytes]
- SUMMARY: Next.js configuration file with next-intl plugin integration and webpack cache configuration for Windows development
- FIRST_LINES:
  1: import createNextIntlPlugin from 'next-intl/plugin'
  2: 
  3: const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
  4: 
  5: /** @type {import('next').NextConfig} */
  6: const nextConfig = {

### package.json [type: file] [size: ~1 KB]
- SUMMARY: Package.json with project metadata, scripts (dev, build, lint, typecheck, format, clean, thumbnails, i18n sync, smoke tests), and dependencies (Next.js 14, React 18, next-intl, TypeScript, Tailwind CSS)
- FIRST_LINES:
  1: {
  2:   "name": "tenerife-activity",
  3:   "version": "0.1.0",
  4:   "private": true,
  5:   "scripts": {

### pnpm-lock.yaml [type: file] [size: ~3900 KB]
- SUMMARY: pnpm lockfile containing dependency resolution information (binary/structured data, first 5 lines shown are header)
- FIRST_LINES:
  1: lockfileVersion: '9.0'
  2: 
  3: settings:
  4:   autoInstallPeers: true
  5:   excludeLinksFromLockfile: false

### pnpm-workspace.yaml [type: file] [size: ~100 bytes]
- SUMMARY: pnpm workspace configuration file
- FIRST_LINES:
  1: ignoredBuiltDependencies:
  2:   - unrs-resolver

### postcss.config.mjs [type: file] [size: ~400 bytes]
- SUMMARY: PostCSS configuration with Tailwind CSS and Autoprefixer plugins
- FIRST_LINES:
  1: /** @type {import('postcss-load-config').Config} */
  2: const config = {
  3:   plugins: {
  4:     tailwindcss: {},
  5:     autoprefixer: {},

### tailwind.config.ts [type: file] [size: ~3 KB]
- SUMMARY: Tailwind CSS configuration with custom design tokens (ocean/glass color palette, spacing scale, typography scale, font weights, container max-widths)
- FIRST_LINES:
  1: import type { Config } from 'tailwindcss'
  2: 
  3: const config: Config = {
  4:   content: [
  5:     './src/pages/**/*.{js,ts,jsx,tsx,mdx}',

### tsconfig.json [type: file] [size: ~1 KB]
- SUMMARY: TypeScript configuration with strict mode, path aliases (@/*, @/core/*, @/ui/*, @/data/*, @/config/*), and Next.js plugin
- FIRST_LINES:
  1: {
  2:   "compilerOptions": {
  3:     "target": "ES2017",
  4:     "lib": ["dom", "dom.iterable", "esnext"],
  5:     "types": ["node"],

### tsconfig.tsbuildinfo [type: file] [size: ~50 KB]
- SUMMARY: TypeScript incremental build information cache (binary)

---

## DIRECTORY: docs

### docs/atlantico-ip.md [type: file] [size: ~6 KB]
- SUMMARY: Guide for finding and whitelisting server IP address for Atlantico API, including deployment scenarios (Vercel, VPS, Docker, load balancer) and troubleshooting
- FIRST_LINES:
  1: # Atlantico API IP Whitelisting Guide
  2: 
  3: ## Overview
  4: 
  5: The Atlantico Excursiones API requires IP whitelisting. This means they need to know the **public egress IP address** of the server that makes API calls to their service.

### docs/atlantico-repo.md [type: file] [size: ~4 KB]
- SUMMARY: Documentation for AtlanticoExperienceRepository explaining how it works, configuration (default group ID, language), concurrency control, internal endpoints used, fallback behavior, and repository methods
- FIRST_LINES:
  1: # Atlantico Experience Repository
  2: 
  3: ## Overview
  4: 
  5: The `AtlanticoExperienceRepository` implements the `ExperienceRepository` interface using data from the Atlantico API. It fetches data through internal Next.js API routes (`/api/atlantico/group` and `/api/atlantico/event`) rather than calling the external API directly.

### docs/atlantico-vercel.md [type: file] [size: ~8 KB]
- SUMMARY: Guide for setting up Atlantico API integration on Vercel using a proxy server with static IP, including step-by-step setup, security considerations, troubleshooting, and cost estimates
- FIRST_LINES:
  1: # Atlantico API Integration for Vercel Deployments
  2: 
  3: ## Overview
  4: 
  5: **Vercel does NOT provide a fixed egress IP address.** This means that when your Next.js app (deployed on Vercel) makes API calls to Atlantico, the source IP address will be different on each request. Since Atlantico requires IP whitelisting, **direct API calls from Vercel will NOT work reliably**.

### docs/env.md [type: file] [size: ~3 KB]
- SUMMARY: Environment variables documentation describing ATLANTICO_BASE_URL, ATLANTICO_TIMEOUT_MS, ATLANTICO_REVALIDATE_SECONDS, ATLANTICO_TOKEN with setup instructions and validation notes
- FIRST_LINES:
  1: # Environment Variables
  2: 
  3: This document describes all environment variables used in the Tenerife Activity project.
  4: 
  5: ## Atlantico API Configuration

---

## DIRECTORY: messages

### messages/en.json [type: file] [size: ~20 KB]
- SUMMARY: English translation file for next-intl with common translations, navigation, home page, SEO, vibes, experiences, activities, search, partners, contact, booking, and error messages
- FIRST_LINES:
  1: {
  2:   "common": {
  3:     "siteName": "Tenerife Activity",
  4:     "search": "Search",
  5:     "searchInput": "Search input",

### messages/es.json [type: file] [size: ~20 KB]
- SUMMARY: Spanish translation file (same structure as en.json)
- FIRST_LINES:
  1: {
  2:   "common": {
  3:     "siteName": "Tenerife Activity",
  4:     "search": "Buscar",
  5:     "searchInput": "Campo de búsqueda",

### messages/de.json [type: file] [size: ~20 KB]
- SUMMARY: German translation file (same structure as en.json)
- FIRST_LINES:
  1: {
  2:   "common": {
  3:     "siteName": "Tenerife Activity",
  4:     "search": "Suchen",
  5:     "searchInput": "Suchfeld",

### messages/fr.json [type: file] [size: ~19 KB]
- SUMMARY: French translation file (same structure as en.json)
- FIRST_LINES:
  1: {
  2:   "common": {
  3:     "siteName": "Tenerife Activity",
  4:     "search": "Rechercher",
  5:     "searchInput": "Champ de recherche",

### messages/it.json [type: file] [size: ~20 KB]
- SUMMARY: Italian translation file (same structure as en.json)
- FIRST_LINES:
  1: {
  2:   "common": {
  3:     "siteName": "Tenerife Activity",
  4:     "search": "Cerca",
  5:     "searchInput": "Campo di ricerca",

### messages/pl.json [type: file] [size: ~20 KB]
- SUMMARY: Polish translation file (same structure as en.json)
- FIRST_LINES:
  1: {
  2:   "common": {
  3:     "siteName": "Tenerife Activity",
  4:     "search": "Szukaj",
  5:     "searchInput": "Pole wyszukiwania",

### messages/ru.json [type: file] [size: ~20 KB]
- SUMMARY: Russian translation file (same structure as en.json)
- FIRST_LINES:
  1: {
  2:   "common": {
  3:     "siteName": "Tenerife Activity",
  4:     "search": "Поиск",
  5:     "searchInput": "Поле поиска",

---

## DIRECTORY: scripts

### scripts/clean.mjs [type: file] [size: ~2 KB]
- SUMMARY: Cross-platform clean script that removes .next directory and optionally node_modules, with --all flag support
- FIRST_LINES:
  1: #!/usr/bin/env node
  2: /**
  3:  * Clean script - removes .next directory and optionally node_modules
  4:  * Cross-platform compatible (Windows, macOS, Linux)
  5:  */

### scripts/smoke-atlantico.mjs [type: file] [size: ~5 KB]
- SUMMARY: Smoke test script for Atlantico API endpoints that tests internal Next.js API routes with timeout handling and status reporting
- FIRST_LINES:
  1: #!/usr/bin/env node
  2: /**
  3:    * Smoke test for Atlantico API endpoints
  4:    * 
  5:    * This script tests the internal Next.js API routes for Atlantico integration.

---

## DIRECTORY: public

### public/icon.svg [type: file] [size: binary]
- SUMMARY: Site icon/favicon SVG file

### public/logo.png [type: file] [size: binary]
- SUMMARY: Tenerife Activity logo PNG file (has excessive transparent padding per LOGO_TRIMMING_INSTRUCTIONS.md)

### public/flyers/FLYERS_A5.png [type: file] [size: binary]
- SUMMARY: Partner flyer image in A5 format

### public/flyers/README.md [type: file] [size: ~500 bytes]
- SUMMARY: Documentation for flyers directory with recommended filename, resolution, and format specifications
- FIRST_LINES:
  1: # Flyers Directory
  2: 
  3: This directory contains flyer images for the partner section.
  4: 
  5: ## Partner Flyer

### public/images/hero-ocean-poster.jpg [type: file] [size: binary]
- SUMMARY: Hero section ocean poster image

### public/images/hero-poster.jpg [type: file] [size: binary]
- SUMMARY: Hero section poster image

### public/images/README.md [type: file] [size: ~1 KB]
- SUMMARY: Documentation for background image placeholder notice and requirements
- FIRST_LINES:
  1: # Background Image
  2: 
  3: ## Placeholder Notice
  4: 
  5: The file `site-sea.jpg` should be placed in this directory (`/public/images/site-sea.jpg`).

### public/images/activity-packs/booster-packs/booster-packs.jpg [type: file] [size: binary]
- SUMMARY: Activity pack image for booster packs

### public/images/activity-packs/special-packs/special-packs.jpg [type: file] [size: binary]
- SUMMARY: Activity pack image for special packs

### public/images/activity-packs/twin-ticket/twin-ticket.jpg [type: file] [size: binary]
- SUMMARY: Activity pack image for twin ticket

### public/images/activity-packs/two-parks-ticket/two-parks-ticket.jpg [type: file] [size: binary]
- SUMMARY: Activity pack image for two parks ticket

### public/images/activity-packs/README.md [type: file] [size: ~500 bytes]
- SUMMARY: Activity packs images directory documentation

### public/images/home/must-see/row-1/ [type: directory]
- Contains: Aqualand.png, club-termal.jpg, flamenco.png, Jungle-Park.png, Loro-Parque.png, Shogun-Boat.jpg, Siam-Park.png (7 image files)

### public/images/home/must-see/row-2/ [type: directory]
- Contains: buggy.jpg, la-palma-con-almuerzo.jpg, poema-del-mar-gran-canaria.jpg, scandal-dinner-show.jpg, sky-of-tenerife.jpg, teide-by-night.jpg, teide-tour-with-cable-car.jpg, utopia.jpg (8 image files)

### public/images/partners/README.md [type: file] [size: ~1 KB]
- SUMMARY: Partner logos directory documentation with format specifications and naming conventions
- FIRST_LINES:
  1: # Partner Logos
  2: 
  3: This directory contains partner logo files for the "Our Partners" section.

### public/partners/auto_detailing.jpg [type: file] [size: binary]
- SUMMARY: Partner logo image for auto detailing

### public/partners/cafe_con_arte.jpg [type: file] [size: binary]
- SUMMARY: Partner logo image for cafe con arte

### public/partners/marina_masaje.jpg [type: file] [size: binary]
- SUMMARY: Partner logo image for marina masaje

### public/partners/publox.jpg [type: file] [size: binary]
- SUMMARY: Partner logo image for publox

### public/partners/README.md [type: file] [size: ~1 KB]
- SUMMARY: Partner logos directory documentation

### public/videos/ [type: directory]
- Contains: 14 MP4 video files (hero.mp4, adventure-nature.mp4, bike-rental.mp4, boat-trips-cruises.mp4, bus-excursions.mp4, cable-car-observatory.mp4, car-rental.mp4, diving-fishing.mp4, gastronomy-tastings.mp4, shows-entertainment.mp4, tickets-attractions.mp4, transfers-transport.mp4, vibe-theme-parks.mp4, VIP-Tours.mp4, water-sports.mp4) and thumbnails directory with 14 PNG thumbnail images

---

## DIRECTORY: src/app

### src/app/layout.tsx [type: file] [size: ~400 bytes]
- SUMMARY: Root layout component importing global styles and rendering HTML structure with body wrapper
- FIRST_LINES:
  1: import '../ui/styles/globals.css'
  2: 
  3: export default function RootLayout({
  4:   children,
  5: }: {
  6:   children: React.ReactNode

### src/app/page.tsx [type: file] [size: ~200 bytes]
- SUMMARY: Root page component that redirects to /en locale
- FIRST_LINES:
  1: import { redirect } from 'next/navigation'
  2: 
  3: export default function RootPage() {
  4:   redirect('/en')
  5: }

### src/app/robots.ts [type: file] [size: ~400 bytes]
- SUMMARY: Robots.txt generator returning allow rules and sitemap reference
- FIRST_LINES:
  1: import { MetadataRoute } from 'next'
  2: import { siteUrl } from '@/config/site'
  3: 
  4: export default function robots(): MetadataRoute.Robots {
  5:   return {

### src/app/sitemap.ts [type: file] [size: ~2 KB]
- SUMMARY: Dynamic sitemap generator that includes static routes, vibe pages, and experience pages for all locales
- FIRST_LINES:
  1: import { MetadataRoute } from 'next'
  2: import { locales } from '@/i18n/request'
  3: import { siteUrl } from '@/config/site'
  4: import { vibeRepository } from '@/config/repositories'
  5: import { experienceRepository } from '@/config/repositories'

### src/app/error.tsx [type: file] [size: ~500 bytes]
- SUMMARY: Root error boundary component

### src/app/not-found.tsx [type: file] [size: ~500 bytes]
- SUMMARY: Root 404 not found page

### src/app/AttributionCapture.tsx [type: file] [size: ~2 KB]
- SUMMARY: Attribution capture component for tracking user attribution data

---

## DIRECTORY: src/app/[locale]

### src/app/[locale]/layout.tsx [type: file] [size: ~2 KB]
- SUMMARY: Locale layout component with next-intl integration, Header/Footer, AttributionCapture, metadata generation, and locale validation
- FIRST_LINES:
  1: import { NextIntlClientProvider } from 'next-intl'
  2: import { getMessages, setRequestLocale } from 'next-intl/server'
  3: import { notFound } from 'next/navigation'
  4: import { Suspense } from 'react'
  5: import { Header } from '@/ui/components/navigation'
  6: import { Footer } from '@/ui/components/navigation'

### src/app/[locale]/page.tsx [type: file] [size: ~5 KB]
- SUMMARY: Home page component with hero section, recommendations carousel, partners section, choose your vibe section, activity packs section, and metadata generation
- FIRST_LINES:
  1: import { Section, Container, Stack } from '@/ui/components/layout'
  2: import { VibesList } from '@/ui/components/vibe/VibesList.client'
  3: import { vibeRepository } from '@/config/repositories'
  4: import { Suspense } from 'react'
  5: import { ScrollToVibes } from './ScrollToVibes'
  6: import { getTranslations } from 'next-intl/server'

### src/app/[locale]/error.tsx [type: file] [size: ~500 bytes]
- SUMMARY: Locale error boundary component

### src/app/[locale]/not-found.tsx [type: file] [size: ~500 bytes]
- SUMMARY: Locale 404 not found page

### src/app/[locale]/ScrollToVibes.tsx [type: file] [size: ~1 KB]
- SUMMARY: Client component for scrolling to vibes section on page load

---

## DIRECTORY: src/app/[locale]/activities

### src/app/[locale]/activities/page.tsx [type: file] [size: ~2 KB]
- SUMMARY: Activities listing page

### src/app/[locale]/activities/loading.tsx [type: file] [size: ~500 bytes]
- SUMMARY: Loading state component for activities page

### src/app/[locale]/activities/[slug]/page.tsx [type: file] [size: ~15 KB]
- SUMMARY: Activity detail page that fetches group details and event details from Atlantico API, displays hero image, description, options, availability, pricing, and booking CTA
- FIRST_LINES:
  1: /**
  2:    * Activity Detail Page
  3:    * 
  4:    * Displays full tour details with hero image, description, options, availability, and booking CTA.
  5:    */

### src/app/[locale]/activities/[slug]/not-found.tsx [type: file] [size: ~500 bytes]
- SUMMARY: Activity not found page

---

## DIRECTORY: src/app/[locale]/catalog

### src/app/[locale]/catalog/page.tsx [type: file] [size: ~8 KB]
- SUMMARY: Catalog page that fetches enriched tours from Atlantico API with pricing, displays tour cards in grid layout, handles loading and error states
- FIRST_LINES:
  1: import { Section, Container } from '@/ui/components/layout'
  2: import { Suspense } from 'react'
  3: import { headers } from 'next/headers'
  4: import { getTranslations } from 'next-intl/server'
  5: import type { Metadata } from 'next'
  6: import { buildMetadata } from '@/lib/seo'
  7: import { type Locale } from '@/i18n/request'

### src/app/[locale]/catalog/loading.tsx [type: file] [size: ~500 bytes]
- SUMMARY: Loading state component for catalog page

### src/app/[locale]/catalog/ClientImage.tsx [type: file] [size: ~1 KB]
- SUMMARY: Client-side image component for catalog

---

## DIRECTORY: src/app/[locale]/contact

### src/app/[locale]/contact/page.tsx [type: file] [size: ~2 KB]
- SUMMARY: Contact page component

---

## DIRECTORY: src/app/[locale]/debug

### src/app/[locale]/debug/atlantico/page.tsx [type: file] [size: ~5 KB]
- SUMMARY: Debug page for Atlantico API testing and inspection

### src/app/[locale]/debug/catalog/page.tsx [type: file] [size: ~3 KB]
- SUMMARY: Debug page for catalog inspection

### src/app/[locale]/debug/not-found.tsx [type: file] [size: ~500 bytes]
- SUMMARY: Debug not found page

---

## DIRECTORY: src/app/[locale]/demo

### src/app/[locale]/demo/page.tsx [type: file] [size: ~2 KB]
- SUMMARY: Demo page component

---

## DIRECTORY: src/app/[locale]/experience

### src/app/[locale]/experience/[slug]/page.tsx [type: file] [size: ~5 KB]
- SUMMARY: Experience detail page component

### src/app/[locale]/experience/[slug]/not-found.tsx [type: file] [size: ~500 bytes]
- SUMMARY: Experience not found page

---

## DIRECTORY: src/app/[locale]/get-inspired

### src/app/[locale]/get-inspired/page.tsx [type: file] [size: ~3 KB]
- SUMMARY: Get inspired page component

---

## DIRECTORY: src/app/[locale]/inspired

### src/app/[locale]/inspired/page.tsx [type: file] [size: ~2 KB]
- SUMMARY: Inspired page component

### src/app/[locale]/inspired/InspiredPageClient.tsx [type: file] [size: ~3 KB]
- SUMMARY: Client component for inspired page

---

## DIRECTORY: src/app/[locale]/must-see

### src/app/[locale]/must-see/page.tsx [type: file] [size: ~5 KB]
- SUMMARY: Must see experiences page component

### src/app/[locale]/must-see/MustSeeExperienceCard.tsx [type: file] [size: ~2 KB]
- SUMMARY: Experience card component for must-see section

### src/app/[locale]/must-see/MustSeeViewTracker.tsx [type: file] [size: ~1 KB]
- SUMMARY: View tracking component for must-see page

---

## DIRECTORY: src/app/[locale]/out/booking

### src/app/[locale]/out/booking/page.tsx [type: file] [size: ~2 KB]
- SUMMARY: Booking redirect page

### src/app/[locale]/out/booking/BookingRedirectClient.tsx [type: file] [size: ~2 KB]
- SUMMARY: Client component for booking redirect with tracking

---

## DIRECTORY: src/app/[locale]/partners

### src/app/[locale]/partners/page.tsx [type: file] [size: ~3 KB]
- SUMMARY: Partners page component

---

## DIRECTORY: src/app/[locale]/search

### src/app/[locale]/search/page.tsx [type: file] [size: ~2 KB]
- SUMMARY: Search page component

### src/app/[locale]/search/SearchPageClient.tsx [type: file] [size: ~5 KB]
- SUMMARY: Client component for search page with search functionality

### src/app/[locale]/search/SearchResultCard.tsx [type: file] [size: ~2 KB]
- SUMMARY: Search result card component

### src/app/[locale]/search/SearchResultsViewTracker.tsx [type: file] [size: ~1 KB]
- SUMMARY: View tracking component for search results

---

## DIRECTORY: src/app/[locale]/vibe

### src/app/[locale]/vibe/[slug]/page.tsx [type: file] [size: ~3 KB]
- SUMMARY: Vibe detail page component

### src/app/[locale]/vibe/[slug]/not-found.tsx [type: file] [size: ~500 bytes]
- SUMMARY: Vibe not found page

### src/app/[locale]/vibe/[slug]/VibePageClient.tsx [type: file] [size: ~5 KB]
- SUMMARY: Client component for vibe page with experiences listing

---

## DIRECTORY: src/app/api/atlantico

### src/app/api/atlantico/health/route.ts [type: file] [size: ~1 KB]
- SUMMARY: Health check endpoint returning basic runtime information and service status
- FIRST_LINES:
  1: import { NextResponse } from 'next/server'
  2: 
  3: /**
  4:    * GET /api/atlantico/health
  5:    * 
  6:    * Health check endpoint for the Atlantico API wrapper.
  7:    * Returns basic runtime information.
  8:    */

### src/app/api/atlantico/ip/route.ts [type: file] [size: ~2 KB]
- SUMMARY: IP detection endpoint that returns server's public egress IP address using ipify.org
- FIRST_LINES:
  1: import { NextResponse } from 'next/server'
  2: 
  3: /**
  4:    * GET /api/atlantico/ip
  5:    * 
  6:    * Returns the public egress IP address of the server making the request.
  7:    * This is the IP that Atlantico needs to whitelist.

### src/app/api/atlantico/catalog/route.ts [type: file] [size: ~8 KB]
- SUMMARY: Catalog endpoint that fetches classifications and groups from Atlantico API with query parameter validation, error handling, and always returns HTTP 200 with structured response
- FIRST_LINES:
  1: import { NextResponse } from 'next/server'
  2: import { NextRequest } from 'next/server'
  3: import { getAtlanticoConfig } from '@/lib/atlantico/config'
  4: import { fetchAtlantico } from '@/lib/atlantico/fetch'

### src/app/api/atlantico/catalog/[lang]/route.ts [type: file] [size: ~20 KB]
- SUMMARY: Complete catalog aggregator that fetches all groups, merges activities, deduplicates by event code, with concurrency limiting
- FIRST_LINES:
  1: /**
  2:    * GET /api/atlantico/catalog/[lang]
  3:    * 
  4:    * Complete Atlantico catalog aggregating all groups.
  5:    * Fetches all groups, merges activities, and deduplicates by event code.

### src/app/api/atlantico/catalog-debug/[lang]/route.ts [type: file] [size: ~4 KB]
- SUMMARY: Debug endpoint for catalog analysis returning summary statistics and sample data
- FIRST_LINES:
  1: /**
  2:    * GET /api/atlantico/catalog-debug/[lang]
  3:    * 
  4:    * Debug endpoint for catalog analysis.
  5:    * Returns summary statistics and sample data.

### src/app/api/atlantico/group/[groupId]/[lang]/route.ts [type: file] [size: ~3 KB]
- SUMMARY: Group details endpoint that proxies to /groupDetails/{groupId}/{lang} with parameter validation and error handling
- FIRST_LINES:
  1: import { NextResponse } from 'next/server'
  2: import { NextRequest } from 'next/server'
  3: import { getAtlanticoConfig } from '@/lib/atlantico/config'
  4: import { fetchAtlantico } from '@/lib/atlantico/fetch'

### src/app/api/atlantico/group-details/[code]/[lang]/route.ts [type: file] [size: ~4 KB]
- SUMMARY: Group details endpoint using group code (not ID) for tour detail pages, proxies to /groupDetails/{code}/{lang}
- FIRST_LINES:
  1: /**
  2:    * GET /api/atlantico/group-details/[code]/[lang]
  3:    * 
  4:    * Fetches group details from Atlantico API using group code (not ID).
  5:    * This is for tour detail pages.

### src/app/api/atlantico/event/[eventCode]/[lang]/route.ts [type: file] [size: ~3 KB]
- SUMMARY: Event details endpoint that proxies to /eventDetails/{eventCode}/{lang} with parameter validation and error handling
- FIRST_LINES:
  1: import { NextResponse } from 'next/server'
  2: import { NextRequest } from 'next/server'
  3: import { getAtlanticoConfig } from '@/lib/atlantico/config'
  4: import { fetchAtlantico } from '@/lib/atlantico/fetch'

### src/app/api/atlantico/prices/[eventCode]/route.ts [type: file] [size: ~4 KB]
- SUMMARY: Prices endpoint that fetches prices for an event on a specific date using loadPrices endpoint with date and optional office query parameters
- FIRST_LINES:
  1: /**
  2:    * GET /api/atlantico/prices/[eventCode]
  3:    * 
  4:    * Fetches prices for an event on a specific date.
  5:    * 
  6:    * Route parameters:

### src/app/api/atlantico/availability/[eventCode]/[lang]/route.ts [type: file] [size: ~4 KB]
- SUMMARY: Availability endpoint that fetches availability and limits for an event using loadLimits endpoint with date query parameter (month start format)
- FIRST_LINES:
  1: /**
  2:    * GET /api/atlantico/availability/[eventCode]/[lang]
  3:    * 
  4:    * Fetches availability and limits for an event.
  5:    * 
  6:    * Route parameters:

### src/app/api/atlantico/tours/[lang]/route.ts [type: file] [size: ~13 KB]
- SUMMARY: Tours catalog endpoint that fetches from groupsList, normalizes tour data, extracts pricing from raw fields, supports group ID filtering via env
- FIRST_LINES:
  1: /**
  2:    * GET /api/atlantico/tours/[lang]
  3:    * 
  4:    * Fetches tours catalog from Atlantico groupsList endpoint.
  5:    * Returns normalized tour data for UI consumption.

### src/app/api/atlantico/tours-enriched/[lang]/route.ts [type: file] [size: ~12 KB]
- SUMMARY: Enriched tours endpoint combining groupsList + groupDetails with real pricing from loadLimits + loadPrices, includes concurrency limiting and price fallback logic
- FIRST_LINES:
  1: /**
  2:    * GET /api/atlantico/tours-enriched/[lang]
  3:    * 
  4:    * Fetches enriched tours catalog combining groupsList + groupDetails for each tour.
  5:    * Includes real pricing from loadLimits + loadPrices.

### src/app/api/atlantico/tours-pricing/[lang]/route.ts [type: file] [size: ~11 KB]
- SUMMARY: Tours pricing endpoint that calculates real pricing by fetching availability and prices, returns pricing snapshot for catalog display with pagination support
- FIRST_LINES:
  1: /**
  2:    * GET /api/atlantico/tours-pricing/[lang]
  3:    * 
  4:    * Calculates real pricing for tours by fetching availability and prices.
  5:    * Returns pricing snapshot for catalog display.

---

## DIRECTORY: src/config

### src/config/repositories.ts [type: file] [size: ~1 KB]
- SUMMARY: Repository configuration that exports vibeRepository (MockVibeRepository) and experienceRepository (AtlanticoExperienceRepository in prod, MockExperienceRepository fallback in dev)
- FIRST_LINES:
  1: import { MockVibeRepository } from '@/data/mock/mock-vibe.repository'
  2: import { MockExperienceRepository } from '@/data/mock/mock-experience.repository'
  3: import { AtlanticoExperienceRepository } from '@/data/atlantico/atlantico-experience.repository'
  4: import { getAtlanticoConfig } from '@/lib/atlantico/config'
  5: import type { VibeRepository } from '@/core/ports/vibe.repository'
  6: import type { ExperienceRepository } from '@/core/ports/experience.repository'

### src/config/contact.ts [type: file] [size: ~500 bytes]
- SUMMARY: Contact configuration with contact information

### src/config/site.ts [type: file] [size: ~500 bytes]
- SUMMARY: Site configuration with site URL and metadata

### src/config/tracking.ts [type: file] [size: ~500 bytes]
- SUMMARY: Tracking provider configuration

---

## DIRECTORY: src/core

### src/core/entities/experience.ts [type: file] [size: ~1 KB]
- SUMMARY: Experience entity interface defining structure with id, slug, title, description, price, currency, images, vibeId, location, duration, rating, highlights, included, notIncluded, importantInfo, cancellationPolicy, meetingPoint, language, groupSize, availabilityHint, durationMinutes
- FIRST_LINES:
  1: export interface Experience {
  2:   id: string
  3:   slug: string
  4:   title: string
  5:   description: string

### src/core/entities/vibe.ts [type: file] [size: ~400 bytes]
- SUMMARY: Vibe entity interface defining structure with id, slug, title, description, tagline, imageUrl, order
- FIRST_LINES:
  1: export interface Vibe {
  2:   id: string
  3:   slug: string
  4:   title: string
  5:   description?: string

### src/core/entities/activity.ts [type: file] [size: ~500 bytes]
- SUMMARY: Activity entity interface

### src/core/entities/index.ts [type: file] [size: ~200 bytes]
- SUMMARY: Entity exports

### src/core/ports/experience.repository.ts [type: file] [size: ~400 bytes]
- SUMMARY: ExperienceRepository interface with methods: findAll, findBySlug, findById, findByVibeId, search, findMustSee
- FIRST_LINES:
  1: import type { Experience } from '@/core/entities/experience'
  2: 
  3: export interface ExperienceRepository {
  4:   findAll(): Promise<Experience[]>
  5:   findBySlug(slug: string): Promise<Experience | null>

### src/core/ports/vibe.repository.ts [type: file] [size: ~400 bytes]
- SUMMARY: VibeRepository interface

### src/core/ports/tracking.provider.ts [type: file] [size: ~500 bytes]
- SUMMARY: TrackingProvider interface for analytics events

### src/core/ports/index.ts [type: file] [size: ~200 bytes]
- SUMMARY: Port exports

---

## DIRECTORY: src/data

### src/data/atlantico/atlantico-experience.repository.ts [type: file] [size: ~10 KB]
- SUMMARY: AtlanticoExperienceRepository implementation that uses internal Next.js API routes (/api/atlantico/group and /api/atlantico/event), includes concurrency limiting (max 8 requests), default group ID 31, default language ENG, implements all ExperienceRepository methods
- FIRST_LINES:
  1: /**
  2:    * Atlantico Experience Repository
  3:    * 
  4:    * Implements ExperienceRepository using internal Next.js API routes.
  5:    * Fetches data from Atlantico API via /api/atlantico/group and /api/atlantico/event.

### src/data/mock/mock-experience.repository.ts [type: file] [size: ~5 KB]
- SUMMARY: MockExperienceRepository implementation with mock data

### src/data/mock/mock-vibe.repository.ts [type: file] [size: ~4 KB]
- SUMMARY: MockVibeRepository implementation with 14 locked-order vibes

### src/data/mock/activities.mock.ts [type: file] [size: ~3 KB]
- SUMMARY: Mock activities data

### src/data/tracking/noop-tracking.provider.ts [type: file] [size: ~1 KB]
- SUMMARY: No-op tracking provider implementation (default, does nothing)

### src/data/packs.ts [type: file] [size: ~2 KB]
- SUMMARY: Activity packs data

### src/data/partners.ts [type: file] [size: ~2 KB]
- SUMMARY: Partners data

### src/data/vibeThumbnails.ts [type: file] [size: ~2 KB]
- SUMMARY: Vibe thumbnail mappings

---

## DIRECTORY: src/i18n

### src/i18n/index.ts [type: file] [size: ~500 bytes]
- SUMMARY: i18n exports

### src/i18n/locales.ts [type: file] [size: ~500 bytes]
- SUMMARY: Locale definitions

### src/i18n/request.ts [type: file] [size: ~2 KB]
- SUMMARY: next-intl request configuration with locale handling

### src/i18n/server.ts [type: file] [size: ~1 KB]
- SUMMARY: next-intl server-side utilities

### src/i18n/hooks.ts [type: file] [size: ~1 KB]
- SUMMARY: i18n React hooks

### src/i18n/i18n-audit.md [type: file] [size: ~2 KB]
- SUMMARY: i18n audit documentation

---

## DIRECTORY: src/lib/atlantico

### src/lib/atlantico/config.ts [type: file] [size: ~4 KB]
- SUMMARY: Atlantico API configuration module handling environment variables (ATLANTICO_BASE_URL, ATLANTICO_TIMEOUT_MS, ATLANTICO_REVALIDATE_SECONDS, ATLANTICO_TOKEN), validation, server-side only access, returns config object with validation status
- FIRST_LINES:
  1: /**
  2:    * Atlantico API configuration
  3:    * 
  4:    * This module handles environment variables for the Atlantico Excursiones API.
  5:    * All variables are server-side only and should never be exposed to the browser.

### src/lib/atlantico/fetch.ts [type: file] [size: ~4 KB]
- SUMMARY: Atlantico API fetch utilities with timeout, retry, error handling, automatic retry with exponential backoff, Next.js cache revalidation support
- FIRST_LINES:
  1: /**
  2:    * Atlantico API fetch utilities
  3:    * 
  4:    * Provides helper functions for making API requests with timeout, retry, and error handling.
  5:    */

### src/lib/atlantico/mappers.ts [type: file] [size: ~9 KB]
- SUMMARY: Atlantico API to Domain mappers with extractEventCodes, mapAtlanticoEventToActivityLite, mapAtlanticoGroupToActivityLites functions, includes sanity check examples
- FIRST_LINES:
  1: /**
  2:    * Atlantico API to Domain mappers
  3:    * 
  4:    * Minimal mapping layer to convert Atlantico API responses to simple domain objects.
  5:    * This module provides lightweight mappers without forcing strict domain types.

### src/lib/atlantico/pricing.ts [type: file] [size: ~8 KB]
- SUMMARY: Pricing utilities for Atlantico API handling fetching and computing real prices from loadLimits + loadPrices, includes getNextAvailableDate, getPriceForDate, computeCheapestPrice, getPriceWithFallback functions
- FIRST_LINES:
  1: /**
  2:    * Pricing utilities for Atlantico API
  3:    * 
  4:    * Handles fetching and computing real prices from loadLimits + loadPrices
  5:    */

### src/lib/atlantico/prices.ts [type: file] [size: ~3 KB]
- SUMMARY: Price parsing utilities for loadPrices response

### src/lib/atlantico/price-normalize.ts [type: file] [size: ~2 KB]
- SUMMARY: Price normalization utilities for extracting prices from raw Atlantico data

### src/lib/atlantico/date.ts [type: file] [size: ~1 KB]
- SUMMARY: Date utilities for Atlantico API (first day of month, date formatting)

### src/lib/atlantico/limits.ts [type: file] [size: ~2 KB]
- SUMMARY: Availability limits parsing utilities for loadLimits response

---

## DIRECTORY: src/lib/attribution

### src/lib/attribution/storage.ts [type: file] [size: ~2 KB]
- SUMMARY: Attribution storage utilities for client-side storage

### src/lib/attribution/types.ts [type: file] [size: ~1 KB]
- SUMMARY: Attribution type definitions

### src/lib/attribution/url-builder.ts [type: file] [size: ~2 KB]
- SUMMARY: URL builder utilities for attribution tracking

### src/lib/attribution/useAttribution.client.ts [type: file] [size: ~2 KB]
- SUMMARY: React hook for attribution tracking (client-side)

---

## DIRECTORY: src/lib

### src/lib/dev.ts [type: file] [size: ~1 KB]
- SUMMARY: Development utilities

### src/lib/seo.ts [type: file] [size: ~3 KB]
- SUMMARY: SEO utilities for building metadata, Open Graph, Twitter Cards

### src/lib/mediaPolicy.ts [type: file] [size: ~1 KB]
- SUMMARY: Media policy configuration

### src/lib/filters/experience-filters.ts [type: file] [size: ~2 KB]
- SUMMARY: Experience filtering utilities

### src/lib/i18n/link.tsx [type: file] [size: ~2 KB]
- SUMMARY: i18n-aware Link component wrapper

### src/lib/recommendations/get-inspired.ts [type: file] [size: ~2 KB]
- SUMMARY: Get inspired recommendations logic

### src/lib/recommendations/mapping.ts [type: file] [size: ~2 KB]
- SUMMARY: Recommendations mapping utilities

---

## DIRECTORY: src/ui

### src/ui/styles/globals.css [type: file] [size: ~5 KB]
- SUMMARY: Global CSS with Tailwind directives, design tokens (ocean/glass color palette), custom properties, base styles

### src/ui/lib/cn.ts [type: file] [size: ~500 bytes]
- SUMMARY: Class name utility combining clsx and tailwind-merge

### src/ui/components/layout/Section.tsx [type: file] [size: ~2 KB]
- SUMMARY: Section layout primitive component controlling vertical rhythm and background

### src/ui/components/layout/Container.tsx [type: file] [size: ~2 KB]
- SUMMARY: Container layout primitive component controlling width, centering, and responsive padding

### src/ui/components/layout/Stack.tsx [type: file] [size: ~2 KB]
- SUMMARY: Stack layout primitive component for flexbox layouts

### src/ui/components/layout/index.ts [type: file] [size: ~200 bytes]
- SUMMARY: Layout components exports

### src/ui/components/navigation/Header.tsx [type: file] [size: ~5 KB]
- SUMMARY: Header navigation component with logo, navigation links, language dropdown, mobile menu

### src/ui/components/navigation/Footer.tsx [type: file] [size: ~3 KB]
- SUMMARY: Footer component with links and copyright

### src/ui/components/navigation/Breadcrumb.tsx [type: file] [size: ~2 KB]
- SUMMARY: Breadcrumb navigation component

### src/ui/components/navigation/LanguageDropdown.tsx [type: file] [size: ~2 KB]
- SUMMARY: Language dropdown component

### src/ui/components/navigation/LanguageSwitcher.client.tsx [type: file] [size: ~2 KB]
- SUMMARY: Client-side language switcher component

### src/ui/components/navigation/index.ts [type: file] [size: ~200 bytes]
- SUMMARY: Navigation components exports

### src/ui/components/shared/Button.tsx [type: file] [size: ~2 KB]
- SUMMARY: Button component with variants (primary, secondary, ghost) and sizes (sm, md, lg)

### src/ui/components/shared/Badge.tsx [type: file] [size: ~1 KB]
- SUMMARY: Badge component with variants (top, bestseller, family, new)

### src/ui/components/shared/Chip.tsx [type: file] [size: ~1 KB]
- SUMMARY: Chip component for filters with active state

### src/ui/components/shared/SearchBar.client.tsx [type: file] [size: ~2 KB]
- SUMMARY: Client-side search bar component with tracking

### src/ui/components/shared/SearchBar.tsx [type: file] [size: ~500 bytes]
- SUMMARY: SearchBar wrapper component

### src/ui/components/shared/ExploreVibesButton.tsx [type: file] [size: ~1 KB]
- SUMMARY: Explore Vibes button component with tracking

### src/ui/components/shared/FAQ.tsx [type: file] [size: ~2 KB]
- SUMMARY: FAQ component

### src/ui/components/shared/MustSeeButton.client.tsx [type: file] [size: ~1 KB]
- SUMMARY: Client-side Must See button component

### src/ui/components/shared/index.ts [type: file] [size: ~500 bytes]
- SUMMARY: Shared components exports

### src/ui/components/vibe/VibeCard.client.tsx [type: file] [size: ~3 KB]
- SUMMARY: Client-side VibeCard component with click tracking

### src/ui/components/vibe/VibeCard.tsx [type: file] [size: ~500 bytes]
- SUMMARY: VibeCard wrapper component

### src/ui/components/vibe/VibeRow.tsx [type: file] [size: ~2 KB]
- SUMMARY: VibeRow component for displaying vibes in rows

### src/ui/components/vibe/VibesList.client.tsx [type: file] [size: ~3 KB]
- SUMMARY: Client-side VibesList component with progressive rendering

### src/ui/components/vibe/vibe-translations.ts [type: file] [size: ~2 KB]
- SUMMARY: Vibe translations mapping

### src/ui/components/vibe/video-utils.ts [type: file] [size: ~2 KB]
- SUMMARY: Video utility functions for vibe videos

### src/ui/components/vibe/useVibeVideoPlayback.ts [type: file] [size: ~2 KB]
- SUMMARY: React hook for vibe video playback

### src/ui/components/vibe/index.ts [type: file] [size: ~200 bytes]
- SUMMARY: Vibe components exports

### src/ui/components/experience/ExperienceCard.tsx [type: file] [size: ~3 KB]
- SUMMARY: ExperienceCard component for displaying experience previews

### src/ui/components/experience/ExperienceHero.tsx [type: file] [size: ~3 KB]
- SUMMARY: ExperienceHero component for experience detail pages

### src/ui/components/experience/badge-config.ts [type: file] [size: ~2 KB]
- SUMMARY: Badge configuration for experiences

### src/ui/components/experience/index.ts [type: file] [size: ~200 bytes]
- SUMMARY: Experience components exports

### src/ui/components/activities/ActivityCard.tsx [type: file] [size: ~3 KB]
- SUMMARY: ActivityCard component

### src/ui/components/booking/BookingCard.tsx [type: file] [size: ~3 KB]
- SUMMARY: BookingCard component

### src/ui/components/booking/index.ts [type: file] [size: ~200 bytes]
- SUMMARY: Booking components exports

### src/ui/components/hero/HeroVideoBackground.tsx [type: file] [size: ~3 KB]
- SUMMARY: HeroVideoBackground component for video background in hero sections

### src/ui/components/hero/index.ts [type: file] [size: ~200 bytes]
- SUMMARY: Hero components exports

### src/ui/components/packs/PackCard.tsx [type: file] [size: ~2 KB]
- SUMMARY: PackCard component for activity packs

### src/ui/components/packs/index.ts [type: file] [size: ~200 bytes]
- SUMMARY: Packs components exports

### src/ui/components/partners/PartnersLogos.tsx [type: file] [size: ~3 KB]
- SUMMARY: PartnersLogos component displaying partner logos

### src/ui/components/partners/index.ts [type: file] [size: ~200 bytes]
- SUMMARY: Partners components exports

### src/ui/components/recommendations/RecommendationsCarousel.client.tsx [type: file] [size: ~5 KB]
- SUMMARY: Client-side recommendations carousel component

### src/ui/components/recommendations/index.ts [type: file] [size: ~200 bytes]
- SUMMARY: Recommendations components exports

### src/ui/components/search/HeaderSearch.client.tsx [type: file] [size: ~3 KB]
- SUMMARY: Client-side header search component

### src/ui/components/search/index.ts [type: file] [size: ~200 bytes]
- SUMMARY: Search components exports

### src/ui/components/get-inspired/GetInspiredQuiz.client.tsx [type: file] [size: ~5 KB]
- SUMMARY: Client-side Get Inspired quiz component

### src/ui/sections/ActivityPacksSection.tsx [type: file] [size: ~3 KB]
- SUMMARY: ActivityPacksSection component for home page

### src/ui/sections/PartnersSection.tsx [type: file] [size: ~3 KB]
- SUMMARY: PartnersSection component for home page

### src/ui/hooks/useAutoplayVideoOnView.ts [type: file] [size: ~2 KB]
- SUMMARY: React hook for autoplaying videos when in viewport

### src/ui/hooks/useProgressiveRender.ts [type: file] [size: ~2 KB]
- SUMMARY: React hook for progressive rendering

---

## DIRECTORY: src

### src/navigation.ts [type: file] [size: ~1 KB]
- SUMMARY: Navigation configuration with i18n-aware Link component

---

## SECTION: IMPORTANT FILES INDEX

Files containing keywords: atlantico, excursions, api, route.ts, availability, prices, groupDetails, eventDetails, NEXT_PUBLIC, APP_URL, fetch, headers, origin

### atlantico
- `src/lib/atlantico/config.ts` - lines: throughout (Atlantico API configuration)
- `src/lib/atlantico/fetch.ts` - lines: throughout (Atlantico fetch utilities)
- `src/lib/atlantico/mappers.ts` - lines: throughout (Atlantico mappers)
- `src/lib/atlantico/pricing.ts` - lines: throughout (Atlantico pricing)
- `src/lib/atlantico/prices.ts` - lines: throughout (Atlantico prices)
- `src/lib/atlantico/price-normalize.ts` - lines: throughout (Atlantico price normalization)
- `src/lib/atlantico/date.ts` - lines: throughout (Atlantico date utilities)
- `src/lib/atlantico/limits.ts` - lines: throughout (Atlantico limits)
- `src/data/atlantico/atlantico-experience.repository.ts` - lines: throughout (Atlantico repository)
- `src/app/api/atlantico/health/route.ts` - lines: throughout
- `src/app/api/atlantico/ip/route.ts` - lines: throughout
- `src/app/api/atlantico/catalog/route.ts` - lines: throughout
- `src/app/api/atlantico/catalog/[lang]/route.ts` - lines: throughout
- `src/app/api/atlantico/catalog-debug/[lang]/route.ts` - lines: throughout
- `src/app/api/atlantico/group/[groupId]/[lang]/route.ts` - lines: throughout
- `src/app/api/atlantico/group-details/[code]/[lang]/route.ts` - lines: throughout
- `src/app/api/atlantico/event/[eventCode]/[lang]/route.ts` - lines: throughout
- `src/app/api/atlantico/prices/[eventCode]/route.ts` - lines: throughout
- `src/app/api/atlantico/availability/[eventCode]/[lang]/route.ts` - lines: throughout
- `src/app/api/atlantico/tours/[lang]/route.ts` - lines: throughout
- `src/app/api/atlantico/tours-enriched/[lang]/route.ts` - lines: throughout
- `src/app/api/atlantico/tours-pricing/[lang]/route.ts` - lines: throughout
- `src/app/[locale]/debug/atlantico/page.tsx` - lines: throughout
- `src/app/[locale]/activities/[slug]/page.tsx` - lines: throughout
- `src/app/[locale]/catalog/page.tsx` - lines: throughout
- `docs/atlantico-ip.md` - lines: throughout
- `docs/atlantico-repo.md` - lines: throughout
- `docs/atlantico-vercel.md` - lines: throughout
- `scripts/smoke-atlantico.mjs` - lines: throughout

### excursions
- `docs/atlantico-ip.md` - line: 1 (Atlantico Excursiones API)
- `docs/atlantico-vercel.md` - line: 1 (Atlantico Excursiones API)

### api
- All files in `src/app/api/atlantico/` directory (13 route.ts files)
- `src/lib/atlantico/config.ts` - lines: throughout (API configuration)
- `src/lib/atlantico/fetch.ts` - lines: throughout (API fetch)
- `src/data/atlantico/atlantico-experience.repository.ts` - lines: throughout (API routes)

### route.ts
- `src/app/api/atlantico/health/route.ts`
- `src/app/api/atlantico/ip/route.ts`
- `src/app/api/atlantico/catalog/route.ts`
- `src/app/api/atlantico/catalog/[lang]/route.ts`
- `src/app/api/atlantico/catalog-debug/[lang]/route.ts`
- `src/app/api/atlantico/group/[groupId]/[lang]/route.ts`
- `src/app/api/atlantico/group-details/[code]/[lang]/route.ts`
- `src/app/api/atlantico/event/[eventCode]/[lang]/route.ts`
- `src/app/api/atlantico/prices/[eventCode]/route.ts`
- `src/app/api/atlantico/availability/[eventCode]/[lang]/route.ts`
- `src/app/api/atlantico/tours/[lang]/route.ts`
- `src/app/api/atlantico/tours-enriched/[lang]/route.ts`
- `src/app/api/atlantico/tours-pricing/[lang]/route.ts`

### availability
- `src/app/api/atlantico/availability/[eventCode]/[lang]/route.ts` - lines: throughout
- `src/lib/atlantico/pricing.ts` - lines: 58, 87, 89, 99 (availability fetching)
- `src/app/[locale]/activities/[slug]/page.tsx` - lines: 12, 349 (availability section)

### prices
- `src/app/api/atlantico/prices/[eventCode]/route.ts` - lines: throughout
- `src/lib/atlantico/prices.ts` - lines: throughout
- `src/lib/atlantico/pricing.ts` - lines: throughout (pricing utilities)
- `src/lib/atlantico/price-normalize.ts` - lines: throughout
- `src/app/api/atlantico/tours-pricing/[lang]/route.ts` - lines: throughout
- `src/app/api/atlantico/tours-enriched/[lang]/route.ts` - lines: 20, 284, 291, 299 (pricing)
- `src/app/[locale]/activities/[slug]/page.tsx` - lines: 13, 199, 200 (pricing)

### groupDetails
- `src/app/api/atlantico/group/[groupId]/[lang]/route.ts` - line: 49 (`/groupDetails/${groupId}/${lang}`)
- `src/app/api/atlantico/group-details/[code]/[lang]/route.ts` - line: 11 (`/groupDetails/{code}/{lang}`)
- `src/app/api/atlantico/tours-enriched/[lang]/route.ts` - lines: 267, 268 (`/groupDetails/${tourCode}/${lang}`)
- `src/app/[locale]/activities/[slug]/page.tsx` - line: 110 (group details fetching)

### eventDetails
- `src/app/api/atlantico/event/[eventCode]/[lang]/route.ts` - line: 49 (`/eventDetails/${eventCode}/${lang}`)
- `src/lib/atlantico/pricing.ts` - lines: 207, 208, 228, 229 (eventDetails raw price fallback)
- `src/app/[locale]/activities/[slug]/page.tsx` - line: 123 (`/api/atlantico/event/${slug}/${lang}`)

### NEXT_PUBLIC
- `src/app/[locale]/catalog/page.tsx` - line: 172 (`process.env.NEXT_PUBLIC_BASE_URL`)
- `src/app/api/atlantico/tours-enriched/[lang]/route.ts` - line: 222 (`process.env.NEXT_PUBLIC_BASE_URL`)

### APP_URL
- `src/app/[locale]/catalog/page.tsx` - line: 172 (`process.env.APP_URL`)
- `src/app/api/atlantico/tours-enriched/[lang]/route.ts` - line: 222 (`process.env.APP_URL`)

### fetch
- `src/lib/atlantico/fetch.ts` - lines: throughout (fetchAtlantico function)
- `src/app/api/atlantico/ip/route.ts` - line: 17 (`fetch('https://api.ipify.org?format=json')`)
- `src/app/api/atlantico/catalog/route.ts` - lines: 81, 109 (fetch calls)
- `src/app/api/atlantico/group/[groupId]/[lang]/route.ts` - line: 48 (fetchAtlantico)
- `src/app/api/atlantico/event/[eventCode]/[lang]/route.ts` - line: 48 (fetchAtlantico)
- `src/app/api/atlantico/prices/[eventCode]/route.ts` - line: 63 (fetchAtlantico)
- `src/app/api/atlantico/availability/[eventCode]/[lang]/route.ts` - line: 57 (fetchAtlantico)
- `src/app/api/atlantico/tours/[lang]/route.ts` - lines: throughout (fetchAtlantico)
- `src/app/api/atlantico/tours-enriched/[lang]/route.ts` - lines: 226, 267 (fetchAtlantico, fetch)
- `src/app/api/atlantico/tours-pricing/[lang]/route.ts` - lines: throughout (fetch calls)
- `src/app/[locale]/activities/[slug]/page.tsx` - lines: 115, 123, 132, 175 (fetch calls)
- `src/app/[locale]/catalog/page.tsx` - line: 184 (fetch call)
- `src/lib/atlantico/pricing.ts` - lines: 94, 134, 140 (fetch calls)

### headers
- `src/app/[locale]/catalog/page.tsx` - line: 169 (`const hdrs = headers()`)
- `src/app/api/atlantico/tours-enriched/[lang]/route.ts` - line: 17 (`import { headers } from 'next/headers'`), line: 219 (`const hdrs = headers()`)
- `src/app/api/atlantico/tours-pricing/[lang]/route.ts` - line: 20 (`import { headers } from 'next/headers'`)

### origin
- `src/app/[locale]/catalog/page.tsx` - line: 175 (`const origin = envBase ? envBase : ...`)
- `src/app/api/atlantico/tours-enriched/[lang]/route.ts` - line: 223 (`const origin = envBase ? envBase : ...`)
- `src/lib/atlantico/pricing.ts` - lines: 58, 84, 88, 123, 127, 167, 208 (origin parameter for internal API calls)

---

## SECTION: ENTRY POINTS

### Next.js App Router Entry Points

1. **Root Layout**: `src/app/layout.tsx`
   - Root HTML structure, global styles import

2. **Root Page**: `src/app/page.tsx`
   - Redirects to `/en` locale

3. **Locale Layout**: `src/app/[locale]/layout.tsx`
   - Locale-specific layout with Header, Footer, AttributionCapture, next-intl provider

4. **Home Page**: `src/app/[locale]/page.tsx`
   - Main home page with hero, recommendations, partners, vibes, activity packs

5. **Activities Listing**: `src/app/[locale]/activities/page.tsx`
   - Activities listing page

6. **Activity Detail**: `src/app/[locale]/activities/[slug]/page.tsx`
   - Activity/tour detail page with full information

7. **Catalog**: `src/app/[locale]/catalog/page.tsx`
   - Catalog page with enriched tours

8. **Contact**: `src/app/[locale]/contact/page.tsx`
   - Contact page

9. **Debug Pages**: 
   - `src/app/[locale]/debug/atlantico/page.tsx`
   - `src/app/[locale]/debug/catalog/page.tsx`

10. **Experience Detail**: `src/app/[locale]/experience/[slug]/page.tsx`
    - Experience detail page

11. **Get Inspired**: `src/app/[locale]/get-inspired/page.tsx`
    - Get inspired quiz page

12. **Inspired**: `src/app/[locale]/inspired/page.tsx`
    - Inspired results page

13. **Must See**: `src/app/[locale]/must-see/page.tsx`
    - Must see experiences page

14. **Booking Redirect**: `src/app/[locale]/out/booking/page.tsx`
    - External booking redirect page

15. **Partners**: `src/app/[locale]/partners/page.tsx`
    - Partners page

16. **Search**: `src/app/[locale]/search/page.tsx`
    - Search results page

17. **Vibe Detail**: `src/app/[locale]/vibe/[slug]/page.tsx`
    - Vibe category page with experiences

### API Route Entry Points

1. **Health Check**: `src/app/api/atlantico/health/route.ts`
   - GET /api/atlantico/health

2. **IP Detection**: `src/app/api/atlantico/ip/route.ts`
   - GET /api/atlantico/ip

3. **Catalog**: `src/app/api/atlantico/catalog/route.ts`
   - GET /api/atlantico/catalog

4. **Catalog by Lang**: `src/app/api/atlantico/catalog/[lang]/route.ts`
   - GET /api/atlantico/catalog/[lang]

5. **Catalog Debug**: `src/app/api/atlantico/catalog-debug/[lang]/route.ts`
   - GET /api/atlantico/catalog-debug/[lang]

6. **Group Details**: `src/app/api/atlantico/group/[groupId]/[lang]/route.ts`
   - GET /api/atlantico/group/[groupId]/[lang]

7. **Group Details by Code**: `src/app/api/atlantico/group-details/[code]/[lang]/route.ts`
   - GET /api/atlantico/group-details/[code]/[lang]

8. **Event Details**: `src/app/api/atlantico/event/[eventCode]/[lang]/route.ts`
   - GET /api/atlantico/event/[eventCode]/[lang]

9. **Prices**: `src/app/api/atlantico/prices/[eventCode]/route.ts`
   - GET /api/atlantico/prices/[eventCode]

10. **Availability**: `src/app/api/atlantico/availability/[eventCode]/[lang]/route.ts`
    - GET /api/atlantico/availability/[eventCode]/[lang]

11. **Tours**: `src/app/api/atlantico/tours/[lang]/route.ts`
    - GET /api/atlantico/tours/[lang]

12. **Tours Enriched**: `src/app/api/atlantico/tours-enriched/[lang]/route.ts`
    - GET /api/atlantico/tours-enriched/[lang]

13. **Tours Pricing**: `src/app/api/atlantico/tours-pricing/[lang]/route.ts`
    - GET /api/atlantico/tours-pricing/[lang]

### Other Entry Points

- **Robots.txt**: `src/app/robots.ts` → /robots.txt
- **Sitemap**: `src/app/sitemap.ts` → /sitemap.xml
- **Middleware**: `middleware.ts` → Runs on all requests (except excluded paths)

---

**Inventory Complete**

























