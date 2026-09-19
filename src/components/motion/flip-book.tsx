"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Photo } from "@/components/photo";

export type GalleryPhoto = { id: string; path: string; alt: string; owner?: string };

/** Mỗi trang chiếm chừng này chiều cao màn hình khi cuộn. */
const SCROLL_PER_PAGE_VH = 50;
const MAX_PAGES = 8;

/**
 * Portfolio kiểu sách lật, cuộn dọc là lật trang, chạy trên mọi kích thước.
 *
 * Section cao bằng 100svh cộng thêm 50vh cho mỗi trang, bên trong là một
 * sân khấu sticky. Các trang xếp chồng đúng một chỗ, trang đầu trên cùng.
 * Cuộn xuống thì trang trên gập quanh mép trái (gáy sách) và tối dần, quá
 * 90 độ thì backface-visibility giấu nó đi, trang dưới lộ ra đã phẳng sẵn.
 *
 * Ghim bằng position sticky chứ không bằng JS, nên trên iOS không giật.
 * Motion chỉ đọc tiến độ cuộn và tính góc, không tự điều khiển cuộn.
 */
export function FlipBook({ photos }: { photos: GalleryPhoto[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const pages = photos.slice(0, MAX_PAGES);
  const n = pages.length;

  /**
   * Tiến độ 0→1 khi cuộn qua section. Tự đọc getBoundingClientRect mỗi khung
   * hình thay vì useScroll với target, vì useScroll cache vị trí phần tử lúc
   * mount, nội dung phía trên nạp muộn (ảnh hero, font) làm nó trôi và trang
   * bị lật sớm. ResizeObserver trên body bắt cả những lần layout đổi sau đó.
   */
  const progress = useMotionValue(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      progress.set(range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [progress]);

  // 0 → n-1, phần thập phân là mức gập của trang hiện tại.
  const pageFloat = useTransform(progress, [0, 1], [0, Math.max(0, n - 1)]);

  const [current, setCurrent] = useState(0);
  useMotionValueEvent(pageFloat, "change", (v) => {
    setCurrent(Math.max(0, Math.min(n - 1, Math.round(v))));
  });

  if (reduced) {
    return (
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-6">
        {pages.map((p) => (
          <figure key={p.id} className="w-[72%] shrink-0 snap-center overflow-hidden rounded-card border border-line bg-surface sm:w-[300px]">
            <Photo path={p.path} alt={p.alt} sizes="(min-width: 640px) 300px, 72vw" className="aspect-3/4 w-full object-cover" />
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative -mx-4"
      style={{ height: `calc(100svh + ${(n - 1) * SCROLL_PER_PAGE_VH}vh)` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center gap-4 [perspective:1400px]">
        {/* Khung ảnh tính theo chiều cao màn để không thừa khoảng trống.
            Điện thoại dọc bị chặn bởi chiều rộng, nên dùng tỉ lệ 3:5 cho khung
            cao hơn, ảnh 3:4 bị cắt hai bên chừng 12%. Từ sm trở lên về 3:4. */}
        <div
          className="relative aspect-[3/5] sm:aspect-3/4"
          style={{ width: "min(94vw, 60svh)" }}
        >
          {pages.map((photo, i) => (
            <Page key={photo.id} photo={photo} index={i} total={n} pageFloat={pageFloat} priority={i < 2} />
          ))}
        </div>

        <p className="flex items-center gap-2 text-[13px] text-ink-2">
          {pages[current]?.owner && <span className="font-medium text-ink">{pages[current].owner}</span>}
          <span className="tabular-nums text-ink-3">
            {current + 1} / {n}
          </span>
          <span className="text-ink-3">· cuộn để lật</span>
        </p>
      </div>
    </div>
  );
}

function Page({
  photo,
  index,
  total,
  pageFloat,
  priority,
}: {
  photo: GalleryPhoto;
  index: number;
  total: number;
  pageFloat: MotionValue<number>;
  priority: boolean;
}) {
  // <0 chưa tới lượt, 0 đang xem, 0→1 đang gập, ≥1 đã lật xong.
  const local = useTransform(pageFloat, (v) => v - index);
  const rotateY = useTransform(local, [0, 1], [0, -105]);
  const shade = useTransform(local, [0, 1], [0, 0.7]);
  // Trang bên dưới hơi nhỏ, lớn dần lên đúng cỡ khi tới lượt.
  const scale = useTransform(local, [-1, 0], [0.955, 1]);

  return (
    <motion.figure
      style={{ rotateY, scale, zIndex: total - index, transformOrigin: "0% 50%" }}
      className="absolute inset-0 overflow-hidden rounded-card border border-line bg-surface shadow-card will-change-transform [backface-visibility:hidden]"
    >
      <Photo
        path={photo.path}
        alt={photo.alt}
        sizes="(min-width: 640px) 440px, 82vw"
        fallbackWidth={800}
        priority={priority}
        className="size-full object-cover"
      />
      <motion.div
        aria-hidden
        style={{ opacity: shade }}
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/45"
      />
    </motion.figure>
  );
}
