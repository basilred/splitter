import QRCode from 'qrcode';

/**
 * Генерация QR-кода в виде буфера PNG
 * @param data Данные для кодирования (обычно URL)
 * @returns Buffer с PNG изображением
 */
export async function generateQRCode(data: string): Promise<Buffer> {
  try {
    const buffer = await QRCode.toBuffer(data, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return buffer;
  } catch (error) {
    console.error('QR generation error:', error);
    throw new Error('Не удалось сгенерировать QR-код');
  }
}

/**
 * Генерация QR-кода в виде Data URL (base64)
 * @param data Данные для кодирования
 * @returns Data URL (image/png;base64,...)
 */
export async function generateQRCodeDataURL(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (error) {
    console.error('QR generation error:', error);
    throw new Error('Не удалось сгенерировать QR-код');
  }
}
