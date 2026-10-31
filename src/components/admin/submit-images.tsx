"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/admin/form-bits";
import { PrepError, prepareImage } from "@/components/admin/submit-image-prep";

export type PickedImage = {
  key: number;
  name: string;
  status: "waiting" | "preparing" | "ready" | "error";
  /** file đã chuyển HEIC và thu nhỏ, có khi status là ready */
  file?: File;
  /** object URL của file đã chuẩn bị, để xem trước */
  url?: string;
  error?: string;
};

/**
 * Giữ danh sách ảnh Photo đã chọn và chuẩn bị từng ảnh MỘT (chuyển HEIC, thu
 * nhỏ) ngay khi chọn, để xem trước được và báo lỗi theo từng ảnh. Các lần
 * chọn nối vào một hàng đợi chung nên không bao giờ giải mã hai ảnh cùng lúc.
 */
export function usePickedImages(max: number) {
  const [items, setItems] = useState<PickedImage[]>([]);
  const [notice, setNotice] = useState("");
  // Khoá các ảnh còn trong danh sách. Ảnh bị bỏ giữa chừng thì kết quả
  // chuẩn bị xong bị vứt, không tạo object URL thừa.
  const alive = useRef(new Set<number>());
  const urls = useRef(new Map<number, string>());
  const queue = useRef<Promise<void>>(Promise.resolve());
  const nextKey = useRef(0);

  useEffect(() => {
    const map = urls.current;
    return () => {
      for (const url of map.values()) URL.revokeObjectURL(url);
      map.clear();
    };
  }, []);

  function patch(key: number, next: Partial<PickedImage>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...next } : it)));
  }

  function drop(key: number) {
    alive.current.delete(key);
    const url = urls.current.get(key);
    if (url) URL.revokeObjectURL(url);
    urls.current.delete(key);
  }

  function add(list: FileList | File[] | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    const room = Math.max(0, max - alive.current.size);
    const take = files.slice(0, room);
    const skipped = files.length - take.length;
    setNotice(
      skipped > 0 ? `Mỗi lần nộp tối đa ${max} ảnh, ${skipped} ảnh sau không được thêm.` : "",
    );

    const fresh: PickedImage[] = take.map((f) => ({ key: nextKey.current++, name: f.name, status: "waiting" }));
    for (const it of fresh) alive.current.add(it.key);
    setItems((prev) => [...prev, ...fresh]);

    fresh.forEach((it, i) => {
      const source = take[i];
      queue.current = queue.current.then(async () => {
        if (!alive.current.has(it.key)) return;
        patch(it.key, { status: "preparing" });
        try {
          const file = await prepareImage(source);
          if (!alive.current.has(it.key)) return;
          const url = URL.createObjectURL(file);
          urls.current.set(it.key, url);
          patch(it.key, { status: "ready", file, url });
        } catch (err) {
          if (!alive.current.has(it.key)) return;
          patch(it.key, {
            status: "error",
            error: err instanceof PrepError ? err.message : `Không đọc được ảnh "${source.name}".`,
          });
        }
      });
    });
  }

  function remove(keys: number[]) {
    for (const k of keys) drop(k);
    setItems((prev) => prev.filter((it) => !keys.includes(it.key)));
    setNotice("");
  }

  function reset() {
    for (const k of [...alive.current]) drop(k);
    setItems([]);
    setNotice("");
  }

  const preparingAt = items.findIndex((it) => it.status === "preparing");
  const busy = items.some((it) => it.status === "waiting" || it.status === "preparing");
  const progress =
    preparingAt >= 0 ? `Đang chuẩn bị ảnh ${preparingAt + 1}/${items.length}…` : busy ? "Đang chuẩn bị ảnh…" : "";

  return {
    items,
    notice,
    busy,
    progress,
    full: items.length >= max,
    hasError: items.some((it) => it.status === "error"),
    ready: items.filter((it) => it.status === "ready" && it.file) as (PickedImage & { file: File })[],
    add,
    remove,
    reset,
  };
}

export type PickedImages = ReturnType<typeof usePickedImages>;

/** Ô chọn ảnh + lưới xem trước có nút bỏ từng ảnh. */
export function ImagePicker({
  picker,
  multiple,
  disabled,
  label,
}: {
  picker: PickedImages;
  multiple: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <input
        type="file"
        // Thêm .heic/.heif vì có trình duyệt không xếp HEIC vào image/*.
        accept="image/*,.heic,.heif"
        multiple={multiple}
        disabled={disabled || (multiple && picker.full)}
        aria-label={label}
        onChange={(e) => {
          // Ô một ảnh (ảnh thay thế): chọn ảnh mới thì thay ảnh cũ.
          if (!multiple && e.target.files?.length) picker.reset();
          picker.add(e.target.files);
          // Xoá giá trị để chọn lại đúng file vừa bỏ vẫn kích hoạt onChange.
          e.target.value = "";
        }}
        className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-blue file:px-3 file:py-1.5 file:text-white disabled:opacity-60`}
      />
      {picker.notice && (
        <p role="alert" className="text-[12.5px] text-warn">
          {picker.notice}
        </p>
      )}
      {picker.progress && <p className="text-[12.5px] text-ink-2">{picker.progress}</p>}

      {picker.items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {picker.items.map((it) => (
            <li key={it.key} className="relative overflow-hidden rounded-lg border border-line bg-sunk">
              {it.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.url} alt={it.name} className="aspect-3/4 w-full object-cover" decoding="async" />
              ) : (
                <div className="grid aspect-3/4 w-full place-items-center p-2 text-center text-[11px] text-ink-3">
                  {it.status === "error" ? "Lỗi" : it.status === "preparing" ? "Đang chuẩn bị…" : "Chờ…"}
                </div>
              )}
              <button
                type="button"
                onClick={() => picker.remove([it.key])}
                disabled={disabled}
                aria-label={`Bỏ ảnh ${it.name}`}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-surface/90 text-[15px] leading-none text-ink shadow-sm hover:text-warn disabled:opacity-60"
              >
                ×
              </button>
              {it.error && <p className="border-t border-line bg-surface p-1.5 text-[11px] leading-snug text-warn">{it.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
