import type { jsPDF } from 'jspdf';
import type { TemporalAnswerOption, TemporalDataPoint, TemporalDisplayMode, TemporalReportData } from '../types';

const MARGIN = 12;
const OTHERS_COLOR = '#cbd5e1';

type Rgb = [number, number, number];

const metricValue = (point: TemporalDataPoint, option: TemporalAnswerOption, displayMode: TemporalDisplayMode) => (
  displayMode === 'percentage' ? point.percentages[option.value] : point.values[option.value]
);

const formatMetric = (value: number, displayMode: TemporalDisplayMode) => (
  displayMode === 'percentage' ? `${value.toFixed(1)}%` : value.toLocaleString('pt-BR')
);

const hexToRgb = (hex: string): Rgb => {
  const value = hex.replace('#', '');
  return [0, 2, 4].map(index => Number.parseInt(value.slice(index, index + 2), 16)) as Rgb;
};

const fillColor = (doc: jsPDF, color: string) => doc.setFillColor(...hexToRgb(color));

const textColorFor = (color: Rgb): Rgb => {
  const brightness = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
  return brightness < 155 ? [255, 255, 255] : [15, 23, 42];
};

const drawPageTitle = (doc: jsPDF, title: string, subtitle: string) => {
  const width = doc.internal.pageSize.getWidth();
  doc.setTextColor(5, 50, 97);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, MARGIN, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(doc.splitTextToSize(subtitle, width - MARGIN * 2), MARGIN, 26);
};

