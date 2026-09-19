import "server-only";

/**
 * Báo cho studio khi có lead mới. Telegram là kênh chính vì miễn phí và tới
 * điện thoại ngay. Thiếu token hoặc chat id thì bỏ qua, không làm hỏng
 * việc lưu lead. Mọi lỗi mạng đều nuốt, vì thông báo là phụ.
 */
export async function notifyNewLead(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // thông báo hỏng thì thôi, lead đã nằm trong database
  }
}
