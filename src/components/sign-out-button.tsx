"use client";

import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth-client";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
      className="text-[13px] font-medium text-stone-400 transition hover:text-stone-700"
    >
      Sign out
    </button>
  );
}
