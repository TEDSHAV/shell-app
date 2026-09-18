import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isTedMember } from "@/actions/ted";

export default async function TedPlanificacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ted = await isTedMember();
  return (
    <div className="flex min-h-full w-full flex-col bg-[#f4f5f7]">
      <div className="px-6 pt-5">
        <Link
          href={ted ? "/ted" : "/dashboard"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {ted ? "Volver a TED" : "Volver al inicio"}
        </Link>
      </div>
      {children}
    </div>
  );
}
