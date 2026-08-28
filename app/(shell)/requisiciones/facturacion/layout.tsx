export default function AdministracionFacturacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1">
      {children}
    </div>
  );
}
