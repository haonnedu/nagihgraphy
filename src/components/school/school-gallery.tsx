"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { ShotKind } from "@/generated/prisma/enums";
import { KIND_LABEL, KIND_PARAM, kindFromParam, schoolPhotoAlt } from "@/lib/school-shared";
import type { PublicSchoolDetail } from "@/lib/school-queries";
import { FilterChip } from "@/components/school/chip";
import { SchoolPhotoDialog } from "@/components/school/school-photo-dialog";
import { SchoolPicture } from "@/components/school/school-picture";
import { sendSchoolStat } from "@/components/school/stat-beacon";

/**
 * Số ô đầu tải ngay với ưu tiên cao: hàng đầu trên điện thoại (2 cột), là ảnh
 * LCP. Còn lại lazy, để không giành băng thông 4G với font và JS.
 */
const EAGER_TILES = 2;

type Props = Pick<PublicSchoolDetail, "photos" | "photographers" | "angles" | "years" | "kinds"> & {
  school: { slug: string; name: string };
};

/**
 * Lưới ảnh một trường, ba bộ lọc cộng dồn (góc, năm, kiểu) và popup ảnh.
 *
 * Bộ lọc và ảnh đang mở nằm trong URL (?goc=&nam=&kieu=&anh=) để chia sẻ link
 * giữ nguyên. Lọc chạy ở trình duyệt trên danh sách server đã gửi, nên đổi URL
 * bằng history API gốc: Next đồng bộ useSearchParams mà không gọi lại server
 * (trang force-dynamic, router.replace sẽ truy vấn database mỗi lần bấm chip).
 * Mở ảnh thì pushState để nút back của điện thoại đóng popup.
 */
