export function Footer() {
  return (
    <footer className="h-10 border-t border-border bg-background flex items-center px-6 shrink-0">
      <p className="text-xs text-muted-foreground/50">
        &copy; {new Date().getFullYear()} SHA de Venezuela, C.A
      </p>
    </footer>
  );
}
