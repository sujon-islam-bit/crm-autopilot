import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import SignInForm from "@/components/sign-in-form";
import { getCurrentUser } from "@/lib/session";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}

async function SignInInner() {
  await connection();
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-10">
      <SignInForm />
    </main>
  );
}
