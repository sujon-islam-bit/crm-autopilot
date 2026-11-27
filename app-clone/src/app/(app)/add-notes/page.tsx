import AddNotesClient from "./AddNotesClient";

export const metadata = { title: "Add notes · Vouchso" };

export default function AddNotesPage() {
  return (
    <div className="px-7 pt-5 pb-7">
      <h1 className="text-[24px] font-extrabold tracking-tight">Add notes</h1>
      <p className="mt-1 mb-5 max-w-[640px] text-[13.5px] leading-relaxed text-muted">
        Calls and chats that happen outside email never reach the CRM. Paste them here — the AI turns them into
        proposals in Approvals.
      </p>
      <div className="max-w-[760px]">
        <AddNotesClient />
      </div>
    </div>
  );
}
