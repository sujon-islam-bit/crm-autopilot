import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { getDealsData } from "../../../lib/deals";
import { STAGES } from "../../../lib/constants";
import DealsClient from "./DealsClient";

async function Inner() {
  await connection();
  const { workspace } = await requireWorkspace();
  const data = await getDealsData(workspace.id);
  return <DealsClient data={data} stages={[...STAGES, "Lost"]} />;
}

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
