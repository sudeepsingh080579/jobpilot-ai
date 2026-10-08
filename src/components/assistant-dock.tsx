"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";

type Message = { id: string; role: string; content: string; rating: number | null };

function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid="assistant-open"
      aria-label="Open assistant"
      className="fixed bottom-20 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-indigo to-violet text-white shadow-lg md:bottom-6"
      onClick={onClick}
    >
      <MessageCircle className="h-7 w-7" />
    </button>
  );
}

function DockInner({
  open,
  onOpenChange,
  messages,
  jobs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  jobs: { id: string; title: string; company: string }[];
}) {
  const params = useSearchParams();
  const asked = params.get("chat") === "1";
  const jobId = params.get("job") ?? "";
  const [forced, setForced] = useState<boolean | null>(null);
  const visible = forced ?? (open || asked);

  function show() {
    setForced(true);
    onOpenChange(true);
  }

  function hide() {
    setForced(false);
    onOpenChange(false);
  }

  return (
    <>
      {visible ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:justify-end md:p-5" data-testid="assistant-panel">
          <div className="flex h-[min(82vh,40rem)] w-full max-w-lg flex-col rounded-t-3xl bg-paper shadow-2xl md:rounded-3xl">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-lg font-bold">Assistant</p>
                <p className="text-sm text-muted">One next step, whenever you ask.</p>
              </div>
              <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-canvas" onClick={hide} aria-label="Close assistant">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ChatPanel key={jobId || "general"} initial={messages} jobs={jobs} initialJobId={jobId} />
          </div>
        </div>
      ) : null}
      <Fab onClick={show} />
    </>
  );
}

export function AssistantDock(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  jobs: { id: string; title: string; company: string }[];
}) {
  return (
    <Suspense fallback={<Fab onClick={() => props.onOpenChange(true)} />}>
      <DockInner {...props} />
    </Suspense>
  );
}
