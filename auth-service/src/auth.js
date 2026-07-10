// See docs/Auth_Service_Architecture.md for the full rationale behind every option below.
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt, bearer } from "better-auth/plugins";
import { db, mongoClient } from "./db.js";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: mongodbAdapter(db, {
    client: mongoClient,
    // Free-tier Atlas M0 / standalone Mongo may not support multi-document
    // transactions reliably — verify against your actual cluster.
    transaction: false,
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  // Custom fields this project depends on (consent + admin role)
  user: {
    additionalFields: {
      consentDataStorage: { type: "boolean", required: true, defaultValue: false },
      role: { type: "string", defaultValue: "user" },
    },
  },

  trustedOrigins: [process.env.FRONTEND_ORIGIN],

  advanced: {
    defaultCookieAttributes: { sameSite: "lax", secure: true, httpOnly: true },
  },

  plugins: [
    bearer(), // Authorization: Bearer <token> support
    jwt(),    // RS256 JWT + JWKS endpoint at /api/auth/jwks, verified by FastAPI
  ],
});
