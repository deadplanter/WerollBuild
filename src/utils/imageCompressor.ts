/**
 * WeRoll Image Compressor Utility
 * Automatically scales and compresses uploaded character/player avatar images
 * to crystal-clear, lightweight Data URLs (max 512x512, ~40-80 KB).
 * This ensures player portraits save reliably into LocalStorage, Server Database (sheets.json),
 * and export cleanly into Cloud Backups (GitHub, Google Drive, JSON Master Backup) without quota errors.
 */

export async function compressImageFileToDataUrl(
  file: File,
  maxDimension = 512,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('El archivo no es una imagen válida.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        return reject(new Error('No se pudo generar la vista previa.'));
      }

      // If SVG or small GIF, keep as is
      if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
        return resolve(dataUrl);
      }

      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down proportionally if larger than maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(dataUrl);
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Prefer WebP if supported, fallback to JPEG
          let optimizedDataUrl: string;
          try {
            optimizedDataUrl = canvas.toDataURL('image/webp', quality);
            if (!optimizedDataUrl.startsWith('data:image/webp')) {
              optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }
          } catch {
            optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(optimizedDataUrl);
        } catch {
          resolve(dataUrl);
        }
      };

      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
