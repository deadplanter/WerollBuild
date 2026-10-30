import React, { useRef } from 'react';
import { Upload, Link2, Trash2 } from 'lucide-react';

interface ImageSourcePickerProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

export const ImageSourcePicker: React.FC<ImageSourcePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'https://... o sube archivo PNG/GIF/WebP',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Link2 className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-zinc-900 border border-zinc-800 rounded pl-6 pr-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[10px] font-bold text-amber-300 flex items-center gap-1 shrink-0"
          title="Subir archivo desde tu equipo (PNG, GIF, WebP, JPG)"
        >
          <Upload className="w-3 h-3" />
          Archivo
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 rounded bg-red-950/50 hover:bg-red-900/60 border border-red-800/40 text-red-300 shrink-0"
            title="Quitar imagen"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/gif,image/webp,image/jpeg,image/svg+xml"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
