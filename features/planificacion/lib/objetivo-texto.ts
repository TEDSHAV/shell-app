export type ObjetivoTextoBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

function expand_line(line: string): string[] {
  const trimmed = line.replace(/\s+$/g, "");
  if (!trimmed.trim()) return [""];
  const value = trimmed.trim();
  const intro_list = value.match(/^(.*?[:])\s+[-•]\s+(.+)$/);
  if (intro_list) {
    return [
      intro_list[1].trim(),
      ...intro_list[2].split(/\s+[-•]\s+/).map((item) => `- ${item.trim()}`),
    ];
  }
  if (/^[-•]\s+/.test(value)) return [value.replace(/^[-•]\s+/, "- ")];
  return [value];
}

export function parse_objetivo_texto(raw: string): ObjetivoTextoBlock[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n").flatMap(expand_line);
  const blocks: ObjetivoTextoBlock[] = [];
  let bullets: string[] = [];

  function flush_list() {
    if (bullets.length === 0) return;
    blocks.push({ type: "ul", items: bullets });
    bullets = [];
  }

  for (const line of lines) {
    if (!line.trim()) {
      flush_list();
      continue;
    }
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2).trim());
      continue;
    }
    flush_list();
    blocks.push({ type: "p", text: line });
  }
  flush_list();
  return blocks;
}
