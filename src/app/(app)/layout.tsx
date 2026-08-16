import { BottomNav, TopNav } from "./nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50 dark:bg-neutral-950">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
