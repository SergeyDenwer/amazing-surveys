import { createCanvas, registerFont, CanvasRenderingContext2D, Canvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import * as moment from 'moment';
import Jimp from 'jimp';

export interface Option {
  text: string;
  percentage: number;
}

export class GenerateImage {
  private readonly date: string;
  private readonly text: string;
  private readonly percentage: number;
  private readonly percentTexts: Option[];
  private readonly options: Option[];
  private readonly votesCount: number;

  private mainSpeedometerParams = {
    radius: 168,
    thickness: 31,
    needleThickness: 5,
    needleCircleRadius: 14,
    needleLength: 144,
    percentageFontSize: 58,
    labelFontSize: 30,
    tickStartOffset: 36,
    tickEndOffset: 54,
    distanceFromNeedle: 96
  };

  private avatarSpeedometerParams = {
    radius: 192,
    thickness: 36,
    needleThickness: 17,
    needleCircleRadius: 29,
    needleLength: 156,
    percentageFontSize: 134,
    labelFontSize: 29,
    tickStartOffset: 42,
    tickEndOffset: 60,
    distanceFromNeedle: 168
  };

  constructor(date: string, text: string, percentage: number, percentTexts: Option[], options: Option[], votesCount: number) {
    this.date = date;
    this.text = text;
    this.percentage = percentage;
    this.percentTexts = percentTexts;
    this.options = options;
    this.votesCount = votesCount;
    this.registerFonts();
  }

  private registerFonts() {
    const fonts = [
      { path: 'NotoSans-Regular.ttf', family: 'Noto Sans' },
      { path: 'NotoSans-SemiBold.ttf', family: 'Noto Sans SemiBold' },
      { path: 'PalanquinDark-Regular.ttf', family: 'Palanquin Dark' }
    ];

    fonts.forEach(font => {
      const fontPath = path.join(__dirname, '..', '..', '..', 'assets', font.path);
      registerFont(fontPath, { family: font.family });
    });
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    const words = text.split(' ');
    let line = '';
    let totalHeight = 0;

    words.forEach((word, n) => {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = word + ' ';
        y += lineHeight;
        totalHeight += lineHeight;
      } else {
        line = testLine;
      }
    });

    ctx.fillText(line, x, y);
    totalHeight += lineHeight;

    return totalHeight;
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, bottomOnly = false) {
    ctx.beginPath();
    ctx.moveTo(x + (bottomOnly ? 0 : radius), y);
    ctx.lineTo(x + width - (bottomOnly ? 0 : radius), y);
    if (!bottomOnly) {
      ctx.arcTo(x + width, y, x + width, y + radius, radius);
    }
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + (bottomOnly ? height - radius : radius));
    if (!bottomOnly) {
      ctx.arcTo(x, y, x + radius, y, radius);
    }
    ctx.closePath();
    ctx.fill();
  }

  private getPercentText(percentage: number): string {
    return this.percentTexts.find(opt => percentage <= opt.percentage)?.text || this.percentTexts[this.percentTexts.length - 1].text;
  }

  private getYearAndWeekFromDate(date: string): { year: number, week: number } {
    const formattedDate = moment(date, 'DD.MM.YYYY');
    return {
      year: formattedDate.year(),
      week: formattedDate.week()
    };
  }

  private saveImage(buffer: Buffer, fileName: string) {
    const { year, week } = this.getYearAndWeekFromDate(this.date);
    const outputDir = path.join(__dirname,  '..', '..', '..', 'images', 'results', year.toString(), `${week}`);
    fs.mkdirSync(outputDir, { recursive: true });
    const imagePath = path.join(outputDir, fileName);
    fs.writeFileSync(imagePath, buffer);
    return imagePath;
  }

  private drawSpeedometer(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, params: any) {
    const {
      radius, thickness, needleThickness, needleCircleRadius, needleLength,
      percentageFontSize, labelFontSize, tickStartOffset, tickEndOffset, distanceFromNeedle
    } = params;

    const gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
    gradient.addColorStop(0, '#FFF500');
    gradient.addColorStop(1, '#FF0000');

    ctx.lineWidth = thickness;
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI, false);
    ctx.stroke();

    ctx.lineCap = 'round';
    ctx.lineWidth = needleThickness;
    ctx.strokeStyle = '#FFFFFF';

    for (let i = 0; i <= 5; i++) {
      const angle = Math.PI + i * (Math.PI / 5);
      const startX = centerX + (radius - tickStartOffset) * Math.cos(angle);
      const startY = centerY + (radius - tickStartOffset) * Math.sin(angle);
      const endX = centerX + (radius - tickEndOffset) * Math.cos(angle);
      const endY = centerY + (radius - tickEndOffset) * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    const needleAngle = Math.PI + (this.percentage / 100) * Math.PI;
    const needleEndX = centerX + needleLength * Math.cos(needleAngle);
    const needleEndY = centerY + needleLength * Math.sin(needleAngle);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(needleEndX, needleEndY);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX, centerY, needleCircleRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.font = `${percentageFontSize}px "Palanquin Dark"`;
    ctx.textAlign = 'center';
    ctx.fillText(`${this.percentage}%`, centerX, centerY + distanceFromNeedle);

    if (params === this.mainSpeedometerParams) {
      ctx.fillStyle = '#AAAAAA';
      ctx.font = `${labelFontSize}px "Noto Sans SemiBold"`;
      ctx.fillText(this.getPercentText(this.percentage), centerX, centerY + distanceFromNeedle + 60);
    }

    ctx.save();
    ctx.fillStyle = '#FFF500';
    this.drawRoundedRect(ctx, centerX - radius - thickness / 2, centerY - thickness / 4, thickness, thickness / 2, thickness / 3, true);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#FF0000';
    this.drawRoundedRect(ctx, centerX + radius - thickness / 2, centerY - thickness / 4, thickness, thickness / 2, thickness / 3, true);
    ctx.restore();
  }

  private drawMainSpeedometer(ctx: CanvasRenderingContext2D, centerX: number, centerY: number) {
    this.drawSpeedometer(ctx, centerX, centerY, this.mainSpeedometerParams);
  }

  private drawOptionsOnTempCanvas(canvasWidth: number) {
    const tempCanvas = createCanvas(canvasWidth, 4800);
    const tempCtx = tempCanvas.getContext('2d');
    const barColors = ['#FFF500', '#FFCC00', '#FFA300', '#FF7A00', '#FF0000'];
    const textToPercentageSpace = 120;
    const textLineHeight = 36;
    const barHeight = 14;
    const barRadius = barHeight / 2;
    const spacingBelowText = -18;
    const spacingOptions = 18;
    const paddingLeftRight = 24;

    let currentY = 0;

    this.options.forEach((option, index) => {
      tempCtx.textAlign = 'left';
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.font = `28px "Noto Sans"`;
      const textWidth = canvasWidth - paddingLeftRight * 2 - textToPercentageSpace;
      const textY = currentY + textLineHeight;
      const textHeight = this.wrapText(tempCtx, option.text, paddingLeftRight, textY, textWidth, textLineHeight);

      const maxBarWidth = canvasWidth - paddingLeftRight * 3 - 90;
      let barWidth = (canvasWidth - paddingLeftRight * 2) * (option.percentage / 100);
      barWidth = Math.min(barWidth, maxBarWidth);
      tempCtx.fillStyle = barColors[index];
      const barY = textY + textHeight + spacingBelowText;

      if (option.percentage > 0) {
        tempCtx.beginPath();
        if (option.percentage < 1) {
          tempCtx.moveTo(paddingLeftRight, barY);
          tempCtx.lineTo(paddingLeftRight + barWidth, barY);
          tempCtx.lineTo(paddingLeftRight + barWidth, barY + barHeight);
          tempCtx.lineTo(paddingLeftRight, barY + barHeight);
        } else {
          tempCtx.moveTo(paddingLeftRight + barRadius, barY);
          tempCtx.lineTo(paddingLeftRight + barWidth - barRadius, barY);
          tempCtx.arc(paddingLeftRight + barWidth - barRadius, barY + barRadius, barRadius, 1.5 * Math.PI, 0.5 * Math.PI, false);
          tempCtx.lineTo(paddingLeftRight + barRadius, barY + barHeight);
          tempCtx.arc(paddingLeftRight + barRadius, barY + barRadius, barRadius, 0.5 * Math.PI, 1.5 * Math.PI, false);
        }
        tempCtx.closePath();
        tempCtx.fill();
      } else {
        tempCtx.beginPath();
        tempCtx.arc(paddingLeftRight + barRadius, barY + barRadius, barRadius, 0, 2 * Math.PI);
        tempCtx.closePath();
        tempCtx.fill();
      }

      tempCtx.textAlign = 'right';
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.font = `30px "Palanquin Dark"`;
      tempCtx.fillText(`${option.percentage}%`, canvasWidth - paddingLeftRight, barY + barHeight - 6);

      currentY = barY + barHeight + spacingOptions;
    });

    return { tempCanvas, optionsHeight: currentY };
  }

  private createMainCanvas(canvasWidth: number, totalHeight: number) {
    const canvas = createCanvas(canvasWidth, totalHeight);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    return { canvas, ctx };
  }

  private drawHeader(ctx: CanvasRenderingContext2D, paddingLeftRight: number, paddingTopBottom: number) {
    ctx.font = `26px "Noto Sans"`;
    ctx.fillText(`Опрос от ${this.date}`, paddingLeftRight, paddingTopBottom);
  }

  private drawText(ctx: CanvasRenderingContext2D, text: string, paddingLeftRight: number, textY: number, canvasWidth: number, lineHeight: number) {
    ctx.font = `28px "Noto Sans"`;
    return this.wrapText(ctx, text, paddingLeftRight, textY, canvasWidth - 2 * paddingLeftRight, lineHeight);
  }

  private drawSpeedometerSection(ctx: CanvasRenderingContext2D, centerX: number, speedometerY: number, paddingLeftRight: number) {
    const grayRectX = paddingLeftRight;
    const grayRectY = speedometerY;
    ctx.fillStyle = '#151515';
    this.drawRoundedRect(ctx, grayRectX, grayRectY, ctx.canvas.width - paddingLeftRight * 2, 410, 12);
    const adjustedCenterY = grayRectY + 218;
    this.drawMainSpeedometer(ctx, centerX, adjustedCenterY);
    return grayRectY;
  }

  private drawOptions(ctx: CanvasRenderingContext2D, optionsCanvas: Canvas, optionsY: number) {
    ctx.drawImage(optionsCanvas, 0, optionsY);
  }

  private drawFooter(ctx: CanvasRenderingContext2D, votesCountText: string, paddingLeftRight: number, votesCountTextY: number) {
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = `28px "Noto Sans"`;
    ctx.fillText(votesCountText, paddingLeftRight, votesCountTextY);
  }

  async generateMainImage() {
    console.log('Generating main image...');
    console.time('Image main generation time');

    const canvasWidth = 800;
    const paddingLeftRight = 24;
    const paddingTopBottom = 96;
    const spacingDateText = 60;
    const spacingTextSpeedometer = 36;
    const spacingOptions = 36;
    const spacingVotesCount = 36;
    const lineHeight = 36;

    const tempCanvas = createCanvas(canvasWidth, 4800);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#fff';
    tempCtx.font = `28px "Noto Sans"`;

    const textHeight = this.wrapText(tempCtx, this.text, paddingLeftRight, paddingTopBottom, canvasWidth - 2 * paddingLeftRight, lineHeight);

    const { tempCanvas: optionsCanvas, optionsHeight } = this.drawOptionsOnTempCanvas(canvasWidth);

    const votesCountText = `Всего голосов: ${this.votesCount}`;
    tempCtx.font = `28px "Noto Sans"`;
    const creationDateHeight = tempCtx.measureText(votesCountText).actualBoundingBoxAscent;

    const totalHeight = paddingTopBottom + spacingDateText + textHeight + spacingTextSpeedometer + 384 + spacingOptions + optionsHeight + spacingVotesCount + creationDateHeight + paddingTopBottom;

    const { canvas, ctx } = this.createMainCanvas(canvasWidth, totalHeight);

    this.drawHeader(ctx, paddingLeftRight, paddingTopBottom);

    const textY = paddingTopBottom + spacingDateText;
    const actualTextHeight = this.drawText(ctx, this.text, paddingLeftRight, textY, canvasWidth, lineHeight);

    const speedometerY = textY + actualTextHeight + spacingTextSpeedometer;
    const centerX = (canvas.width - 648) / 2 + 648 / 2;
    const grayRectY = this.drawSpeedometerSection(ctx, centerX, speedometerY, paddingLeftRight);

    const optionsY = grayRectY + 420 + spacingOptions;
    this.drawOptions(ctx, optionsCanvas, optionsY);

    const votesCountTextY = optionsY + optionsHeight + spacingVotesCount;
    this.drawFooter(ctx, votesCountText, paddingLeftRight, votesCountTextY);

    const buffer = canvas.toBuffer('image/png');
    const imagePath = this.saveImage(buffer, 'result.png');
    //await this.applyGlitchEffect(imagePath, 100);
    console.timeEnd('Image main generation time');
    console.log('The main image was created successfully!');
  }

  async generateAvatar() {
    console.log('Generating avatar...');
    console.time('Image avatar generation time');
    const canvasSize = 504;
    const params = this.avatarSpeedometerParams;
    const canvas = createCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    this.drawSpeedometer(ctx, centerX, centerY, params);

    const buffer = canvas.toBuffer('image/png');
    const imagePath = this.saveImage(buffer, 'avatar.png');
    //await this.applyEffects(imagePath, 50);
    console.timeEnd('Image avatar generation time');
    console.log('The avatar speedometer image was created successfully!');
  }

  private async applyEffects(imagePath: string, glitchAmount: number): Promise<string> {
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