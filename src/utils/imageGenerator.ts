import { createCanvas, registerFont } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

export class GenerateImage {
  constructor() {
    const fontPath = path.join(__dirname, '..', '..', '..', 'assets', 'NotoSans-Regular.ttf');
    registerFont(fontPath, { family: 'Noto Sans' });
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let totalHeight = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
        totalHeight += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
    totalHeight += lineHeight;

    return totalHeight; // Возвращаем полную высоту текста
  }

  drawSpeedometer(ctx, centerX, centerY, percentage) {
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
    ctx.lineWidth = 4; // Толщина линии
    ctx.strokeStyle = '#FFFFFF';
    for (let i = 0; i <= 5; i++) {
      const angle = Math.PI + i * (Math.PI / 5);
      const startX = centerX + (radius - 20) * Math.cos(angle);
      const startY = centerY + (radius - 20) * Math.sin(angle);
      const endX = centerX + (radius - 35) * Math.cos(angle);
      const endY = centerY + (radius - 35) * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Рисование стрелки
    const needleAngle = Math.PI + percentage * Math.PI;
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
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI); // Радиус круга
    ctx.fill();

    // Рисование процента
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '32px "Noto Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(percentage * 100)}%`, centerX, centerY + 48);

    // Рисование текста под процентом
    ctx.fillStyle = '#AAAAAA'; // Светло-серый цвет
    ctx.font = '24px "Noto Sans"';
    ctx.fillText('ПОЧТИ НЕ УДИВИЛО', centerX, centerY + 78);
  }

  drawOptionsOnTempCanvas(options, canvasWidth) {
    const tempCanvas = createCanvas(canvasWidth, 4000);
    const tempCtx = tempCanvas.getContext('2d');
    const barColors = ['#FFF500', '#FFCC00', '#FFA300', '#FF7A00', '#FF0000'];
    const textToPercentageSpace = 100; // Расстояние между текстом варианта и процентом
    const textLineHeight = 25; // Высота строки текста
    const barHeight = 6; // Высота полоски
    const spacingBelowText = -15; // Отступ под текстом
    const spacingOptions = 15; // Расстояние между блоками
    const paddingLeftRight = 20;

    let currentY = 0;

    options.forEach((option, index) => {
      // Рисуем процент
      tempCtx.textAlign = 'right';
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.font = '20px "Noto Sans"';
      tempCtx.fillText(`${option.percentage}%`, canvasWidth - paddingLeftRight, currentY + textLineHeight);

      // Рисуем текст варианта
      tempCtx.textAlign = 'left';
      const textWidth = canvasWidth - paddingLeftRight * 2 - textToPercentageSpace;
      const textY = currentY + textLineHeight;
      const textHeight = this.wrapText(tempCtx, option.text, paddingLeftRight, textY, textWidth, textLineHeight);

      // Рисуем полоску
      const barWidth = (canvasWidth - paddingLeftRight * 2) * (option.percentage / 100);
      tempCtx.fillStyle = barColors[index];
      const barY = textY + textHeight + spacingBelowText;
      tempCtx.fillRect(paddingLeftRight, barY, barWidth, barHeight);

      // Обновляем currentY
      currentY = barY + barHeight + spacingOptions;

      // Рисуем отладочный прямоугольник вокруг каждого блока варианта
      //this.debugDrawRect(tempCtx, paddingLeftRight, textY - textLineHeight, textWidth + textToPercentageSpace, currentY - (textY - textLineHeight), 'red');
    });

    const optionsHeight = currentY;

    // Рисуем отладочный прямоугольник вокруг всего блока вариантов
    //this.debugDrawRect(tempCtx, 0, 0, canvasWidth, optionsHeight, 'blue');

    return { tempCanvas, optionsHeight };
  }

  debugDrawRect(ctx, x, y, width, height, color = 'red') {
    ctx.strokeStyle = color;
    ctx.strokeRect(x, y, width, height);
  }

