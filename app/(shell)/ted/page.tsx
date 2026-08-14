import { redirect } from "next/navigation";
import Link from "next/link";
import { Code2, Github, ExternalLink, BookOpen, Terminal, Bell, Users } from "lucide-react";
import { isTedMember } from "@/actions/ted";

export const dynamic = "force-dynamic";

export default async function TedPage() {
  const allowed = await isTedMember();
  if (!allowed) {
    redirect("/dashboard");
  }

  const resources = [
    {
      icon: Users,
      title: "Manejo de usuarios",
      description: "Crear cuentas nuevas y restablecer contraseñas.",
      href: "/ted/usuarios",
      external: false,
    },
    {
      icon: Bell,
      title: "Notificaciones",
      description:
        "Catálogo de eventos notify y configuración de destinatarios por app.",
      href: "/ted/notificaciones",
      external: false,
    },
    {
      icon: Github,
      title: "Repositorios",
      description: "Acceso a los repositorios de la organización.",
      href: process.env.NEXT_PUBLIC_TED_GITHUB_URL || "#",
      external: true,
    },
    {
      icon: BookOpen,
      title: "Documentación interna",
      description: "Guías, convenciones y manuales del equipo.",
      href: process.env.NEXT_PUBLIC_TED_DOCS_URL || "#",
      external: true,
    },
    {
      icon: Terminal,
      title: "Herramientas",
      description: "Accesos rápidos a herramientas y entornos.",
      href: process.env.NEXT_PUBLIC_TED_TOOLS_URL || "#",
      external: true,
    },
  ];

  return (
    <div className="p-8 w-full max-w-6xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Code2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">TED</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Equipo de Tecnología y Desarrollo · Programadores
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {resources.map((r) => {
          const Icon = r.icon;
          const content = (
            <>
              <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-indigo-600 to-violet-500" />
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                {r.external && (
                  <ExternalLink className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-base">
                  {r.title}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {r.description}
                </p>
              </div>
            </>
          );

          const className =
            "group relative flex flex-col gap-4 p-6 pt-7 rounded-xl border border-border bg-white hover:bg-accent/40 hover:border-border/80 transition-all duration-150 overflow-hidden";

          return r.external ? (
            <a
              key={r.title}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {content}
            </a>
          ) : (
            <Link key={r.title} href={r.href} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
