import Sidebar from "@/components/LiveChat/Sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-0">
        <div className="w-full h-full">
          {children}
        </div>
      </main>
    </>
  );
}
