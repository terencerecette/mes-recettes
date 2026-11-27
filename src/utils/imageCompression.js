/**
 * Compresse une image côté client via Canvas API avant stockage ou envoi Supabase.
 * Largeur max : 1200 px, JPEG qualité 0.78.
 */
export function compressImageFile(file, maxWidth = 1200, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Veuillez sélectionner un fichier image valide.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire l'image sélectionnée."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Le format de l'image n'est pas pris en charge."));
      img.onload = () => {
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        if (!srcW || !srcH) {
          reject(new Error('Dimensions de image invalides.'));
          return;
        }

        const scale = srcW > maxWidth ? maxWidth / srcW : 1;
        const targetW = Math.round(srcW * scale);
        const targetH = Math.round(srcH * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas indisponible pour compresser la photo.'));
          return;
        }

        // Fond blanc pour éviter les artefacts noirs sur PNG transparent converti en JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Erreur lors de la compression JPEG.'));
              return;
            }
            resolve({
              blob,
              dataUrl,
              width: targetW,
              height: targetH,
              sizeBytes: blob.size,
            });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
