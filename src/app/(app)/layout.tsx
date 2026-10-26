export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(198,244,50,0.07),transparent)]" />
      <main className="mx-auto max-w-5xl animate-rise px-4 pb-28 pt-6 sm:pb-14">{children}</main>
    </div>
  );
}
