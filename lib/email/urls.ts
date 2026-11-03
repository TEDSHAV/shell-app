export function shell_public_url(): string {
  return (
    process.env.NEXT_PUBLIC_SHELL_URL?.replace(/\/$/, "") ||
    "https://prisma.shadevenezuela.com.ve"
  );
}
