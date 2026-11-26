/** Shared shapes for the AI Assistant chat (client-safe: types only). */

export type AssistantDealRow = {
  name: string;
  company: string | null;
  stage: string;
  amount: number | null;
  daysSilent: number;
  risk: "High" | "Medium";
};

export type AssistantBlock =
  | { kind: "deals"; rows: AssistantDealRow[] }
  | { kind: "link"; label: string; href: string };

export type ProposalCardData = {
  id: string;
  title: string;
  summary: string;
  status: string; // pending | applied | rejected | undone | failed
  canDecide: boolean;
};

export type SerializedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Brief BuilderAI-style narration shown before the answer
   *  ("Checking your stalled deals…"). Null for user messages. */
  narration: string | null;
  blocks: AssistantBlock[];
  proposal: ProposalCardData | null;
  createdAt: string;
};

export type ThreadSummary = {
  threadId: string;
  title: string;
  updatedAt: string;
  count: number;
};