export function SchoolGallery({ school, photos, photographers, angles, years, kinds }: Props) {
  const searchParams = useSearchParams();

  // Giá trị lạ trên URL (góc đã gộp, năm không có ảnh…) thì coi như không lọc.
  const gocParam = searchParams.get("goc") ?? "";
  const angle = angles.some((a) => a.id === gocParam) ? gocParam : "";
  const namParam = Number(searchParams.get("nam")) || 0;
  const year = years.includes(namParam) ? namParam : 0;
  const kieuParam = kindFromParam(searchParams.get("kieu"));
  const kind: ShotKind | null = kieuParam && kinds.includes(kieuParam) ? kieuParam : null;

  const openId = searchParams.get("anh") ?? "";
  const open = photos.find((p) => p.id === openId) ?? null;

  const shown = photos.filter(
    (p) => (!angle || p.angle.id === angle) && (!year || p.year === year) && (!kind || p.kind === kind),
  );
  const hasFilter = Boolean(angle || year || kind);

  /** true khi chính trang này đã pushState mở ảnh, đóng thì history.back() cho gọn lịch sử. */
  const pushedRef = useRef(false);

  const writeUrl = useCallback((mutate: (params: URLSearchParams) => void, mode: "push" | "replace") => {
    const params = new URLSearchParams(window.location.search);
    mutate(params);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);

  function setFilter(key: "goc" | "nam" | "kieu", value: string) {
    writeUrl((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    }, "replace");
  }

  function clearFilters() {
    writeUrl((params) => {
      params.delete("goc");
      params.delete("nam");
      params.delete("kieu");
    }, "replace");
  }

  function openPhoto(id: string) {
    pushedRef.current = true;
    writeUrl((params) => params.set("anh", id), "push");
  }

  const close = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    } else {
      // Mở thẳng bằng link ?anh=: không có trang trước trong site để back về.
      writeUrl((params) => params.delete("anh"), "replace");
    }
  }, [writeUrl]);

  // Người dùng bấm back của trình duyệt thì ảnh đóng mà không qua close().
  useEffect(() => {
    if (!openId) pushedRef.current = false;
  }, [openId]);

  // Đếm lượt xem: mỗi ảnh một lần cho mỗi lần mở trang.
  const viewed = useRef(new Set<string>());
  const openPhotoId = open?.id ?? "";
  useEffect(() => {
    if (!openPhotoId || viewed.current.has(openPhotoId)) return;
    viewed.current.add(openPhotoId);
    sendSchoolStat(openPhotoId, "view");
  }, [openPhotoId]);

  return (
    <>
      {(angles.length > 1 || years.length > 1 || kinds.length > 1) && (
        <section className="grid gap-2.5 py-3.5" aria-label="Bộ lọc ảnh">
          {angles.length > 1 && (
            <FilterRow label="Góc chụp">
              <FilterChip on={!angle} onClick={() => setFilter("goc", "")}>
                Tất cả
              </FilterChip>
              {angles.map((a) => (
                <FilterChip key={a.id} on={angle === a.id} onClick={() => setFilter("goc", angle === a.id ? "" : a.id)}>
                  {a.name} <span className={angle === a.id ? "text-white/65" : "text-ink-3"}>{a.count}</span>
                </FilterChip>
              ))}
            </FilterRow>
          )}
          {years.length > 1 && (
            <FilterRow label="Năm chụp">
              <FilterChip on={!year} onClick={() => setFilter("nam", "")}>
                Tất cả
              </FilterChip>
              {years.map((y) => (
                <FilterChip key={y} on={year === y} onClick={() => setFilter("nam", year === y ? "" : String(y))}>
                  {y}
                </FilterChip>
              ))}
            </FilterRow>
          )}
          {kinds.length > 1 && (
            <FilterRow label="Kiểu chụp">
              <FilterChip on={!kind} onClick={() => setFilter("kieu", "")}>
                Tất cả
              </FilterChip>
              {kinds.map((k) => (
                <FilterChip
                  key={k}
                  on={kind === k}
                  onClick={() => setFilter("kieu", kind === k ? "" : KIND_PARAM[k])}
                >
                  {KIND_LABEL[k]}
                </FilterChip>
              ))}
            </FilterRow>
          )}
          {hasFilter && (
            <p className="text-[12.5px] text-ink-3">
              Hiển thị <b className="font-semibold text-ink">{shown.length}</b>/{photos.length} ảnh
              {" · "}
              <button type="button" onClick={clearFilters} className="text-blue underline underline-offset-2">
                Xoá bộ lọc
              </button>
            </p>
          )}
        </section>
      )}

      {shown.length === 0 ? (
        <div className="mt-2 rounded-card border border-dashed border-line-2 px-4 py-8 text-center text-ink-2">
          <p>Chưa có ảnh nào khớp cả ba bộ lọc này.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 rounded-[10px] border border-line-2 bg-surface px-3.5 py-2 text-[13.5px] font-medium hover:border-ink-3"
          >
            Xoá bộ lọc
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 pb-6 pt-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {shown.map((p, i) => {
            const by = photographers[p.photographerSlug];
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => openPhoto(p.id)}
                  aria-label={`Xem ảnh ${schoolPhotoAlt(p.angle.name, school.name)}${by ? `, Photo ${by.name}` : ""}`}
                  className="group relative block aspect-4/5 w-full overflow-hidden rounded-card bg-sunk text-left"
                >
                  <SchoolPicture
                    stem={p.stem}
                    width={p.width}
                    height={p.height}
                    alt={schoolPhotoAlt(p.angle.name, school.name)}
                    sizes="(min-width: 1120px) 270px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    priority={i < EAGER_TILES}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/80 via-ink/35 to-transparent px-2.5 pb-2 pt-8 text-white">
                    <b className="block truncate text-[13.5px] font-semibold leading-tight">{p.angle.name}</b>
                    <span className="block truncate text-[11.5px] text-white/80">
                      {by ? `${by.name} · ` : ""}
                      {p.year}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <SchoolPhotoDialog
        photo={open}
        photos={photos}
        photographers={photographers}
        school={school}
        onClose={close}
      />
    </>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{label}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
