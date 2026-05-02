"use client";

import { useState } from "react";
import { Button } from "@/components/backstage";
import { AiClassifyModal } from "./AiClassifyModal";
import { NewTemplateModal } from "./NewTemplateModal";

export function TemplatesHeaderActions() {
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  return (
    <>
      <Button variant="default" onClick={() => setClassifyOpen(true)}>
        ⚡ AI Classify domain…
      </Button>
      <Button variant="primary" onClick={() => setNewOpen(true)}>
        + New template
      </Button>

      <AiClassifyModal open={classifyOpen} onClose={() => setClassifyOpen(false)} />
      <NewTemplateModal open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  );
}
