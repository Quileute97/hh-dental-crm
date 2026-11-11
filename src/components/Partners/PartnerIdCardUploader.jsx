import React, { useRef, useState, useEffect } from 'react';
import {
  CreditCard,
  Upload,
  ZoomIn,
  Trash2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  X,
  CheckCircle2
} from 'lucide-react';
import { apiUploadPartnerIdCard } from '../../services/api';
import { isValidImageSource } from '../../utils/imageUpload';

export default function PartnerIdCardUploader({
  partnerId,
  frontUrl,
  backUrl,
  onChangeFront,
  onChangeBack,
  onUploadingChange,
  disabled = false
}) {
  const [uploadingSides, setUploadingSides] = useState({ front: false, back: false });
  const [dragOverSide, setDragOverSide] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [zoomImage, setZoomImage] = useState(null); // { src, label }

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  const hasFront = isValidImageSource(frontUrl);
  const hasBack = isValidImageSource(backUrl);

  useEffect(() => {
    const isBusy = uploadingSides.front || uploadingSides.back;
    onUploadingChange?.(isBusy);
  }, [uploadingSides.front, uploadingSides.back, onUploadingChange]);

  useEffect(() => {
    if (!zoomImage) return undefined;
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setZoomImage(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomImage]);

  async function processFile(side, file) {
    if (!file || disabled) return;
    setUploadError('');
    setUploadingSides(prev => ({ ...prev, [side]: true }));

    try {
      const res = await apiUploadPartnerIdCard(partnerId, side, file);
      if (!res.ok) {
        setUploadError(res.error || 'Không thể tải ảnh CCCD lên.');
        return;
      }

      if (side === 'front') {
        onChangeFront?.(res.url);
      } else {
        onChangeBack?.(res.url);
      }
    } catch (err) {
      setUploadError(err?.message || 'Lỗi xử lý tệp hình ảnh CCCD.');
    } finally {
      setUploadingSides(prev => ({ ...prev, [side]: false }));
    }
  }

  function handleFileInputChange(side, e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      processFile(side, file);
    }
  }

  function handleDrop(side, e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSide(null);
    if (disabled) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFile(side, file);
    }
  }

  function handleClear(side) {
    if (disabled || uploadingSides[side]) return;
    setUploadError('');
    if (side === 'front') {
      onChangeFront?.(null);
    } else {
      onChangeBack?.(null);
    }
  }

  function renderSlot(side, label, src, hasValidSrc, inputRef) {
    const isUploading = uploadingSides[side];
    const isDragging = dragOverSide === side;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-700">{label}</span>
          {hasValidSrc ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Đã tải
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">Chưa có ảnh</span>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={disabled || isUploading}
          onChange={e => handleFileInputChange(side, e)}
          className="hidden"
        />

        {hasValidSrc ? (
          <div className="relative aspect-[1.6/1] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group">
            <img
              src={src}
              alt={label}
              onClick={() => setZoomImage({ src, label })}
              className="w-full h-full object-cover cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.02]"
            />

            {isUploading && (
              <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white text-[11px] gap-1.5">
                <Loader2 className="w-5 h-5 animate-spin text-sky-300" />
                <span>Đang tải ảnh mới...</span>
              </div>
            )}

            {!isUploading && (
              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-slate-950/85 via-slate-900/50 to-transparent flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setZoomImage({ src, label })}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-white/90 hover:bg-white text-slate-800 shadow-xs transition-colors"
                  title="Phóng to ảnh"
                >
                  <ZoomIn className="w-3 h-3" />
                  <span>Phóng to</span>
                </button>
                {!disabled && (
                  <>
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-sky-600/95 hover:bg-sky-600 text-white shadow-xs transition-colors"
                      title="Thay ảnh khác"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Thay</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClear(side)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-rose-600/95 hover:bg-rose-600 text-white shadow-xs transition-colors"
                      title="Xóa ảnh này"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            onClick={() => !disabled && !isUploading && inputRef.current?.click()}
            onKeyDown={e => {
              if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isUploading) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={e => {
              e.preventDefault();
              if (!disabled && dragOverSide !== side) setDragOverSide(side);
            }}
            onDragLeave={e => {
              e.preventDefault();
              if (dragOverSide === side) setDragOverSide(null);
            }}
            onDrop={e => handleDrop(side, e)}
            className={`aspect-[1.6/1] w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-3 text-center transition-colors ${
              disabled
                ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                : isDragging
                ? 'border-sky-500 bg-sky-50 text-sky-700 cursor-copy'
                : 'border-slate-300 bg-white hover:border-sky-400 hover:bg-sky-50/50 text-slate-500 cursor-pointer'
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-1.5 text-sky-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-[11px] font-semibold">Đang nén &amp; tải ảnh...</span>
              </div>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-1.5">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">
                  Chọn hoặc kéo thả ảnh
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  JPG, PNG, WEBP • Tự động nén gọn
                </span>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-sky-600 shrink-0" />
          <span className="font-semibold text-slate-800 text-xs">
            Hình chụp Căn cước công dân (CCCD)
          </span>
        </div>

        {hasFront && hasBack ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Đã đủ 2 mặt CCCD
          </span>
        ) : hasFront || hasBack ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Mới tải 1/2 mặt
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200/70 text-slate-600">
            Chưa tải ảnh CCCD
          </span>
        )}
      </div>

      {uploadError && (
        <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          <span>{uploadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {renderSlot('front', 'Mặt trước CCCD', frontUrl, hasFront, frontInputRef)}
        {renderSlot('back', 'Mặt sau CCCD', backUrl, hasBack, backInputRef)}
      </div>

      {/* Lightbox Phóng to ảnh CCCD */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-white text-xs">
              <span className="font-semibold">{zoomImage.label}</span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-slate-950 flex items-center justify-center max-h-[80vh]">
              <img
                src={zoomImage.src}
                alt={zoomImage.label}
                className="max-w-full max-h-[75vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