  async generateImage() {
    console.log('Generating image...');

    const canvasWidth = 723; // Ширина холста
    const paddingLeftRight = 20; // Отступы
    const paddingTopBottom = 40; // Отступы
    const spacingDateText = 30; // Промежуток
    const spacingTextSpeedometer = 30; // Промежуток
    const spacingOptions = 30; // Отступ от серого блока до блока с вариантами

    const options = [
      { text: 'Никак не повлияла', percentage: 10 },
      { text: 'Вызвала кратковременный стресс, но жизнь продолжается без изменений', percentage: 15 },
      { text: 'Вызвала волнение, тревогу и неуверенность, но пока все под контролем', percentage: 20 },
      { text: 'Выбила из колеи, высокий уровень стресса и беспокойства', percentage: 25 },
      { text: 'Полностью лишила душевного равновесия. Ощущение страха и потери веры в будущее', percentage: 30 }
    ];

    const text = 'В Москве 17 апреля 2024 года произошло убийство, спровоцированное конфликтом из-за парковки. ' +
      'Согласно материалам следствия, инцидент начался после того, как один из подозреваемых оставил свой автомобиль ' +
      'на тротуаре возле подъезда жилого дома, вызвав недовольство местного жителя. Получив замечание, ' +
      'подозреваемый позвонил своим родственникам, которые вскоре прибыли на место. ' +
      'В ходе возникшей ссоры местный житель получил серьезные травмы и позже скончался в больнице.';

    const lineHeight = 25; // Интервал

    // Создаем временный холст для расчета высоты текста
    const tempCanvas = createCanvas(canvasWidth, 4000);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#fff';
    tempCtx.font = '20px "Noto Sans"'; // Размер шрифта

    const textHeight = this.wrapText(tempCtx, text, paddingLeftRight, paddingTopBottom, canvasWidth - 2 * paddingLeftRight, lineHeight);

    // Создаем временный холст для вариантов ответов
    const { tempCanvas: optionsCanvas, optionsHeight } = this.drawOptionsOnTempCanvas(options, canvasWidth);

    const totalHeight = paddingTopBottom + spacingDateText + textHeight + spacingTextSpeedometer + 270 + spacingOptions + optionsHeight + paddingTopBottom;

    console.log(`Total calculated height: ${totalHeight}`);

    const canvas = createCanvas(canvasWidth, totalHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000'; // Фон холста черный
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '20px "Noto Sans"'; // Размер шрифта

    ctx.fillText('Опрос от 21.05.2024', paddingLeftRight, paddingTopBottom);

    const textY = paddingTopBottom + spacingDateText;
    this.wrapText(ctx, text, paddingLeftRight, textY, canvas.width - 2 * paddingLeftRight, lineHeight);

    const drawRoundedRect = (ctx, x, y, width, height, radius) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arcTo(x + width, y, x + width, y + radius, radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
      ctx.lineTo(x + radius, y + height);
      ctx.arcTo(x, y + height, x, y + height - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();
      ctx.fillStyle = '#333'; // Светло-серый фон
      ctx.fill();
    };

    const speedometerY = textY + textHeight + spacingTextSpeedometer;
    const centerX = (canvas.width - 540) / 2 + 540 / 2;
    const grayRectX = (canvas.width - 540) / 2;
    const grayRectY = speedometerY;

    drawRoundedRect(ctx, grayRectX, grayRectY, 540, 270, 10);

    const adjustedCenterY = grayRectY + (270 / 1.7);

    this.drawSpeedometer(ctx, centerX, adjustedCenterY, 0.44);

    const optionsY = grayRectY + 270 + spacingOptions;
    ctx.drawImage(optionsCanvas, 0, optionsY);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('./image.png', buffer);
    console.log('The image was created successfully!');
  }
}

// Для запуска
const generator = new GenerateImage();
generator.generateImage();
