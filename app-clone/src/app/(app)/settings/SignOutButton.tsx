"use client";

import { authClient } from "../../../lib/auth-client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        router.push("/sign-in");
      }}
      className="btn-outline px-3.5 py-2 text-[12.5px] font-semibold"
    >
      Sign out
    </button>
  );
}
