# Learning Notes: Landing Page Module

## What we built
We built the **Landing Page**. This is the first screen a user sees when they visit the website URL.

## Why we built it
Every application needs a public face. Before someone can log in or register, they need to know what the application does. We built a beautiful "Hero Section" to explain the app's purpose and provide clear buttons to navigate to the Auth pages.

## How it works
- **Next.js Routing**: In Next.js App Router, `src/app/page.tsx` is automatically the homepage (`/`).
- **Tailwind CSS Aesthetics**: We used Tailwind utility classes to create a "Glassmorphism" effect. 
  - `backdrop-blur-xl` blurs everything behind the element.
  - `bg-slate-900/80` adds a slightly transparent dark background.
  - Absolute positioning is used to float the decorative cards.

## Interview / MCA Viva Questions

**Q1: What is Next.js and why did we choose it over standard React for this project?**
*Answer*: Next.js is a React framework that provides built-in routing, server-side rendering, and API routes. We chose it because it makes building multi-page applications (like having `/login`, `/citizen`, and `/police`) incredibly easy using its App Router, without needing to install third-party routers like `react-router-dom`.

**Q2: How do you link pages together in Next.js?**
*Answer*: We use the `<Link href="...">` component provided by Next.js instead of a standard HTML `<a>` tag. The `<Link>` component pre-fetches the page in the background, making navigation between pages feel instant without reloading the browser.

**Q3: How is the UI styling managed?**
*Answer*: We used **Tailwind CSS**, a utility-first CSS framework. Instead of writing separate CSS files, we write classes directly in our HTML (like `flex`, `items-center`, `text-white`). This allowed us to rapidly build a premium UI without jumping between files.

## Memory Tricks
- **`page.tsx`** = The actual visual page on the screen.
- **`<Link>`** = Next.js fast navigation (never use `<a>` tags!).
