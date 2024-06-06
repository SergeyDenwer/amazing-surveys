import Jimp from "jimp";

export class GlitchEffect {

  constructor() {}

  async applyEffects(imagePath: string, glitchAmount: number): Promise<string> {
    const image = await Jimp.read(imagePath);

    await this.applyGlitchEffect(image, glitchAmount);
    await this.applyChannelShiftEffect(image, 5);
    await this.applyNoiseEffect(image, 0.005);

    await image.writeAsync(imagePath);
    return imagePath;
  }

  private async applyGlitchEffect(image: Jimp, intensity: number = 0.01): Promise<void> {
    for (let i = 0; i < intensity; i++) {
      const x = Math.floor(Math.random() * image.bitmap.width);
      const y = Math.floor(Math.random() * image.bitmap.height);
      const width = Math.floor(Math.random() * (image.bitmap.width - x));
      const height = Math.min(Math.floor(Math.random() * 10), image.bitmap.height - y);

      const section = image.clone().crop(x, y, width, height);
      const newX = Math.floor(Math.random() * (image.bitmap.width - width));
      image.blit(section, newX, y);
    }
  }


  private async applyNoiseEffect(image: Jimp, intensity: number = 0.01): Promise<void> {
    for (let x = 0; x < image.bitmap.width; x++) {
      for (let y = 0; y < image.bitmap.height; y++) {
        if (Math.random() < intensity) {
          const noise = (Math.random() * 2 - 1) * 30; // Уменьшено с 255 до 30
          const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
          pixel.r = Math.max(0, Math.min(255, pixel.r + noise));
          pixel.g = Math.max(0, Math.min(255, pixel.g + noise));
          pixel.b = Math.max(0, Math.min(255, pixel.b + noise));
          image.setPixelColor(Jimp.rgbaToInt(pixel.r, pixel.g, pixel.b, pixel.a), x, y);
        }
      }
    }
  }

  private async applyChannelShiftEffect(image: Jimp, shiftAmount: number = 5): Promise<void> {
    const redChannel = new Jimp(image.bitmap.width, image.bitmap.height);
    const greenChannel = new Jimp(image.bitmap.width, image.bitmap.height);
    const blueChannel = new Jimp(image.bitmap.width, image.bitmap.height);

    redChannel.scan(0, 0, redChannel.bitmap.width, redChannel.bitmap.height, (x, y, idx) => {
      const newX = Math.min(image.bitmap.width - 1, x + shiftAmount);
      const redIdx = (image.bitmap.width * y + newX) << 2;
      redChannel.bitmap.data[redIdx] = image.bitmap.data[idx];
      redChannel.bitmap.data[redIdx + 1] = image.bitmap.data[idx + 1];
      redChannel.bitmap.data[redIdx + 2] = image.bitmap.data[idx + 2];
      redChannel.bitmap.data[redIdx + 3] = image.bitmap.data[idx + 3];
    });

    greenChannel.scan(0, 0, greenChannel.bitmap.width, greenChannel.bitmap.height, (x, y, idx) => {
      const newX = Math.max(0, x - shiftAmount);
      const greenIdx = (image.bitmap.width * y + newX) << 2;
      greenChannel.bitmap.data[greenIdx] = image.bitmap.data[idx];
      greenChannel.bitmap.data[greenIdx + 1] = image.bitmap.data[idx + 1];
      greenChannel.bitmap.data[greenIdx + 2] = image.bitmap.data[idx + 2];
      greenChannel.bitmap.data[greenIdx + 3] = image.bitmap.data[idx + 3];
    });

    blueChannel.scan(0, 0, blueChannel.bitmap.width, blueChannel.bitmap.height, (x, y, idx) => {
      const newY = Math.min(image.bitmap.height - 1, y + shiftAmount);
      const blueIdx = (image.bitmap.width * newY + x) << 2;
      blueChannel.bitmap.data[blueIdx] = image.bitmap.data[idx];
      blueChannel.bitmap.data[blueIdx + 1] = image.bitmap.data[idx + 1];
      blueChannel.bitmap.data[blueIdx + 2] = image.bitmap.data[idx + 2];
      blueChannel.bitmap.data[blueIdx + 3] = image.bitmap.data[idx + 3];
    });

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
      const redIdx = (image.bitmap.width * y + x) << 2;
      const greenIdx = (image.bitmap.width * y + x) << 2;
      const blueIdx = (image.bitmap.width * y + x) << 2;

      image.bitmap.data[idx] = redChannel.bitmap.data[redIdx]; // Red
      image.bitmap.data[idx + 1] = greenChannel.bitmap.data[greenIdx + 1]; // Green
      image.bitmap.data[idx + 2] = blueChannel.bitmap.data[blueIdx + 2]; // Blue
      image.bitmap.data[idx + 3] = image.bitmap.data[idx + 3]; // Alpha
    });
  }
}