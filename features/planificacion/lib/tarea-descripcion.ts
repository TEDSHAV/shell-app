import {
  avance_from_checklist,
  parse_tarea_checklist,
  stamp_check_times,
  type TareaCheckItem,
} from "./tarea-checklist";

const CHECK_RE = /^\s*[-*]\s*\[( |x|X)\]\s?(.*)$/;

export type DescBlock =
  | { kind: "text"; text: string }
  | { kind: "check"; done: boolean; texto: string };

export function parse_descripcion(raw: string): DescBlock[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: DescBlock[] = [];
  let buf: string[] = [];

  function flush() {
    const text = buf.join("\n");
    buf = [];
    if (text.length > 0) blocks.push({ kind: "text", text });
  }

  for (const line of lines) {
    const match = CHECK_RE.exec(line);
    if (match) {
      flush();
      blocks.push({
        kind: "check",
        done: match[1] !== " ",
        texto: match[2] ?? "",
      });
    } else {
      buf.push(line);
    }
  }
  flush();
  if (blocks.length === 0) blocks.push({ kind: "text", text: "" });
  return blocks;
}

export function serialize_descripcion(blocks: DescBlock[]): string {
  return blocks
    .map((block) => {
      if (block.kind === "check") {
        return `- [${block.done ? "x" : " "}] ${block.texto}`.trimEnd();
      }
      return block.text;
    })
    .join("\n");
}

export function checks_in_descripcion(raw: string): TareaCheckItem[] {
  return parse_descripcion(raw)
    .filter((block): block is Extract<DescBlock, { kind: "check" }> => block.kind === "check")
    .map((block, index) => ({
      id: `d${index}`,
      texto: block.texto.trim(),
      done: block.done,
      completed_at: null,
    }))
    .filter((item) => item.texto.length > 0);
}

export function avance_from_descripcion(raw: string): number | null {
  return avance_from_checklist(checks_in_descripcion(raw));
}

export function hydrate_descripcion(
  descripcion: string | null | undefined,
  checklist: unknown,
): string {
  const text = descripcion ?? "";
  if (checks_in_descripcion(text).length > 0) return text;
  const legacy = parse_tarea_checklist(checklist);
  if (legacy.length === 0) return text;
  const extra = serialize_descripcion(
    legacy.map((item) => ({
      kind: "check" as const,
      done: item.done,
      texto: item.texto,
    })),
  );
  return [text.trim(), extra].filter(Boolean).join("\n");
}

export function merge_check_times(
  stored: unknown,
  descripcion: string,
): TareaCheckItem[] {
  return stamp_check_times(
    parse_tarea_checklist(stored),
    checks_in_descripcion(descripcion),
    "",
  ).map((item) => ({
    ...item,
    completed_at: item.completed_at ? item.completed_at : null,
  }));
}

export function toggle_check_at(raw: string, index: number): string {
  const blocks = parse_descripcion(raw);
  let seen = -1;
  const next = blocks.map((block) => {
    if (block.kind !== "check") return block;
    seen += 1;
    if (seen !== index) return block;
    return { ...block, done: !block.done };
  });
  return serialize_descripcion(next);
}
