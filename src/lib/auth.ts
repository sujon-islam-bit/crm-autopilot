import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";

import { prisma } from "@/lib/prisma";

/**
 * Auth for CRM Autopilot: email + 6-digit code (no passwords), the same
 * pattern as BuilderAI. Codes live 5 minutes. In development the code is
 * printed in the server log; the production sender (SES) plugs into
 * `sendVerificationOTP` below.
 *
 * On a user's first sign-in a personal workspace is created for them
 * and they become its owner (databaseHooks below) — so a new account
 * lands in a working product, never an empty shell.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3200",
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      async sendVerificationOTP({ email, otp, type }) {
        // TODO(production): send via SES. Dev: log only, never stored.
        console.log(`[auth] sign-in code for ${email} (${type}): ${otp}`);
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const workspace = await prisma.workspace.create({
            data: { name: "My workspace" },
          });
          await prisma.membership.create({
            data: { userId: user.id, workspaceId: workspace.id, role: "owner" },
          });
        },
      },
    },
  },
});
