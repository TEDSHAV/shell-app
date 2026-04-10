import { LoginForm } from "@/components/login-form";
import { apps } from "@/config/apps";

export default function Page() {
  return (
    <div className="min-h-svh flex">
      <div className="hidden lg:flex lg:flex-1 bg-muted/40 border-r border-border flex-col justify-between p-10">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-foreground" />
          <span className="font-semibold text-sm">PRISMA | SHA de Venezuela</span>
        </div>
        <div className="space-y-6">
          {apps.map((app) => (
            <div key={app.id} className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-background border border-border">
                <app.icon className={`h-4 w-4 ${app.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium">{app.name}</p>
                <p className="text-xs text-muted-foreground">
                  {app.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Acceso seguro con Supabase Auth
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-5 w-5 rounded bg-foreground" />
            <span className="font-semibold text-sm">Portal Empresarial</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Accede con tu cuenta para continuar
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
