import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  FileUp,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PiggyBank className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">Penny Coach</span>
          </Link>
          <nav className="flex items-center gap-1">
            <ThemeToggle />
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <Link href="/import">Import</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/onboarding">Sign up</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard">
                Open app <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="gradient-hero">
        <div className="container py-20 md:py-28">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Your data stays on your machine
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Your money, finally <span className="text-primary">on your side.</span>
            </h1>
            <p className="mt-5 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
              Track every dollar, plan future spending, and get clear, explainable monthly
              coaching on where to save and where to spend. Import from Chase, Bank of America,
              Capital One, Amex and any other US bank — no paid aggregators, no hidden fees.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Use it now — it&apos;s free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/onboarding">Set up your profile</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/import">
                  <FileUp className="mr-1 h-4 w-4" /> Import bank file
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> USD &amp; US categories by default</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> No API keys, no signup required</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Your data stays on your machine</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> No subscription</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">A coach, not just a logger.</h2>
            <p className="mt-3 text-muted-foreground">
              Every recommendation is based on your own history and transparent math — no vague AI guesses.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={FileUp}
              title="Import from your bank"
              description="Drop in the CSV or QFX file from Chase, BoA, Capital One, Amex, Wells Fargo, Mint — we auto-categorize it in seconds."
            />
            <Feature
              icon={Wallet}
              title="Smart budgets"
              description="Auto-suggested from your trailing averages, with an overspend cushion tuned to each category."
            />
            <Feature
              icon={Calendar}
              title="Future plans"
              description="NYC weekend, MacBook, holiday gifts, annual insurance — we compute exactly what to save each month."
            />
            <Feature
              icon={Sparkles}
              title="Explainable advisor"
              description="Every tip shows the math: 'your takeout is 42% above average because…' You can always trust what it says."
            />
            <Feature
              icon={BarChart3}
              title="Honest reports"
              description="Category pie, monthly cash flow, savings rate, top merchants — and a one-click CSV export."
            />
            <Feature
              icon={ShieldCheck}
              title="Safe &amp; local"
              description="Data stays on your machine by default (SQLite). Host free on Vercel + Neon when you&apos;re ready."
            />
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Three simple steps</h2>
            <p className="mt-2 text-muted-foreground">Less than a minute from install to your first insight.</p>
          </div>
          <ol className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
            <Step n="1" title="Tell us about you" body="Income, fixed bills, saving target, emergency fund. We remember it all." />
            <Step n="2" title="Import or log" body="Upload the CSV from your bank — or add transactions manually. No demo data unless you ask for it." />
            <Step n="3" title="See your coach tips" body="Get deterministic, explainable recommendations every month — never vague AI fluff." />
          </ol>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Use it now <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/import">
                <FileUp className="mr-1 h-4 w-4" /> Import a bank file
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="container py-14">
          <Card className="mx-auto max-w-4xl">
            <CardContent className="flex flex-col items-start justify-between gap-4 p-8 md:flex-row md:items-center">
              <div>
                <h3 className="text-xl font-semibold">Free to use. Yours to own.</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No sign-up, no credit card, no telemetry. Run it on your laptop
                  or self-host it for your team. You own the data.
                </p>
              </div>
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Start using it <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted-foreground md:flex-row">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Penny Coach</span>
            <span className="mx-1.5">·</span>
            <span>Free to use</span>
          </p>
          <p className="max-w-lg text-center md:text-right">
            © {new Date().getFullYear()} Penny Coach. Educational tool — not a substitute for
            professional financial advice.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-foreground">App</Link>
            <Link href="/import" className="hover:text-foreground">Import</Link>
            <Link href="/insights" className="hover:text-foreground">Advisor</Link>
            <Link href="/settings" className="hover:text-foreground">Settings</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="mt-4 text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-background p-6">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        {n}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
