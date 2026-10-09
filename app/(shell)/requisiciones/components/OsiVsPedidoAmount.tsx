function usd(value: number): string {
  return `$ ${value.toFixed(2)}`;
}

export function OsiVsPedidoAmount({
  current,
  original,
}: {
  current: number;
  original: number;
}) {
  const dirty = Math.abs(current - original) >= 0.02;
  return (
    <div className="text-center leading-tight">
      <p className="font-bold">{usd(current)}</p>
      <p className={dirty ? "text-[9px] font-medium text-amber-800" : "text-[9px] text-slate-500"}>
        OSI {usd(original)}
      </p>
    </div>
  );
}
