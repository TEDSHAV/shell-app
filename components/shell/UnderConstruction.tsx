import { Construction } from "lucide-react";

interface UnderConstructionProps {
  title?: string;
}

export function UnderConstruction({ title = "Reportes" }: UnderConstructionProps) {
  return (
    <div className="flex flex-1 min-h-0 h-full w-full items-center justify-center bg-background p-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-5">
          <Construction className="h-10 w-10 text-muted-foreground" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Esta sección está en construcción. Pronto estará disponible.
          </p>
        </div>
      </div>
    </div>
  );
}
