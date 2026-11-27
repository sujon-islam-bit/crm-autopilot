import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/session";
import SignUpClient from "./SignUpClient";

export const metadata = { title: "Create your account · Vouchso" };

async function SignUpGate() {
  await connection();
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return <SignUpClient />;
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpGate />
    </Suspense>
  );
}
