/**
 * Gửi một sự kiện đếm (khách mở ảnh / bấm Đặt) về /api/truong/su-kien.
 * sendBeacon vẫn gửi được khi trang đang chuyển đi, hợp với nút Đặt.
 * Endpoint đọc text rồi tự parse, nên gửi Blob kiểu text/plain để trình duyệt
 * không phải hỏi preflight. Lỗi thì bỏ qua, con số không đáng làm phiền khách.
 */
export function sendSchoolStat(photoId: string, type: "view" | "book"): void {
  const url = "/api/truong/su-kien";
  const body = JSON.stringify({ photoId, type });
  try {
    if (navigator.sendBeacon?.(url, new Blob([body], { type: "text/plain;charset=UTF-8" }))) return;
  } catch {
    // rơi xuống fetch
  }
  try {
    void fetch(url, { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // bỏ qua
  }
}
