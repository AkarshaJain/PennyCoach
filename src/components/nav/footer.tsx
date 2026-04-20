import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-8 border-t px-4 py-6 text-xs text-muted-foreground lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p>
          <span className="font-medium text-foreground">Penny Coach</span> · © {year}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/settings" className="underline hover:text-foreground">
            Settings
          </Link>
          <Link href="/import" className="underline hover:text-foreground">
            Import your data
          </Link>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            Source
          </a>
        </p>
      </div>
    </footer>
  );
}
