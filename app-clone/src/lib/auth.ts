import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3200",
  // Daily login is email + password (locked auth spec). Accounts are still
  // CREATED through the email-code flow (sign-up verifies the email with a
  // one-time code first, then the user sets a password via /set-password);
  // the email code also stays as a sign-in fallback and drives the
  // forgot-password reset.
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // Production plugs a real sender (SES) in here. In dev the code prints
        // in the server log so the flow can be tested end to end.
        console.log(`[auth] verification code for ${email} (${type}): ${otp}`);
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const ws = await prisma.workspace.create({
            data: { name: "My workspace", plan: "trial" },
          });
          await prisma.membership.create({
            data: { userId: user.id, workspaceId: ws.id, role: "owner" },
          });
        },
      },
    },
  },
});
