import { createCanvas, registerFont, CanvasRenderingContext2D, Canvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import {AnswerOptions} from "../constants/answer-options.enum";

interface Option {
  text: string;
  percentage: number;
}

export class GenerateImage {
  private readonly date: string;
  private readonly text: string;
  private readonly percentage: number;
  private readonly percentText: string;
  private options: Option[];
  private readonly votesCountText: string;

  constructor(date: string, text: string, percentage: number, percentText: string, options: Option[], votesCountText: string) {
    this.date = date;
    this.text = text;
    this.percentage = percentage;
    this.percentText = percentText;
    this.options = options;
    this.votesCountText = votesCountText;
    this.registerFonts();
  }

  // Регистрация шрифтов
  registerFonts() {
    const notoSansPath = path.join(__dirname, '..', '..', '..', 'assets', 'NotoSans-Regular.ttf');
    const palanquinDarkPath = path.join(__dirname, '..', '..', '..', 'assets', 'PalanquinDark-Regular.ttf');
    registerFont(notoSansPath, { family: 'Noto Sans' });
    registerFont(palanquinDarkPath, { family: 'Palanquin Dark' });
  }

  // Обертка текста для его переноса
  wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    const words = text.split(' ');
    let line = '';
    let totalHeight = 0;

    words.forEach((word, n) => {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
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

    return totalHeight; // Возвращаем полную высоту текста
  }

  // Рисование закругленных прямоугольников
  drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, bottomOnly = false) {
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

  // Рисование спидометра
  drawSpeedometer(ctx: CanvasRenderingContext2D, centerX: number, centerY: number) {
    const offset = 5; // Отступ 5 пикселей со всех сторон
    const radius = 130 - offset; // Радиус для учета отступов
    const thickness = 20; // Толщина
    const needleLength = radius - 15; // Длина стрелки

    // Рисование цветной полуокружности
    const gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
    gradient.addColorStop(0, '#FFF500');
    gradient.addColorStop(1, '#FF0000');

    ctx.lineWidth = thickness;
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI, false);
    ctx.stroke();

    // Рисование насечек
    ctx.lineWidth = 3; // Толщина линии
    ctx.strokeStyle = '#FFFFFF';
    for (let i = 0; i <= 5; i++) {
      const angle = Math.PI + i * (Math.PI / 5);
      const startX = centerX + (radius - 25) * Math.cos(angle);
      const startY = centerY + (radius - 25) * Math.sin(angle);
      const endX = centerX + (radius - 40) * Math.cos(angle);
      const endY = centerY + (radius - 40) * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Рисование стрелки
    const needleAngle = Math.PI + this.percentage * Math.PI;
    const needleEndX = centerX + needleLength * Math.cos(needleAngle);
    const needleEndY = centerY + needleLength * Math.sin(needleAngle);

    ctx.lineWidth = 4; // Толщина линии
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(needleEndX, needleEndY);
    ctx.stroke();

    // Рисование кружка в начале стрелки
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI); // Радиус круга
    ctx.fill();

    // Рисование процента
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '48px "Palanquin Dark"';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.percentage * 100)}%`, centerX, centerY + 80);

    // Рисование текста под процентом
    ctx.fillStyle = '#AAAAAA'; // Светло-серый цвет
    ctx.font = '24px "Noto Sans"';
    ctx.fillText(this.percentText, centerX, centerY + 130);

    // Добавление закруглений
    ctx.save(); // Сохранение текущего состояния контекста
    ctx.fillStyle = '#FFF500'; // Левый край цветной полуокружности
    this.drawRoundedRect(ctx, centerX - radius - thickness / 2, centerY - thickness / 2, thickness, thickness, thickness / 3, true);
    ctx.restore(); // Восстановление состояния контекста

    ctx.save(); // Сохранение текущего состояния контекста
    ctx.fillStyle = '#FF0000'; // Правый край цветной полуокружности
    this.drawRoundedRect(ctx, centerX + radius - thickness / 2, centerY - thickness / 2, thickness, thickness, thickness / 3, true);
    ctx.restore(); // Восстановление состояния контекста
  }

  // Создание временного холста для вариантов
  drawOptionsOnTempCanvas(canvasWidth: number) {
    const tempCanvas = createCanvas(canvasWidth, 4000);
    const tempCtx = tempCanvas.getContext('2d');
    const barColors = ['#FFF500', '#FFCC00', '#FFA300', '#FF7A00', '#FF0000'];
    const textToPercentageSpace = 100; // Расстояние между текстом варианта и процентом
    const textLineHeight = 30; // Высота строки текста
    const barHeight = 12; // Высота полоски
    const barRadius = barHeight / 2;
    const spacingBelowText = -15; // Отступ под текстом
    const spacingOptions = 15; // Расстояние между блоками
    const paddingLeftRight = 20;

    let currentY = 0;

    this.options.forEach((option, index) => {
      // Рисуем процент
      tempCtx.textAlign = 'right';
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.font = '25px "Noto Sans"';
      tempCtx.fillText(`${option.percentage}%`, canvasWidth - paddingLeftRight, currentY + textLineHeight);

      // Рисуем текст варианта
      tempCtx.textAlign = 'left';
      const textWidth = canvasWidth - paddingLeftRight * 2 - textToPercentageSpace;
      const textY = currentY + textLineHeight;
      const textHeight = this.wrapText(tempCtx, option.text, paddingLeftRight, textY, textWidth, textLineHeight);

      // Рисуем полоску с закруглениями
      const barWidth = (canvasWidth - paddingLeftRight * 2) * (option.percentage / 100);
      tempCtx.fillStyle = barColors[index];
      const barY = textY + textHeight + spacingBelowText;

      tempCtx.beginPath();
      tempCtx.moveTo(paddingLeftRight + barRadius, barY);
      tempCtx.lineTo(paddingLeftRight + barWidth - barRadius, barY);
      tempCtx.arc(paddingLeftRight + barWidth - barRadius, barY + barRadius, barRadius, 1.5 * Math.PI, 0.5 * Math.PI, false);
      tempCtx.lineTo(paddingLeftRight + barRadius, barY + barHeight);
      tempCtx.arc(paddingLeftRight + barRadius, barY + barRadius, barRadius, 0.5 * Math.PI, 1.5 * Math.PI, false);
      tempCtx.closePath();
      tempCtx.fill();

      // Обновляем currentY
      currentY = barY + barHeight + spacingOptions;
    });

    return { tempCanvas, optionsHeight: currentY };
  }

  // Создание основного холста
  createMainCanvas(canvasWidth: number, totalHeight: number) {
    const canvas = createCanvas(canvasWidth, totalHeight);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000'; // Фон холста черный
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    return { canvas, ctx };
  }

  // Рисование заголовка
  drawHeader(ctx: CanvasRenderingContext2D, paddingLeftRight: number, paddingTopBottom: number) {
    ctx.font = '20px "Noto Sans"';
    ctx.fillText(this.date, paddingLeftRight, paddingTopBottom);
  }

  // Рисование текста
  drawText(ctx: CanvasRenderingContext2D, text: string, paddingLeftRight: number, textY: number, canvasWidth: number, lineHeight: number) {
    ctx.font = '25px "Noto Sans"';
    return this.wrapText(ctx, text, paddingLeftRight, textY, canvasWidth - 2 * paddingLeftRight, lineHeight);
  }

  // Рисование секции со спидометром
  drawSpeedometerSection(ctx: CanvasRenderingContext2D, centerX: number, speedometerY: number) {
    const grayRectX = (ctx.canvas.width - 540) / 2;
    const grayRectY = speedometerY;
    ctx.fillStyle = '#0e0e0e';
    this.drawRoundedRect(ctx, grayRectX, grayRectY, 540, 320, 10);
    const adjustedCenterY = grayRectY + (320 / 2);
    this.drawSpeedometer(ctx, centerX, adjustedCenterY);
    return grayRectY;
  }

  // Рисование вариантов
  drawOptions(ctx: CanvasRenderingContext2D, optionsCanvas: Canvas, optionsY: number) {
    ctx.drawImage(optionsCanvas, 0, optionsY);
  }

  // Рисование нижнего колонтитула
  drawFooter(ctx: CanvasRenderingContext2D, votesCountText: string, paddingLeftRight: number, votesCountTextY: number) {
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(votesCountText, paddingLeftRight, votesCountTextY);
  }

  // Основной метод для генерации изображения
  async generateImage() {
    console.log('Generating image...');
    console.time('Image generation time');

    const canvasWidth = 724; // Ширина холста
    const paddingLeftRight = 20; // Отступы
    const paddingTopBottom = 80; // Отступы
    const spacingDateText = 50; // Промежуток
    const spacingTextSpeedometer = 30; // Промежуток
    const spacingOptions = 30; // Отступ от серого блока до блока с вариантами
    const spacingVotesCount = 30; // Отступ между блоком с опциями и текстом "Дата создания"

    const lineHeight = 30; // Интервал

    // Создаем временный холст для расчета высоты текста
    const tempCanvas = createCanvas(canvasWidth, 4000);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#fff';
    tempCtx.font = '25px "Noto Sans"'; // Размер шрифта

    const textHeight = this.wrapText(tempCtx, this.text, paddingLeftRight, paddingTopBottom, canvasWidth - 2 * paddingLeftRight, lineHeight);

    // Создаем временный холст для вариантов ответов
    const { tempCanvas: optionsCanvas, optionsHeight } = this.drawOptionsOnTempCanvas(canvasWidth);

    tempCtx.font = '25px "Noto Sans"';
    const creationDateHeight = tempCtx.measureText(this.votesCountText).actualBoundingBoxAscent;

    const totalHeight = paddingTopBottom + spacingDateText + textHeight + spacingTextSpeedometer + 270 + spacingOptions + optionsHeight + spacingVotesCount + creationDateHeight + paddingTopBottom;

    console.log(`Total calculated height: ${totalHeight}`);

    const { canvas, ctx } = this.createMainCanvas(canvasWidth, totalHeight);

    this.drawHeader(ctx, paddingLeftRight, paddingTopBottom);

    const textY = paddingTopBottom + spacingDateText;
    const actualTextHeight = this.drawText(ctx, this.text, paddingLeftRight, textY, canvasWidth, lineHeight);

    const speedometerY = textY + actualTextHeight + spacingTextSpeedometer;
    const centerX = (canvas.width - 540) / 2 + 540 / 2;
    const grayRectY = this.drawSpeedometerSection(ctx, centerX, speedometerY);

    const optionsY = grayRectY + 320 + spacingOptions;
    this.drawOptions(ctx, optionsCanvas, optionsY);

    const votesCountTextY = optionsY + optionsHeight + spacingVotesCount;
    this.drawFooter(ctx, this.votesCountText, paddingLeftRight, votesCountTextY);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('./image.png', buffer);
    console.timeEnd('Image generation time');
    console.log('The image was created successfully!');
  }
}

let date = 'Опрос от 21.05.2024';
let text = 'В Москве 17 апреля 2024 года произошло убийство, спровоцированное конфликтом из-за парковки. ' +
  'Согласно материалам следствия, инцидент начался после того, как один из подозреваемых оставил свой автомобиль ' +
  'на тротуаре возле подъезда жилого дома, вызвав недовольство местного жителя. Получив замечание, ' +
  'подозреваемый позвонил своим родственникам, которые вскоре прибыли на место. ' +
  'В ходе возникшей ссоры местный житель получил серьезные травмы и позже скончался в больнице.';
let options: Option[] = [
  { text: AnswerOptions.Option1, percentage: 10 },
  { text: AnswerOptions.Option2, percentage: 15 },
  { text: AnswerOptions.Option3, percentage: 20 },
  { text: AnswerOptions.Option4, percentage: 25 },
  { text: AnswerOptions.Option5, percentage: 30 }
];
let percentage = 0.3;
let percentText = 'ПОЧТИ НЕ УДИВИЛО';
let votesCountText = 'Количество голосов: 17';

const generator = new GenerateImage(date, text, percentage, percentText, options, votesCountText);
generator.generateImage();
