"use client";

import { useId, useState } from "react";
import { Field, inputClass } from "@/components/admin/form-bits";
import type { ShotKind } from "@/generated/prisma/enums";
import { ANGLE_NAME_MAX, KIND_LABEL, MIN_YEAR, NOTE_MAX } from "@/lib/school-shared";

/** Một trường trong ô chọn, kèm danh mục góc chuẩn để gợi ý. */
export type SubmitSchool = {
  id: string;
  name: string;
  short: string;
  city: string;
  angles: { id: string; name: string }[];
};

const KINDS: ShotKind[] = ["INDIVIDUAL", "GROUP"];

/**
 * Các ô thông tin chung của form nộp ảnh và form sửa nộp lại: trường, góc,
 * năm, kiểu chụp, ghi chú, cam kết. Ô góc là ô gõ có gợi ý các góc chuẩn của
 * trường đang chọn; gõ góc mới vẫn được, server tự khớp nếu trùng không dấu.
 */
export function SubmitFields({
  schools,
  currentYear,
  defaults,
  disabled,
}: {
  schools: SubmitSchool[];
  currentYear: number;
  defaults?: { schoolId: string; angle: string; year: number; kind: ShotKind; note: string };
  disabled?: boolean;
}) {
  const uid = useId();
  const [schoolId, setSchoolId] = useState(defaults?.schoolId ?? "");
  const angles = schools.find((s) => s.id === schoolId)?.angles ?? [];

  return (
    <fieldset disabled={disabled} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Trường">
          <select
            name="schoolId"
            required
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Chọn trường…
            </option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.short ? `${s.short} · ${s.name}` : s.name}
                {s.city ? ` (${s.city})` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Góc chụp"
          hint={
            !schoolId
              ? "Chọn trường trước để thấy các góc đã có"
              : angles.length > 0
                ? "Ưu tiên chọn góc có sẵn trong gợi ý. Không có thì gõ góc mới."
                : "Trường này chưa có góc nào, gõ tên góc, VD: Sảnh chính"
          }
        >
          <input
            name="angleText"
            required
            list={`${uid}-angles`}
            defaultValue={defaults?.angle ?? ""}
            maxLength={ANGLE_NAME_MAX}
            autoComplete="off"
            placeholder="VD: Sảnh V, Hàng cây…"
            className={inputClass}
          />
          <datalist id={`${uid}-angles`}>
            {angles.map((a) => (
              <option key={a.id} value={a.name} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Năm chụp">
          <input
            name="year"
            type="number"
            inputMode="numeric"
            required
            min={MIN_YEAR}
            max={currentYear + 1}
            defaultValue={defaults?.year ?? currentYear}
            className={inputClass}
          />
        </Field>
        <div className="grid content-start gap-1">
          <span className="text-xs font-medium text-ink-2">Kiểu chụp</span>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <label
                key={k}
                className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-line-2 bg-surface px-3 text-[13.5px] has-checked:border-blue has-checked:bg-blue-soft"
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  required
                  defaultChecked={(defaults?.kind ?? "INDIVIDUAL") === k}
                  className="size-4 accent-blue"
                />
                {KIND_LABEL[k]}
              </label>
            ))}
          </div>
        </div>
      </div>

      <Field label="Ghi chú chụp (tuỳ chọn)" hint="Khách sẽ đọc ghi chú này cạnh ảnh của bạn">
        <textarea
          name="note"
          rows={2}
          maxLength={NOTE_MAX}
          defaultValue={defaults?.note ?? ""}
          placeholder="Giờ nào đẹp, cần xin phép ai…"
          className={`${inputClass} resize-y`}
        />
      </Field>

      <label className="flex items-start gap-2 rounded-xl border border-line bg-sunk px-3 py-2.5 text-[13.5px]">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-blue" />
        <span>Khách trong ảnh đã đồng ý cho NAGIH đăng ảnh này</span>
      </label>
    </fieldset>
  );
}
