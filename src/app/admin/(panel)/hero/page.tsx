import Link from "next/link";
import { ActionForm, Field, inputClass } from "@/components/admin/form-bits";
import { requireAdmin, canEdit } from "@/lib/admin-guard";
import { listPhotographers } from "@/lib/queries";
import { money } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { saveHero } from "./actions";

export const dynamic = "force-dynamic";

const MAX_STATS = 4;

export default async function HeroPage() {
  const user = await requireAdmin();
  const editable = canEdit(user.role);

  const [settings, { photographers, total, minPrice }] = await Promise.all([
    getSettings(),
    listPhotographers({ sort: "featured" }),
  ]);
  const hero = settings.hero;

  // Ô trống thì điền sẵn giá trị trang chủ đang hiện, để người sửa thấy đúng
  // cái đang có thay vì ô trắng. Lưu là ghi thẳng giá trị đó.
  const totalSessions = photographers.reduce((sum, p) => sum + p.sessions, 0);
  const fallbackStats = [
    { value: String(total), label: "thợ đang nhận lịch" },
    { value: totalSessions.toLocaleString("vi-VN"), label: "buổi đã chụp" },
    { value: minPrice > 0 ? money(minPrice) : "Liên hệ", label: "giá khởi điểm" },
  ];
  const stats = hero.stats.length > 0 ? hero.stats : fallbackStats;
  const rows = Array.from({ length: MAX_STATS }, (_, i) => stats[i] ?? { value: "", label: "" });

  return (
    <div className="max-w-[760px]">
      <h1 className="font-serif text-[26px] font-semibold leading-tight">Chữ đầu trang chủ</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Khối đầu tiên khách nhìn thấy: dòng nhỏ, tiêu đề, đoạn mô tả, hai nút và hàng số liệu. Nền tối, chữ căn giữa, không có ảnh.{" "}
        <Link href="/" target="_blank" className="text-blue underline underline-offset-2">
          Xem trang chủ
        </Link>
      </p>

      {!editable && (
        <p className="mt-4 rounded-xl border border-line bg-sunk px-3.5 py-3 text-[13.5px] text-ink-2">
          Tài khoản của bạn chỉ xem, không sửa được.
        </p>
      )}

      <ActionForm action={saveHero} submitLabel="Lưu" className="mt-5 grid gap-5">
        <section className="rounded-card border border-line bg-surface p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Chữ</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Dòng nhỏ phía trên" hint="In hoa, màu cam. Ví dụ: Dành cho lớp 12 · Năm cuối cấp">
              <input
                name="eyebrow"
                maxLength={80}
                defaultValue={hero.eyebrow || settings.studio.kicker}
                disabled={!editable}
                className={inputClass}
              />
            </Field>
            <Field label="Tiêu đề" hint="Cụm cần nhấn màu cam đặt giữa hai dấu sao. Ví dụ: Lớp mình đã chốt *ảnh kỷ yếu* chưa?">
              <input
                name="headline"
                maxLength={120}
                required
                defaultValue={hero.headline || settings.studio.headline}
                disabled={!editable}
                className={inputClass}
              />
            </Field>
            <Field label="Đoạn mô tả" hint="Cụm cần in đậm đặt giữa hai dấu sao kép. Ví dụ: chụp **trọn 1 ngày, 7h–18h** cho cả lớp.">
              <textarea
                name="lead"
                rows={4}
                maxLength={400}
                defaultValue={hero.lead || settings.studio.intro}
                disabled={!editable}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-card border border-line bg-surface p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Hai nút</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Nút chính, dẫn tới danh sách thợ" hint={`Trống thì hiện "Xem ${total} thợ"`}>
              <input name="primaryLabel" maxLength={40} defaultValue={hero.primaryLabel} disabled={!editable} className={inputClass} />
            </Field>
            <Field label="Nút phụ, dẫn tới bảng giá" hint='Trống thì hiện "Bảng giá và phụ phí tỉnh"'>
              <input name="secondaryLabel" maxLength={40} defaultValue={hero.secondaryLabel} disabled={!editable} className={inputClass} />
            </Field>
          </div>
        </section>

        <section className="rounded-card border border-line bg-surface p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Hàng số liệu</h2>
          <p className="mt-1 text-[13px] text-ink-2">
            Tối đa {MAX_STATS} viên, mỗi viên gồm số in đậm và nhãn đi sau. Hàng nào bỏ trống cả hai ô thì không hiện. Xoá hết cả {MAX_STATS} hàng
            thì trang chủ tự tính: số thợ, số buổi đã chụp, giá khởi điểm.
          </p>
          <div className="mt-3 grid gap-2.5">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,120px)_1fr] gap-2">
                <input
                  name={`stat_value_${i}`}
                  maxLength={24}
                  defaultValue={row.value}
                  placeholder="2.538+"
                  disabled={!editable}
                  className={inputClass}
                  aria-label={`Số viên ${i + 1}`}
                />
                <input
                  name={`stat_label_${i}`}
                  maxLength={40}
                  defaultValue={row.label}
                  placeholder="lớp đã chụp"
                  disabled={!editable}
                  className={inputClass}
                  aria-label={`Nhãn viên ${i + 1}`}
                />
              </div>
            ))}
          </div>
        </section>
      </ActionForm>
    </div>
  );
}
