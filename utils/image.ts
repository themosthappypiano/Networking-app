const MAX_IMAGE_SIZE = 900;
const JPEG_QUALITY = 0.82;

function prepareImage(file: File, maxWidth: number, maxHeight: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("The image could not be loaded."));
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Image processing is not supported in this browser."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function prepareProfilePhoto(file: File): Promise<string> {
  return prepareImage(file, MAX_IMAGE_SIZE, MAX_IMAGE_SIZE);
}

export function prepareProfileBanner(file: File): Promise<string> {
  return prepareImage(file, 1800, 600);
}
