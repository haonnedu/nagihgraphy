import { ActionButton, ActionForm, inputClass } from "@/components/admin/form-bits";
import { Photo } from "@/components/photo";
import { deletePhoto, movePhoto, setCover, uploadPhotos } from "./actions";

type PhotoRow = { id: string; path: string; width: number; height: number };

/**
 * Upload nhiều ảnh một lần, sắp thứ tự, chọn bìa, xoá. Ảnh đầu tiên là bìa
 * hiện trên card ngoài trang khách. Server tự resize thành 3 cỡ WebP.
 */
export function PhotoManager({ photographerId, photos }: { photographerId: string; photos: PhotoRow[] }) {
  return (
    <section className="grid gap-3 rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Ảnh portfolio</h2>
          <p className="mt-1 text-[13px] text-ink-2">
            Ảnh đầu tiên là ảnh bìa. Nên chọn 4–8 ảnh đẹp nhất, mỗi ảnh dưới 20 MB, JPEG hoặc PNG.
          </p>
        </div>
        <span className="text-[12.5px] text-ink-3">{photos.length} ảnh</span>
      </div>

      <ActionForm action={uploadPhotos} submitLabel="Tải ảnh lên" resetOnOk className="rounded-xl bg-sunk p-3">
        <input type="hidden" name="photographerId" value={photographerId} />
        <input
          name="files"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          required
          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-blue file:px-3 file:py-1.5 file:text-white`}
        />
      </ActionForm>

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((ph, i) => (
            <li key={ph.id} className="relative overflow-hidden rounded-lg border border-line bg-sunk">
              <Photo path={ph.path} alt="" sizes="180px" fallbackWidth={400} className="aspect-3/4 w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-md bg-blue px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Bìa
                </span>
              )}
              <span className="absolute right-1.5 top-1.5 rounded-md bg-surface/90 px-1.5 py-0.5 text-[10px] text-ink-2">
                {ph.width}×{ph.height}
              </span>
              <div className="flex flex-wrap justify-between gap-1 p-1.5 text-[11px]">
                {i > 0 && <ActionButton action={setCover.bind(null, ph.id)}>Làm bìa</ActionButton>}
                <ActionButton action={movePhoto.bind(null, ph.id, "up")}>←</ActionButton>
                <ActionButton action={movePhoto.bind(null, ph.id, "down")}>→</ActionButton>
                <ActionButton action={deletePhoto.bind(null, ph.id)} confirm="Xoá ảnh này? Không hoàn tác được." tone="danger">
                  Xoá
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
