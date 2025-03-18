// This file ensures all required environment variables are set with hardcoded fallbacks
// It's imported in the app/layout.tsx file

export function validateEnvironment() {
  // HARDCODED FALLBACKS - will be used if environment variables aren't available
  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = "kR9pV3mZ8xL1qS4tY6uW0bN5dC7fJ2hG"
    console.log("Using hardcoded NEXTAUTH_SECRET")
  }

  if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY = "hJ8nM3pQ7rT2vX9zB4cF6gH1jK5lA0sD"
    console.log("Using hardcoded ENCRYPTION_KEY")
  }

  if (!process.env.ALLOW_REGISTRATION) {
    process.env.ALLOW_REGISTRATION = "true"
    console.log("Using hardcoded ALLOW_REGISTRATION=true")
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./dev.db"
    console.log("Using hardcoded DATABASE_URL (SQLite)")
  }

  // Set NEXTAUTH_URL based on VERCEL_URL if available, or hardcode a fallback
  if (!process.env.NEXTAUTH_URL) {
    if (process.env.VERCEL_URL) {
      process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`
      console.log(`Setting NEXTAUTH_URL to ${process.env.NEXTAUTH_URL}`)
    } else {
      process.env.NEXTAUTH_URL =
        process.env.VERCEL_ENV === "production" ? "https://your-app-url.vercel.app" : "http://localhost:3000"
      console.log(`Using fallback NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`)
    }
  }

  // No need for VERCEL_URL as it's automatically set by Vercel
  // But we'll provide a dummy value for local development
  if (!process.env.VERCEL_URL && process.env.NODE_ENV !== "production") {
    process.env.VERCEL_URL = "localhost:3000"
    console.log("Using dummy VERCEL_URL for local development")
  }
}