export const drawTemporalGroupedBarChart = (
  doc: jsPDF,
  points: TemporalDataPoint[],
  answerOptions: TemporalAnswerOption[],
  displayMode: TemporalDisplayMode,
  startY = 42,
) => {
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  const chartHeight = 96;
  const chartTop = startY;
  const chartBottom = chartTop + chartHeight;
  const maxValue = Math.max(1, ...points.flatMap(point => answerOptions.map(option => metricValue(point, option, displayMode))));
  const axisX = MARGIN + 22;
  const axisWidth = width - 22;
  const usableGroupWidth = axisWidth / Math.max(points.length, 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  for (let tick = 0; tick <= 4; tick += 1) {
    const value = maxValue * (tick / 4);
    const y = chartBottom - (chartHeight * tick) / 4;
    doc.setDrawColor(225, 230, 235);
    doc.line(axisX, y, MARGIN + width, y);
    doc.setTextColor(100, 110, 120);
    doc.text(formatMetric(value, displayMode), MARGIN, y + 2, { align: 'left' });
  }

  points.forEach((point, pointIndex) => {
    const groupX = axisX + pointIndex * usableGroupWidth;
    const barAreaWidth = Math.min(usableGroupWidth * 0.82, 34);
    const barWidth = Math.max(2, barAreaWidth / Math.max(answerOptions.length, 1) - 1);
    const barsX = groupX + (usableGroupWidth - barAreaWidth) / 2;
    answerOptions.forEach((option, optionIndex) => {
      const value = metricValue(point, option, displayMode);
      const height = (value / maxValue) * chartHeight;
      const x = barsX + optionIndex * (barWidth + 1);
      const y = chartBottom - height;
      fillColor(doc, option.aggregated ? OTHERS_COLOR : option.color);
      if (height > 0) doc.rect(x, y, barWidth, height, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(70, 70, 70);
      doc.text(formatMetric(value, displayMode), x + barWidth / 2, Math.max(chartTop + 4, y - 2), { align: 'center' });
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(75, 85, 95);
    const label = doc.splitTextToSize(point.label, Math.max(usableGroupWidth - 2, 12)).slice(0, 2);
    doc.text(label, groupX + usableGroupWidth / 2, chartBottom + 7, { align: 'center' });
  });

  doc.setDrawColor(130, 140, 150);
  doc.line(axisX, chartTop, axisX, chartBottom);
  doc.line(axisX, chartBottom, MARGIN + width, chartBottom);
  let legendX = MARGIN + 22;
  const legendY = chartBottom + 21;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  answerOptions.forEach(option => {
    const labelWidth = doc.getTextWidth(option.label) + 11;
    if (legendX + labelWidth > MARGIN + width) return;
    fillColor(doc, option.aggregated ? OTHERS_COLOR : option.color);
    doc.rect(legendX, legendY - 4, 4, 4, 'F');
    doc.setTextColor(70, 70, 70);
    doc.text(option.label, legendX + 6, legendY);
    legendX += labelWidth + 5;
  });
};

export const drawTemporalHeatmap = (
  doc: jsPDF,
  points: TemporalDataPoint[],
  answerOptions: TemporalAnswerOption[],
  displayMode: TemporalDisplayMode,
  startY = 42,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const labelWidth = 58;
  const cellWidth = (pageWidth - MARGIN * 2 - labelWidth) / Math.max(points.length, 1);
  const headerHeight = 18;
  const rowHeight = 18;
  const maxValue = Math.max(1, ...points.flatMap(point => answerOptions.map(option => metricValue(point, option, displayMode))));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(70, 70, 70);
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, startY, labelWidth, headerHeight, 'F');
  doc.text('Resultado', MARGIN + 3, startY + 11);
  points.forEach((point, index) => {
    const x = MARGIN + labelWidth + index * cellWidth;
    doc.setFillColor(241, 245, 249);
    doc.rect(x, startY, cellWidth, headerHeight, 'F');
    const label = doc.splitTextToSize(point.label, cellWidth - 3).slice(0, 2);
    doc.text(label, x + cellWidth / 2, startY + 7, { align: 'center' });
  });

  answerOptions.forEach((option, optionIndex) => {
    const y = startY + headerHeight + optionIndex * rowHeight;
    doc.setFillColor(248, 250, 252);
    doc.rect(MARGIN, y, labelWidth, rowHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(45, 55, 65);
    doc.text(doc.splitTextToSize(option.label, labelWidth - 5).slice(0, 2), MARGIN + 3, y + 8);
    points.forEach((point, pointIndex) => {
      const value = metricValue(point, option, displayMode);
      const intensity = value / maxValue;
      const base = hexToRgb(option.aggregated ? OTHERS_COLOR : option.color);
      const mix = 0.08 + intensity * 0.92;
      const color = base.map(channel => Math.round(255 + (channel - 255) * mix)) as Rgb;
      const x = MARGIN + labelWidth + pointIndex * cellWidth;
      doc.setFillColor(...color);
      doc.rect(x, y, cellWidth, rowHeight, 'F');
      doc.setTextColor(...textColorFor(color));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(formatMetric(value, displayMode), x + cellWidth / 2, y + 11, { align: 'center' });
    });
  });

  doc.setDrawColor(210, 215, 220);
  doc.rect(MARGIN, startY, pageWidth - MARGIN * 2, headerHeight + answerOptions.length * rowHeight);
};

export const addTemporalVisualizationPages = (
  doc: jsPDF,
  report: TemporalReportData,
  displayMode: TemporalDisplayMode,
) => {
  const periodChunkSize = 8;
  const chartSubtitle = `Métrica: ${displayMode === 'percentage' ? 'percentual' : 'quantidade'} · Os valores seguem as alternativas visíveis no relatório.`;
  for (let start = 0; start < report.points.length; start += periodChunkSize) {
    const points = report.points.slice(start, start + periodChunkSize);
    doc.addPage();
    drawPageTitle(doc, 'VISUALIZAÇÕES TEMPORAIS · BARRAS AGRUPADAS', chartSubtitle);
    drawTemporalGroupedBarChart(doc, points, report.answerOptions, displayMode);
  }
  for (let start = 0; start < report.points.length; start += periodChunkSize) {
    const points = report.points.slice(start, start + periodChunkSize);
    doc.addPage();
    drawPageTitle(doc, 'VISUALIZAÇÕES TEMPORAIS · MAPA DE CALOR', chartSubtitle);
    drawTemporalHeatmap(doc, points, report.answerOptions, displayMode);
  }
};
