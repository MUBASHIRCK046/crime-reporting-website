# Learning Notes: Firebase Module

## What we built
We created the connection between our Next.js website and our Firebase backend. We built a **Client setup** (for the browser) and a **Server setup** (for the backend).

## Why we built it
To store user data, authenticate users (login/signup), upload evidence images, and send notifications securely. Without this connection, our website would just be static pages with no database.

## How it works
- **Client (`client.ts`)**: Uses standard Firebase SDK to connect directly to Firebase from the user's browser. It uses public API keys (which are safe to expose because Firebase Security Rules protect our data).
- **Server (`server.ts`)**: Uses the `firebase-admin` SDK. This runs ONLY on our server (not in the user's browser). It uses a secret private key to bypass Security Rules, allowing us to perform admin tasks (like assigning a user as "Police").

## Which folder contains it
`src/firebase/`

## Which files are used
- `.env.local` (Stores our secret keys, never pushed to GitHub)
- `client.ts` (Browser connection)
- `server.ts` (Admin connection)

## Which Firebase service is used
- **Authentication**: For user login.
- **Firestore**: For the NoSQL database.
- **Storage**: For file uploads.

## Common mistakes
1. **Pushing `.env.local` to GitHub**: This exposes your database to hackers! Always ensure `.env.local` is in your `.gitignore` file.
2. **Calling Server Code in the Browser**: If you try to use `firebase-admin` inside a normal React component (client side), the app will crash because it needs Node.js.
3. **Missing Keys**: Forgetting to restart the server (`npm run dev`) after adding new keys to `.env.local`.

## Interview / MCA Viva Questions
**Q1: Why do we use both `firebase` and `firebase-admin` packages?**
*Answer*: The `firebase` package is for the frontend (client-side) and obeys Security Rules. The `firebase-admin` package is for the backend (server-side) and has full database access using a private service account key.

**Q2: What is the purpose of `.env.local`?**
*Answer*: It stores environment variables (secret keys) securely so they are not hardcoded into the source code and accidentally uploaded to version control (GitHub).

**Q3: How does Next.js know which environment variables are safe for the browser?**
*Answer*: In Next.js, any variable that starts with `NEXT_PUBLIC_` is automatically exposed to the browser. Variables without this prefix are kept strictly on the server.

## Memory Tricks
- **Client = Browser = `firebase` package = `NEXT_PUBLIC_` keys.**
- **Server = Backend = `firebase-admin` package = Secret keys without `NEXT_PUBLIC_`.**
