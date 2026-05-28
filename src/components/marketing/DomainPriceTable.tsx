import { TLD_PRICES } from "@/data/tld-prices";

export default function DomainPriceTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-light-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-light-surface text-left font-mono text-2xs uppercase tracking-cantila-kv text-light-ink-faint">
            <th className="px-4 py-3">TLD</th>
            <th className="px-4 py-3">Cantila / yr</th>
            <th className="px-4 py-3">Typical retail</th>
            <th className="px-4 py-3">Notes</th>
          </tr>
        </thead>
        <tbody>
          {TLD_PRICES.map((row, i) => (
            <tr
              key={row.tld}
              className={i % 2 === 0 ? "bg-light-bg" : "bg-light-surface/40"}
            >
              <td className="px-4 py-3 font-mono text-light-ink">{row.tld}</td>
              <td className="px-4 py-3 font-mono font-semibold text-ember-on-light">
                {row.perYear}
              </td>
              <td className="px-4 py-3 font-mono text-light-ink-faint line-through">
                {row.retail ?? "—"}
              </td>
              <td className="px-4 py-3 text-light-ink-dim">{row.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
