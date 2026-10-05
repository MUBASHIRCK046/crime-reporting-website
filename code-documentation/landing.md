# Landing Page (Home Page)

**Route:** `/`  
**File:** `src/app/page.tsx`

---

## 1. PAGE OVERVIEW

The Landing Page is the public-facing homepage of Crime Assist. It is the first page visitors see. Its purpose is to:
- Introduce the platform and its features
- Provide navigation to Login, Register, and Police Access
- Display feature highlights, statistics, and a how-it-works section
- Support multi-language translation (English, Malayalam, Hindi)
- Showcase the platform's modules and capabilities

This page does **not** require authentication — anyone can view it.

---

## 2. DATA USED IN THIS PAGE

- **No database data is fetched.** This is a static marketing/landing page.
- **Translations dictionary:** Hardcoded `translations` object with English, Malayalam, and Hindi strings.
- **Feature lists, statistics, and module descriptions:** Hardcoded arrays rendered in the UI.
- **State data:**
  - `currentLang` — Selected language (`"English"`, `"Malayalam"`, `"Hindi"`)
  - `showMobileMenu` — Mobile menu toggle
  - `showModal` — Demo modal visibility

---

## 3. API CONNECTION FOR THIS PAGE

**This page does NOT call any API.** It is fully static/client-rendered with no backend interaction.

---

## 4. BACKEND CONNECTION FOR THIS PAGE

**No backend connection.** This page has no server-side logic or data fetching.

---

## 5. CODE FLOW

1. Page loads in the browser as a client component (`"use client"`).
2. The `translations` dictionary is initialized with strings for English, Malayalam, and Hindi.
3. User sees the hero section with brand name "Crime Assist", tagline, and call-to-action buttons.
4. User can switch language using the language selector — all text updates instantly.
5. Scrolling reveals feature cards, statistics, how-it-works steps, and module highlights.
6. CTA buttons navigate to `/login` (for citizen login), `/register` (for new accounts), and `/police` (for police access).
7. The `TacticalFooter` component renders at the bottom.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

This is the **front door** of the website. When someone visits the website for the first time, they land here. It shows what the app is about, what features it has, and has buttons to log in or create a new account. No data is loaded from the database — everything is built into the page itself. It's like a brochure for the app. It also supports 3 languages so users who speak Malayalam or Hindi can read the content in their own language.

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Imports** | Imports React, Next.js Link, Framer Motion, Lucide icons, Sonner toast, and TacticalFooter | Loads all UI libraries and components |
| **Translations Dictionary** | Defines all UI strings in English, Malayalam, and Hindi | Enables multi-language support |
| **State Variables** | `currentLang`, `showMobileMenu`, `showModal` | Manages language selection and UI toggles |
| **Hero Section** | Renders brand logo, tagline, description, and CTA buttons | First visual impression with navigation |
| **Features Section** | Maps over feature cards with icons and descriptions | Showcases platform capabilities |
| **Statistics Section** | Displays key numbers (users, cases, response time) | Builds credibility with stats |
| **How It Works Section** | Step-by-step guide for citizens | Explains the user journey |
| **Modules Section** | Lists all system modules with icons | Shows platform scope |
| **Language Selector** | Dropdown to switch between English, Malayalam, Hindi | Allows multi-language browsing |
| **TacticalFooter** | Footer component with links and branding | Standard page footer |
