import React, { useEffect, useId, useRef, useState } from 'react';
import { Camera, ImagePlus, RefreshCw, Trash2 } from 'lucide-react';

type PhotoUploadFieldProps = {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
  cameraFacing?: 'user' | 'environment';
  theme?: 'dark' | 'light';
};

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export const PhotoUploadField: React.FC<PhotoUploadFieldProps> = ({
  label,
  file,
  onChange,
  required = false,
  hint,
  disabled = false,
  cameraFacing = 'user',
  theme = 'dark',
}) => {
  const id = useId();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selectFile = (next: File | null) => {
    setError(null);
    if (!next) {
      onChange(null);
      return;
    }
    if (!ACCEPTED.includes(next.type)) {
      setError('Choose a JPEG, PNG or WebP image.');
      return;
    }
    if (next.size > MAX_BYTES) {
      setError('Image must be under 5MB.');
      return;
    }
    onChange(next);
  };

  const resetInput = (input: HTMLInputElement | null) => {
    if (input) input.value = '';
  };

  const light = theme === 'light';

  return (
    <div>
      <p className={`mb-1.5 flex items-center gap-1 text-[13px] font-medium ${light ? 'text-[#3f3548]' : 'text-zinc-200'}`}>
        {label}
        {required ? <span className={light ? 'text-[#7e22ce]' : 'text-brand-purple-light'} aria-hidden>*</span> : null}
      </p>

      <div className={`rounded-xl border p-3 ${light ? 'border-[#d8c7ea] bg-[#faf7ff]' : 'border-white/12 bg-[#100d17]'}`}>
        {preview ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <img
              src={preview}
              alt={`${label} preview`}
              className="h-28 w-28 shrink-0 rounded-xl border border-white/10 object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => cameraRef.current?.click()}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[12.5px] font-semibold disabled:opacity-60 ${light ? 'border-[#c4a7e3] text-[#6d28d9] hover:bg-[#f3e8ff]' : 'border-brand-purple/40 text-brand-purple-light hover:bg-brand-purple/10'}`}
              >
                <RefreshCw className="h-4 w-4" aria-hidden /> Retake
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => galleryRef.current?.click()}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[12.5px] font-semibold disabled:opacity-60 ${light ? 'border-[#d8c7ea] text-[#3f3548] hover:bg-[#f3edfa]' : 'border-white/12 text-zinc-300 hover:bg-white/[0.05]'}`}
              >
                <ImagePlus className="h-4 w-4" aria-hidden /> Replace
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(null);
                  resetInput(cameraRef.current);
                  resetInput(galleryRef.current);
                }}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[12.5px] font-semibold disabled:opacity-60 ${light ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-red-400/30 text-red-300 hover:bg-red-500/10'}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => cameraRef.current?.click()}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-[13px] font-semibold disabled:opacity-60 ${light ? 'border-[#c4a7e3] bg-[#f3e8ff] text-[#6d28d9] hover:bg-[#ede0fb]' : 'border-brand-purple/40 bg-brand-purple/10 text-brand-purple-light hover:bg-brand-purple/20'}`}
            >
              <Camera className="h-4 w-4" aria-hidden /> Take a Photo
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => galleryRef.current?.click()}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-[13px] font-semibold disabled:opacity-60 ${light ? 'border-[#d8c7ea] text-[#3f3548] hover:bg-[#f3edfa]' : 'border-white/12 text-zinc-200 hover:bg-white/[0.05]'}`}
            >
              <ImagePlus className="h-4 w-4" aria-hidden /> Choose from Gallery
            </button>
          </div>
        )}

        {preview && file ? (
          <p className={`mt-2 min-w-0 truncate text-[11.5px] ${light ? 'text-[#675f73]' : 'text-zinc-500'}`}>{file.name}</p>
        ) : null}
        {error ? (
          <p role="alert" className={`mt-2 text-[12px] ${light ? 'text-red-700' : 'text-red-300'}`}>
            {error}
          </p>
        ) : null}
      </div>

      {hint ? <p className={`mt-1 text-[11.5px] leading-relaxed ${light ? 'text-[#675f73]' : 'text-zinc-500'}`}>{hint}</p> : null}

      <input
        ref={cameraRef}
        id={`${id}-camera`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={cameraFacing}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          selectFile(event.target.files?.[0] ?? null);
          resetInput(event.currentTarget);
        }}
      />
      <input
        ref={galleryRef}
        id={`${id}-gallery`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          selectFile(event.target.files?.[0] ?? null);
          resetInput(event.currentTarget);
        }}
      />
    </div>
  );
};

export default PhotoUploadField;
