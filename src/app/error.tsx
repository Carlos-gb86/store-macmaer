"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container empty-state">
      <h1>A little interruption.</h1>
      <p>We couldn’t load the collection. Please try again in a moment.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
