"use client";

import { useRef } from "react";
import { MessageCircle } from "lucide-react";
import { addComment } from "@/lib/actions";
import { Button } from "@/components/ui/Button";

interface CommentFormProps {
  trackId: string;
  timestampSeconds?: number;
}

export function CommentForm({ trackId, timestampSeconds }: CommentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addComment(trackId, formData);
        formRef.current?.reset();
      }}
      className="mt-4 flex flex-col gap-3"
    >
      {timestampSeconds !== undefined && <input type="hidden" name="timestampSeconds" value={timestampSeconds} />}
      <textarea
        name="body"
        rows={3}
        placeholder="Join the conversation..."
        className="w-full resize-none rounded-lg border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-faint focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
        required
      />
      <Button type="submit" size="sm" className="self-start">
        <MessageCircle className="h-4 w-4" />
        Comment
      </Button>
    </form>
  );
}
