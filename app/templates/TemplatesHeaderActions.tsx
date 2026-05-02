"use client";

import { useState } from "react";
import { AiClassifyModal } from "./AiClassifyModal";
import { NewTemplateModal } from "./NewTemplateModal";

export function TemplatesHeaderActions() {
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setClassifyOpen(true)}
        className="px-3 py-1.5 border border-border rounded-md text-sm bg-surface text-slate hover:bg-bg-warm"
      >
        ⚡ AI Classify domain…
      </button>
      <button
        type="button"
        onClick={() => setNewOpen(true)}
        className="px-3 py-1.5 rounded-md text-sm bg-navy text-white hover:bg-ink"
      >
        + New template
      </button>

      <AiClassifyModal
        open={classifyOpen}
        onClose={() => setClassifyOpen(false)}
      />
      <NewTemplateModal open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  );
}
