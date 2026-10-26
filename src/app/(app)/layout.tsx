export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:pb-12">{children}</main>;
}
