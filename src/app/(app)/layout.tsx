import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";
import { MobileNav } from "@/components/nav/mobile-nav";
import { Footer } from "@/components/nav/footer";
import { ensureUserBootstrap } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await ensureUserBootstrap();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 pb-24 lg:p-8 lg:pb-8">{children}</main>
        <Footer />
        <MobileNav />
      </div>
    </div>
  );
}
