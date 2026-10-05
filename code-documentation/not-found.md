# Not Found Page (404)

**Route:** Any invalid route  
**File:** `src/app/not-found.tsx`

---

## 1. PAGE OVERVIEW

The Not Found Page is displayed when a user navigates to a URL that doesn't exist in the application. It provides a friendly error message and navigation options to help users find their way back.

---

## 2. DATA USED IN THIS PAGE

- **No database data.** This is a fully static error page.
- All content (text, icons, links) is hardcoded.

---

## 3. API CONNECTION FOR THIS PAGE

**No API calls.** This page is completely static.

---

## 4. BACKEND CONNECTION FOR THIS PAGE

**No backend connection.** Next.js automatically renders this page for unmatched routes.

---

## 5. CODE FLOW

1. User navigates to a URL that doesn't match any defined route.
2. Next.js automatically renders `not-found.tsx`.
3. Page displays a "404 — Page Not Found" message with animation.
4. Navigation links are provided to go back to the homepage or login page.

---

## 6. SIMPLE EXPLANATION (IN EASY WORDS)

When you type a wrong URL or click a broken link, this page appears instead of crashing. It tells you "this page doesn't exist" and gives you buttons to go back to the home page. It's like a helpful sign at a dead-end road saying "Turn around, the road you're looking for is that way."

---

## 7. BLOCK-BY-BLOCK SUMMARY

| Block Name | What It Does | One-Line Summary |
|---|---|---|
| **Error Message** | Displays "404" with descriptive text | Informs user of missing page |
| **Navigation Links** | Links to `/` (home) and `/login` | Helps user navigate back |
| **Animation** | Framer Motion or CSS animations for visual polish | Smooth error presentation |
