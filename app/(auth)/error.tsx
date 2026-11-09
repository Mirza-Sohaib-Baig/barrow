"use client";

import { Button } from "@/components/ui/button";

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col gap-4">
      <h1 className="text-h1">This page didn&apos;t load</h1>
      <p className="text-body text-muted-foreground">Check your connection and try again.</p>
      <Button type="button" className="h-10 w-full" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
