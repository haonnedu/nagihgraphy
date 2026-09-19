const STATUS = {
  IN: { label: "Có sẵn trong gói", className: "border-in-line bg-in-bg text-in-ink" },
  EXTRA: { label: "Có, tính thêm phí", className: "border-extra-line bg-extra-bg text-extra-ink" },
  NO: { label: "Không có", className: "border-none-line bg-none-bg text-none-ink" },
} as const;

type Feature = { key: string; label: string; status: string };

/** Ma trận 5 dịch vụ × 3 trạng thái, giữ nguyên từ bản artifact cũ. */
export function FeatureMatrix({ features }: { features: Feature[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-line">
      {features.map((f, i) => {
        const s = STATUS[f.status as keyof typeof STATUS] ?? STATUS.NO;
        return (
          <div
            key={f.key}
            className={`flex items-center justify-between gap-2.5 px-3.5 py-3 ${i > 0 ? "border-t border-line" : ""}`}
          >
            <span className="text-sm">{f.label}</span>
            <span
              className={`shrink-0 rounded-lg border px-2.5 py-1 text-[12.5px] font-medium ${s.className}`}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
