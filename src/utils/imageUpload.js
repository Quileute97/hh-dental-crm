/**
 * HH DENTAL CRM - PARTNER ID CARD (CCCD) IMAGE UPLOAD & COMPRESSION HELPERS
 * Chứa các hàm kiểm tra hợp lệ thuần JS (chạy được trên Node test) và nén ảnh Canvas trên trình duyệt.
 */

export const MAX_RAW_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'heif'];

/**
 * Kiểm tra tệp ảnh CCCD hợp lệ trước khi xử lý/upload
 */
export function validateIdCardFile(file) {
  if (!file) {
    return { ok: false, error: 'Chưa chọn tệp hình ảnh.' };
  }

  const fileName = (file.name || '').toLowerCase();
  const ext = fileName.includes('.') ? fileName.split('.').pop() : '';
  const hasImageMime = typeof file.type === 'string' && file.type.toLowerCase().startsWith('image/');
  const hasAllowedExt = ALLOWED_IMAGE_EXTENSIONS.includes(ext);

  if (!hasImageMime && !hasAllowedExt) {
    return { ok: false, error: 'Định dạng không hỗ trợ. Vui lòng chọn tệp ảnh (JPG, PNG, WEBP).' };
  }

  if (typeof file.size === 'number' && file.size > MAX_RAW_IMAGE_BYTES) {
    return { ok: false, error: 'Kích thước tệp ảnh quá lớn (tối đa 15MB).' };
  }

  return { ok: true };
}

/**
 * Tạo đường dẫn lưu trữ ảnh CCCD chuẩn trên Supabase Storage
 */
export function buildPartnerDocumentPath(partnerId, side = 'front', ext = 'jpg', timestamp = Date.now()) {
  const safePartnerId = String(partnerId || 'unassigned').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeSide = side === 'back' ? 'back' : 'front';
  const safeExt = String(ext || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  return `cccd/${safePartnerId}/${safeSide}-${timestamp}.${safeExt}`;
}

/**
 * Kiểm tra chuỗi nguồn ảnh hợp lệ để hiển thị trong thẻ <img>
 */
export function isValidImageSource(src) {
  if (typeof src !== 'string') return false;
  const trimmed = src.trim();
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/')
  );
}

/**
 * Nén và thu gọn kích thước ảnh CCCD bằng HTML5 Canvas để hiển thị sắc nét mà nhẹ (<100KB)
 */
export async function compressIdCardImage(
  file,
  { maxWidth = 1080, maxHeight = 1080, quality = 0.74 } = {}
) {
  const validation = validateIdCardFile(file);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  if (typeof document === 'undefined') {
    throw new Error('Hàm nén ảnh chỉ hoạt động trên trình duyệt.');
  }

  const rawDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Trình duyệt không giải mã được ảnh này (vui lòng dùng JPG hoặc PNG).'));
    image.src = rawDataUrl;
  });

  let targetWidth = img.naturalWidth || img.width || 1080;
  let targetHeight = img.naturalHeight || img.height || 720;

  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
    targetWidth = Math.max(1, Math.round(targetWidth * ratio));
    targetHeight = Math.max(1, Math.round(targetHeight * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không khởi tạo được bộ xử lý ảnh.');
  }

  // Nền trắng tránh viền đen khi convert PNG trong suốt sang JPEG
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

  let blob = await new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null);
      return;
    }
    canvas.toBlob(
      (b) => resolve(b),
      'image/jpeg',
      quality
    );
  });

  if (!blob && compressedDataUrl.startsWith('data:')) {
    try {
      const byteString = atob(compressedDataUrl.split(',')[1] || '');
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i += 1) {
        bytes[i] = byteString.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: 'image/jpeg' });
    } catch {
      blob = null;
    }
  }

  return {
    blob,
    dataUrl: compressedDataUrl,
    width: targetWidth,
    height: targetHeight,
    mimeType: 'image/jpeg'
  };
}
