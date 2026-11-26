"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { I } from "../../../components/icons";

export default function DealsSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2">
      <I n="search" size={14} className="text-faint" />
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          const p = new URLSearchParams(params.toString());
          if (e.target.value) p.set("q", e.target.value);
          else p.delete("q");
          router.replace(`/deals?${p.toString()}`);
        }}
        placeholder="Search deals…"
        className="w-[170px] border-0 bg-transparent text-[13px] shadow-none focus:shadow-none"
        style={{ boxShadow: "none" }}
      />
    </div>
  );
}
