"use client";

import { useRef } from "react";
import { MessageCircle } from "lucide-react";
import { addComment } from "@/lib/actions";
import { Button } from "@/components/ui/Button";

interface CommentFormProps {
  trackId: string;
}

export function CommentForm({ trackId }: CommentFormProps) {
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
      <textarea
        name="body"
        rows={3}
        placeholder="Join the conversation..."
        className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        required
      />
      <Button type="submit" size="sm" className="self-start">
        <MessageCircle className="h-4 w-4" />
        Comment
      </Button>
    </form>
  );
}
