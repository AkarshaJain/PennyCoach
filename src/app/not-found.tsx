import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <span className="text-6xl">💸</span>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">
        That page seems to have wandered off. Let's get you back to your money.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
