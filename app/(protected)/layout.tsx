import Navbar from '@/components/layout/navbar';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Navbar />
      <main className="pt-4">{children}</main>
    </div>
  );
}