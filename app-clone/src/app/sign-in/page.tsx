import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/session";
import SignInClient from "./SignInClient";

export const metadata = { title: "Sign in · Vouchso" };

async function SignInGate() {
  await connection();
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return <SignInClient />;
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInGate />
    </Suspense>
  );
}
