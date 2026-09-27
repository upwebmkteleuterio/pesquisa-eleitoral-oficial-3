import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Submission, Survey, Researcher, DemographicOption, ReportMergeCardData, VirtualReportCardData, TemporalReportData, TemporalReportFilters, TemporalRegionalSlice } from '../types';
import type { RankedResearcher } from '../hooks/useRankingData';
import { aggregateQuestionResponses } from './responseNormalization';
import { addTemporalVisualizationPages } from './temporalPdfCharts';
import type { TemporalChartCapture } from './temporalPdfCapture';

export const generateInterviewPDF = (
  submission: Submission,
  survey?: Survey,
  researcher?: Researcher,
  demographicOptions?: DemographicOption[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const getLabel = (category: string, value: string) => {
    if (!value) return "-";
    const option = demographicOptions?.find(o => o.categoria === category && o.valor === value);
    return option ? option.label : value;
  };

  // 1. Cabeçalho Principal
  doc.setFillColor(5, 50, 97); // Azul Veraxus
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('VERAXUS', 15, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('FICHA DE ENTREVISTA INDIVIDUAL', 15, 30);
  
  doc.setFontSize(8);
  doc.text(`Protocolo: ${submission.id.toUpperCase()}`, pageWidth - 15, 25, { align: 'right' });

  // 2. Informações Gerais
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES DA PESQUISA', 15, 55);
  
  autoTable(doc, {
    startY: 60,
    head: [['Campo', 'Informação']],
    body: [
      ['Pesquisa', survey?.nome || 'Não identificada'],
      ['Coletor/Pesquisador', researcher?.nome || 'Sistema'],
      ['Data da Coleta', format(new Date(submission.data_coleta), "dd/MM/yyyy HH:mm", { locale: ptBR })],
      ['Localidade/Bairro', submission.bairro || 'Não informado'],
    ],
    theme: 'striped',
    headStyles: { textColor: [100, 100, 100], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 10, cellPadding: 3 },
  });

  // 3. Dados do Respondente
  const currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.text('DADOS DO RESPONDENTE', 15, currentY);
  
  autoTable(doc, {
    startY: currentY + 5,
    body: [
      ['Nome:', submission.nome_entrevistado || 'Anônimo'],
      ['Telefone:', submission.telefone || '-'],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 30, textColor: [100, 100, 100] } }
  });

  // 4. Perfil Demográfico
  const demoY = (doc as any).lastAutoTable.finalY + 10;
  doc.text('PERFIL DEMOGRÁFICO', 15, demoY);
  
  autoTable(doc, {
    startY: demoY + 5,
    body: [
      ['Sexo', getLabel('sexo', submission.dados_fixos?.sexo), 'Faixa Etária', getLabel('faixa_etaria', submission.dados_fixos?.faixa_etaria)],
      ['Escolaridade', getLabel('escolaridade', submission.dados_fixos?.escolaridade), 'Renda', getLabel('renda', submission.dados_fixos?.renda)],
      ['Religião', getLabel('religiao', submission.dados_fixos?.religiao), 'Est. Civil', getLabel('estado_civil', submission.dados_fixos?.estado_civil)],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 
      0: { fontStyle: 'bold', fillColor: [245, 245, 245] },
      2: { fontStyle: 'bold', fillColor: [245, 245, 245] }
    }
  });

  // 5. Respostas da Pesquisa
  const questionsY = (doc as any).lastAutoTable.finalY + 15;
  doc.text('RESPOSTAS COLETADAS', 15, questionsY);
  
  const questionRows = survey?.schema_dinamico?.questions.map((q: any) => {
    const value = submission.respostas_dinamicas[q.id];
    return [
      q.label,
      Array.isArray(value) ? value.join(", ") : (value?.toString() || "-")
    ];
  }) || [];

  autoTable(doc, {
    startY: questionsY + 5,
    head: [['Pergunta', 'Resposta']],
    body: questionRows,
    theme: 'grid',
    headStyles: { fillColor: [5, 50, 97], textColor: [255, 255, 255] },
    styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' } }
  });

  // Footer
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")} - Veraxus Sistema de Pesquisas - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const fileName = `ficha_${submission.nome_entrevistado?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'anonimo'}_${submission.id.slice(0,8)}.pdf`;
  doc.save(fileName);
};

interface LoadedResearcherAvatar {
  dataUrl: string;
  width: number;
  height: number;
}

const loadResearcherAvatarData = (source: string): Promise<LoadedResearcherAvatar> => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    if (!image.naturalWidth || !image.naturalHeight) {
      reject(new Error('A foto do pesquisador não possui dimensões válidas.'));
      return;
    }
    const maxDimension = 256;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('Não foi possível preparar a foto do pesquisador.'));
      return;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    try {
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height });
    } catch {
      reject(new Error('Não foi possível converter a foto do pesquisador.'));
    }
  };
  image.onerror = () => reject(new Error('Não foi possível carregar a foto do pesquisador.'));
  image.src = source;
});

const loadResearcherAvatar = (source: string): Promise<string> => (
  loadResearcherAvatarData(source).then(avatar => avatar.dataUrl)
);

export const generateResearchersPDF = async (researchers: Researcher[]): Promise<void> => {
  const avatarEntries = await Promise.all(
    researchers.map(async researcher => {
      if (!researcher.foto_avatar_url) return [researcher.id, null] as const;
      try {
        return [researcher.id, await loadResearcherAvatar(researcher.foto_avatar_url)] as const;
      } catch {
        return [researcher.id, null] as const;
      }
    })
  );
  const avatars = new Map(avatarEntries);
  const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(5, 50, 97);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LISTA DE PESQUISADORES', 15, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Pesquisadores exibidos: ${researchers.length}`, 15, 23);

  doc.setTextColor(0, 0, 0);
  autoTable(doc, {
    startY: 40,
    head: [['Pesquisador', 'E-mail de contato', 'CPF']],
    body: researchers.map(researcher => [researcher.nome, researcher.email, researcher.cpf]),
    theme: 'grid',
    margin: { top: 36, bottom: 18, left: 15, right: 15 },
    showHead: 'everyPage',
    headStyles: { fillColor: [5, 50, 97], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3, minCellHeight: 16, overflow: 'linebreak', valign: 'middle' },
    columnStyles: { 0: { cellWidth: 85, cellPadding: { top: 3, right: 3, bottom: 3, left: 16 } }, 1: { cellWidth: 60 }, 2: { cellWidth: 32 } },
    didDrawCell: data => {
      if (data.section !== 'body' || data.column.index !== 0) return;
      const researcher = researchers[data.row.index];
      const avatar = researcher ? avatars.get(researcher.id) : null;
      if (!avatar) return;
      doc.addImage(avatar, 'JPEG', data.cell.x + 3, data.cell.y + (data.cell.height - 10) / 2, 10, 10);
    },
  });

  if (researchers.length === 0) {
    doc.setTextColor(110, 110, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nenhum pesquisador encontrado para os filtros atuais.', pageWidth / 2, 58, { align: 'center' });
  }

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setTextColor(110, 110, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })} - Página ${page} de ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  doc.save(`pesquisadores_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const generateRankingPDF = async (survey: Survey, ranking: RankedResearcher[]): Promise<void> => {
  const avatarEntries = await Promise.all(
    ranking.map(async researcher => {
      if (!researcher.foto_avatar_url) return [researcher.id, null] as const;
      try {
        return [researcher.id, await loadResearcherAvatarData(researcher.foto_avatar_url)] as const;
      } catch {
        return [researcher.id, null] as const;
      }
    })
  );
  const avatars = new Map(avatarEntries);
  const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedAt = new Date();
  const dateLabel = format(generatedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  const maxCount = Math.max(...ranking.map(researcher => researcher.collectionCount), 1);
  const rowHeight = 31;
  const marginX = 15;

  const drawPageHeader = (continuation: boolean) => {
    doc.setFillColor(5, 50, 97);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const surveyLines = doc.splitTextToSize(survey.nome || 'Pesquisa sem nome', pageWidth - 76).slice(0, 2);
    doc.text(surveyLines, marginX, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('RANKING DE PRODUTIVIDADE', marginX, 38);
    doc.text(continuation ? 'Continuação' : `Gerado em ${dateLabel}`, pageWidth - marginX, 13, { align: 'right' });
    doc.text(`${ranking.length} participante${ranking.length === 1 ? '' : 's'}`, pageWidth - marginX, 23, { align: 'right' });
    return 53;
  };

  const positionColor = (position: number): [number, number, number] => {
    if (position === 1) return [234, 179, 8];
    if (position === 2) return [148, 163, 184];
    if (position === 3) return [217, 119, 6];
    return [0, 182, 122];
  };

  const drawAvatar = (avatar: LoadedResearcherAvatar | null, x: number, y: number) => {
    doc.setFillColor(230, 248, 242);
    doc.roundedRect(x, y, 18, 18, 3, 3, 'F');
    if (!avatar) return;
    const scale = Math.min(18 / avatar.width, 18 / avatar.height);
    const width = avatar.width * scale;
    const height = avatar.height * scale;
    doc.addImage(avatar.dataUrl, 'JPEG', x + (18 - width) / 2, y + (18 - height) / 2, width, height);
  };

  const drawPositionBadge = (position: number, x: number, y: number) => {
    const color = positionColor(position);
    doc.setFillColor(...color);
    doc.circle(x, y, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(position > 9 ? 8 : 10);
    doc.text(String(position), x, y + 1.5, { align: 'center' });
    if (position <= 3) {
      doc.setDrawColor(...color);
      doc.setLineWidth(0.8);
      doc.circle(x, y, 8.5, 'S');
    }
  };

  let currentY = drawPageHeader(false);
  ranking.forEach((researcher, index) => {
    const position = index + 1;
    if (currentY + rowHeight > pageHeight - 20) {
      doc.addPage();
      currentY = drawPageHeader(true);
    }

    const color = positionColor(position);
    const rowTop = currentY;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.roundedRect(marginX, rowTop, pageWidth - marginX * 2, rowHeight - 3, 3, 3, 'FD');
    drawPositionBadge(position, 25, rowTop + 12);
    drawAvatar(avatars.get(researcher.id) || null, 38, rowTop + 3);

    const contentX = 61;
    const contentWidth = 103;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const nameLines = doc.splitTextToSize(researcher.nome || 'Sem nome', contentWidth).slice(0, 1);
    doc.text(nameLines, contentX, rowTop + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const contact = `${researcher.email || '-'}  •  CPF: ${researcher.cpf || '-'}`;
    doc.text(doc.splitTextToSize(contact, contentWidth).slice(0, 1), contentX, rowTop + 14);

    const progressWidth = 103;
    const progress = Math.min(1, researcher.collectionCount / maxCount);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(contentX, rowTop + 21, progressWidth, 3.5, 1.75, 1.75, 'F');
    doc.setFillColor(...color);
    doc.roundedRect(contentX, rowTop + 21, progressWidth * progress, 3.5, 1.75, 1.75, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text(String(researcher.collectionCount), pageWidth - 18, rowTop + 12, { align: 'right' });
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text('COLETAS', pageWidth - 18, rowTop + 18, { align: 'right' });
    currentY += rowHeight;
  });

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Veraxus - ${dateLabel}`, marginX, pageHeight - 7);
    doc.text(`Página ${page} de ${pageCount}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
  }

  const safeName = (survey.nome || 'pesquisa')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'pesquisa';
  doc.save(`ranking_${safeName}_${format(generatedAt, 'yyyy-MM-dd')}.pdf`);
};

const REPORT_LABELS: Record<string, Record<string, string>> = {
  sexo: { masculino: 'Masculino', feminino: 'Feminino', outro: 'Outro' },
  faixa_etaria: { '16-24': '16-24 anos', '25-34': '25-34 anos', '35-44': '35-44 anos', '45-59': '45-59 anos', '60+': '60+ anos' },
  renda: { ate_1sm: 'Até 1 SM', '1_2sm': '1-2 SM', '2_5sm': '2-5 SM', '5_10sm': '5-10 SM', mais_10sm: '+10 SM', sem_renda: 'S/ Renda' },
  escolaridade: { analfabeto: 'Analfabeto', fund_incomp: 'Fund. Inc', fund_comp: 'Fund. Comp', medio_incomp: 'Médio Inc', medio_comp: 'Médio Comp', superior_incomp: 'Sup. Inc', superior_comp: 'Sup. Comp' },
  religiao: { catolico: 'Católico', evangelico: 'Evangélico', espirita: 'Espírita', umbanda_candomble: 'Afro', outra: 'Outras', sem_religiao: 'Sem Religião' },
  estado_civil: { solteiro: 'Solteiro', casado: 'Casado', divorciado: 'Divorciado', viuvo: 'Viúvo', uniao_estavel: 'U. Estável' }
};

const reportValueToText = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(reportValueToText).filter(text => text !== '-').join(', ') || '-';
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' && !value.trim()) return '-';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const reportPercentage = (count: number, total: number): string => (
  `${total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'}%`
);

const formatChartTitle = (title: string): string => {
  const trimmed = title.trim();
  if (!trimmed) return '.';
  const capitalized = trimmed.charAt(0).toLocaleUpperCase('pt-BR') + trimmed.slice(1);
  return capitalized.endsWith('.') ? capitalized : `${capitalized}.`;
};

const DEMOGRAPHIC_TITLES: Record<string, string> = {
  sexo: 'Sexo',
  faixa_etaria: 'Faixa Etária',
  renda: 'Renda',
  escolaridade: 'Escolaridade',
  religiao: 'Religião',
  estado_civil: 'Estado Civil',
};

const loadReportCover = (path = '/assets/veraxus-pesquisas-capa.jpeg'): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Não foi possível carregar a capa do relatório.'));
  image.src = path;
});

const addReportCover = (doc: jsPDF, image: HTMLImageElement, imageFormat: 'JPEG' | 'PNG' = 'JPEG') => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const pageRatio = pageWidth / pageHeight;
  const imageWidth = imageRatio > pageRatio ? pageWidth : pageHeight * imageRatio;
  const imageHeight = imageRatio > pageRatio ? pageWidth / imageRatio : pageHeight;
  doc.addImage(image, imageFormat, (pageWidth - imageWidth) / 2, (pageHeight - imageHeight) / 2, imageWidth, imageHeight);
};

export const generateReportPDF = async (survey: Survey, submissions: Submission[]) => {
  const cover = await loadReportCover();
  const validSubmissions = submissions.filter(submission => submission.valida !== false);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  addReportCover(doc, cover);
  doc.addPage();
  const total = validSubmissions.length;
  const questions = [...(survey.schema_dinamico?.questions || [])];
  const questionIds = new Set(questions.map((question: any) => question.id));

  validSubmissions.forEach(submission => {
    Object.keys(submission.respostas_dinamicas || {}).forEach(id => {
      if (!questionIds.has(id)) {
        questions.push({ id, label: id });
        questionIds.add(id);
      }
    });
  });

  const addSectionTitle = (title: string, currentY: number): number => {
    doc.setTextColor(5, 50, 97);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleLines = doc.splitTextToSize(title, pageWidth - 30);
    if (currentY + titleLines.length * 5 > pageHeight - 45) {
      doc.addPage();
      currentY = 24;
    }
    doc.text(titleLines, 15, currentY);
    return currentY + titleLines.length * 5;
  };

  const addDistributionTable = (startY: number, rows: string[][]): number => {
    autoTable(doc, {
      startY,
      head: [['Resposta', 'Quantidade', 'Percentual']],
      body: rows,
      theme: 'grid',
      showHead: 'everyPage',
      margin: { top: 20, bottom: 18, left: 15, right: 15 },
      headStyles: { fillColor: [5, 50, 97], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', valign: 'top' },
      columnStyles: { 0: { cellWidth: 105 }, 1: { cellWidth: 28, halign: 'right' }, 2: { cellWidth: 32, halign: 'right' } }
    });
    return ((doc as any).lastAutoTable?.finalY || startY) + 8;
  };

  const addHorizontalBarChart = (
    title: string,
    entries: Array<{ name: string; value: number }>,
    startY: number,
  ): number => {
    const visibleEntries = [...entries].slice(0, 10);
    const omittedCount = Math.max(entries.length - visibleEntries.length, 0);
    const chartTitle = doc.splitTextToSize(formatChartTitle(title), pageWidth - 30);
    const rowHeight = 10;
    const chartHeight = chartTitle.length * 4 + 25 + visibleEntries.length * rowHeight + (omittedCount > 0 ? 8 : 0);
    if (startY + chartHeight > pageHeight - 20) {
      doc.addPage();
      startY = 24;
    }

    doc.setTextColor(5, 50, 97);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(chartTitle, 15, startY);

    const chartTop = startY + chartTitle.length * 4 + 3;
    const labelWidth = 48;
    const barX = 15 + labelWidth;
    const valueX = pageWidth - 15;
    const barWidth = valueX - barX - 28;
    const maxValue = Math.max(...visibleEntries.map(entry => entry.value), 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    visibleEntries.forEach((entry, index) => {
      const y = chartTop + index * rowHeight;
      const label = doc.splitTextToSize(entry.name, labelWidth - 3)[0] || '-';
      const barLength = (entry.value / maxValue) * barWidth;
      doc.setTextColor(70, 70, 70);
      doc.text(label, 15, y + 5);
      doc.setFillColor(235, 239, 243);
      doc.rect(barX, y, barWidth, 6, 'F');
      doc.setFillColor(16, 185, 129);
      if (barLength > 0) doc.rect(barX, y, barLength, 6, 'F');
      doc.setTextColor(70, 70, 70);
      doc.text(`${entry.value} (${reportPercentage(entry.value, total)})`, valueX, y + 5, { align: 'right' });
    });

    if (omittedCount > 0) {
      const omittedY = chartTop + visibleEntries.length * rowHeight + 3;
      doc.setTextColor(110, 110, 110);
      doc.setFontSize(7);
      doc.text(`Exibindo ${visibleEntries.length} de ${entries.length} opções; ${omittedCount} não exibidas no gráfico.`, 15, omittedY);
      return omittedY + 8;
    }
    return chartTop + visibleEntries.length * rowHeight + 5;
  };

  doc.setFillColor(5, 50, 97);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RELATÓRIO DE PESQUISA', 15, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(reportValueToText(survey.nome), 15, 23);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('RESUMO', 15, 43);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total de respostas: ${total}`, 15, 51);

  let currentY = 65;
  currentY = addSectionTitle('PERFIL DEMOGRÁFICO', currentY);
  const demographicRows: string[][] = [];
  const demographicCharts: Array<{ title: string; entries: Array<{ name: string; value: number }> }> = [];
  ['sexo', 'faixa_etaria', 'renda', 'escolaridade', 'religiao', 'estado_civil'].forEach(category => {
    const counts: Record<string, number> = {};
    validSubmissions.forEach(submission => {
      const value = reportValueToText(submission.dados_fixos?.[category]);
      if (value !== '-') counts[value] = (counts[value] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (entries.length === 0) {
      demographicRows.push([category.replace('_', ' '), '0', '0.0%']);
      demographicCharts.push({ title: DEMOGRAPHIC_TITLES[category] || category, entries: [{ name: 'Sem respostas', value: 0 }] });
      return;
    }
    const sortedEntries = [...entries].sort((a, b) => b[1] - a[1]);
    demographicCharts.push({
      title: DEMOGRAPHIC_TITLES[category] || category,
      entries: sortedEntries.map(([value, count]) => ({
        name: REPORT_LABELS[category]?.[value] || value,
        value: count,
      })),
    });
    sortedEntries.forEach(([value, count]) => {
      demographicRows.push([`${DEMOGRAPHIC_TITLES[category] || category}: ${REPORT_LABELS[category]?.[value] || value}`, String(count), reportPercentage(count, total)]);
    });
  });
  currentY = addDistributionTable(currentY, demographicRows);
  demographicCharts.forEach(chart => {
    currentY = addHorizontalBarChart(chart.title, chart.entries, currentY);
  });

  currentY = addSectionTitle('PERGUNTAS DINÂMICAS', currentY);
  for (const question of questions) {
    const label = reportValueToText(question.label || question.id);
    currentY = addSectionTitle(label, currentY);
    const configuredOptions = Array.isArray(question.options) ? question.options : [];
    const answers = validSubmissions.map(submission => submission.respostas_dinamicas?.[question.id]);
    const entries = aggregateQuestionResponses(label, answers, configuredOptions);
    const rows = entries.length > 0
      ? entries.map(({ name, value }) => [name, String(value), reportPercentage(value, total)])
      : [['Sem respostas', '0', '0.0%']];
    currentY = addDistributionTable(currentY, rows);
    currentY = addHorizontalBarChart(
      label,
      entries.length > 0 ? entries : [{ name: 'Sem respostas', value: 0 }],
      currentY,
    );
  }

  const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let page = 2; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setDrawColor(210, 210, 210);
    doc.line(15, page === 2 ? 31 : 16, pageWidth - 15, page === 2 ? 31 : 16);
    if (page > 2) {
      doc.setTextColor(110, 110, 110);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Veraxus - ${reportValueToText(survey.nome)}`, 15, 11);
    }
    doc.setTextColor(110, 110, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Gerado em ${generatedAt} - Página ${page} de ${pageCount}`, pageWidth - 15, pageHeight - 9, { align: 'right' });
  }

  const fileName = `relatorio_${reportValueToText(survey.nome).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase() || 'pesquisa'}.pdf`;
  doc.save(fileName);
};

export const generateVirtualReportPDF = async (
  surveys: Survey[],
  submissions: Submission[],
  cards: VirtualReportCardData[],
) => {
  if (surveys.length === 0 || cards.length === 0) return;
  const cover = await loadReportCover();
  const validSubmissions = submissions.filter(submission => submission.valida !== false);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  addReportCover(doc, cover);
  doc.addPage();
  const title = surveys.map(survey => survey.nome).join(' + ');
  const addTitle = (value: string, y: number) => {
    const lines = doc.splitTextToSize(value, pageWidth - margin * 2);
    if (y + lines.length * 5 > pageHeight - 30) {
      doc.addPage();
      y = 24;
    }
    doc.setTextColor(5, 50, 97);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(lines, margin, y);
    return y + lines.length * 5;
  };
  const addDistribution = (y: number, rows: string[][]) => {
    if (y > pageHeight - 45) {
      doc.addPage();
      y = 24;
    }
    autoTable(doc, {
      startY: y,
      head: [['Resposta', 'Quantidade', 'Percentual']],
      body: rows,
      theme: 'grid',
      showHead: 'everyPage',
      margin: { top: 20, bottom: 18, left: margin, right: margin },
      headStyles: { fillColor: [5, 50, 97], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', valign: 'top' },
      columnStyles: { 0: { cellWidth: 112 }, 1: { cellWidth: 28, halign: 'right' }, 2: { cellWidth: 30, halign: 'right' } },
    });
    return ((doc as any).lastAutoTable?.finalY || y) + 8;
  };

  doc.setFillColor(5, 50, 97);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('RELATÓRIO VIRTUAL CONSOLIDADO', margin, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(reportValueToText(title), pageWidth - margin * 2), margin, 23);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('RESUMO', margin, 43);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Pesquisas: ${surveys.length} · Total de respostas: ${validSubmissions.length}`, margin, 51);

  let currentY = 65;
  currentY = addTitle('PERFIL DEMOGRÁFICO CONSOLIDADO', currentY);
  const categories = ['sexo', 'faixa_etaria', 'renda', 'escolaridade', 'religiao', 'estado_civil'];
  const demographicRows: string[][] = [];
  categories.forEach(category => {
    const counts = new Map<string, number>();
    validSubmissions.forEach(submission => {
      const value = reportValueToText(submission.dados_fixos?.[category]);
      if (value !== '-') {
        const label = REPORT_LABELS[category]?.[value] || value;
        counts.set(label, (counts.get(label) || 0) + 1);
      }
    });
    if (counts.size === 0) {
      demographicRows.push([`${DEMOGRAPHIC_TITLES[category] || category}: Sem respostas`, '0', '0.0%']);
    } else {
      Array.from(counts.entries()).sort((left, right) => right[1] - left[1]).forEach(([label, count]) => {
        demographicRows.push([`${DEMOGRAPHIC_TITLES[category] || category}: ${label}`, String(count), reportPercentage(count, validSubmissions.length)]);
      });
    }
  });
  currentY = addDistribution(currentY, demographicRows);

  currentY = addTitle('PERGUNTAS/CARDS VIRTUAIS', currentY);
  cards.forEach(card => {
    currentY = addTitle(`${card.questionLabels.join(' + ')} (${card.surveyNames.join(' · ')})`, currentY);
    const rows = card.answers.length > 0
      ? card.answers.map(answer => [answer.label, String(answer.total), `${answer.percentage.toFixed(1)}%`])
      : [['Sem respostas', '0', '0.0%']];
    currentY = addDistribution(currentY, rows);
  });

  const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let page = 2; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setTextColor(110, 110, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (page > 2) {
      doc.text(`Veraxus - ${reportValueToText(title)}`, margin, 11);
    }
    doc.text(`Gerado em ${generatedAt} - Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }
  const fileName = `relatorio_virtual_${reportValueToText(title).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase() || 'pesquisas'}.pdf`;
  doc.save(fileName);
};

export const generateReportMergesPDF = (survey: Survey, cards: ReportMergeCardData[]) => {
  if (cards.length === 0) return;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  doc.setFillColor(5, 50, 97);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('MESCLAGENS DEMOGRÁFICAS', margin, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(reportValueToText(survey.nome), margin, 23);

  let currentY = 44;
  cards.forEach(card => {
    const title = `${card.demographicLabel} - ${card.questionLabel}`;
    if (currentY > pageHeight - 55) {
      doc.addPage();
      currentY = 24;
    }
    doc.setTextColor(5, 50, 97);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(title, pageWidth - margin * 2), margin, currentY);
    currentY += 6;
    const rows = card.answers.length > 0
      ? card.answers.map(answer => [
        answer.label,
        String(answer.total),
        `${answer.percentage.toFixed(1)}%`,
        answer.breakdown.map(item => `${item.label}: ${item.total} (${item.percentage.toFixed(1)}%)`).join('\n') || 'Não informado',
      ])
      : [['Sem respostas', '0', '0.0%', 'Não informado']];
    autoTable(doc, {
      startY: currentY,
      head: [['Resposta', 'Total', '% geral', `Breakdown por ${card.demographicLabel}`]],
      body: rows,
      theme: 'grid',
      margin: { top: 20, bottom: 18, left: margin, right: margin },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', valign: 'top' },
      columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 18, halign: 'right' }, 2: { cellWidth: 20, halign: 'right' }, 3: { cellWidth: pageWidth - margin * 2 - 80 } },
      showHead: 'everyPage',
    });
    currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 10;
  });

  const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setTextColor(110, 110, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Gerado em ${generatedAt} - Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }
  const fileName = `mesclagens_${reportValueToText(survey.nome).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase() || 'pesquisa'}.pdf`;
  doc.save(fileName);
};

export const generateResponsesPDF = (
  survey: Survey,
  submissions: Submission[],
  members: Researcher[] = [],
  selectedMemberId = "todos",
  demographicOptions: DemographicOption[] = [],
) => {
  const validSubmissions = (Array.isArray(submissions) ? submissions : [])
    .filter(submission => submission && submission.valida !== false)
    .filter(submission => selectedMemberId === "todos" || getSubmissionMemberId(submission) === selectedMemberId)
    .sort((a, b) => {
      const dateDifference = new Date(b.data_coleta).getTime() - new Date(a.data_coleta).getTime();
      return dateDifference || a.id.localeCompare(b.id);
    });
  if (validSubmissions.length === 0) return;

  const memberNames = new Map(members.map(member => [member.id, member.nome]));
  const groups = new Map<string, Submission[]>();
  validSubmissions.forEach(submission => {
    const memberId = getSubmissionMemberId(submission);
    const group = groups.get(memberId) || [];
    group.push(submission);
    groups.set(memberId, group);
  });

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const usableWidth = pageWidth - margin * 2;
  const questions = [...(survey.schema_dinamico?.questions || [])];
  const questionIds = new Set(questions.map((question: any) => question.id));
  validSubmissions.forEach(submission => {
    Object.keys(submission.respostas_dinamicas || {}).forEach(id => {
      if (!questionIds.has(id)) {
        questions.push({ id, label: id });
        questionIds.add(id);
      }
    });
  });

  const getLabel = (category: string, value: unknown) => {
    const text = reportValueToText(value);
    const option = demographicOptions.find(item => item.categoria === category && item.valor === text);
    return option?.label || text;
  };
  const groupName = (memberId: string) => memberNames.get(memberId) || (memberId === "sistema" ? "Sistema/Link direto" : memberId);
  const ensureSpace = (y: number, height: number) => {
    if (y + height > pageHeight - 22) {
      doc.addPage();
      return 25;
    }
    return y;
  };
  const tableEnd = () => ((doc as any).lastAutoTable?.finalY || 25) + 8;

  doc.setFont("helvetica", "normal");
  let currentY = 27;
  groups.forEach((groupSubmissions, memberId) => {
    currentY = ensureSpace(currentY, 18);
    doc.setTextColor(5, 50, 97);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(`MEMBRO/PESQUISADOR: ${groupName(memberId)}`, margin, currentY);
    currentY += 8;

    groupSubmissions.forEach((submission, index) => {
      currentY = ensureSpace(currentY, 18);
      doc.setTextColor(45, 45, 45);
      doc.setFontSize(11);
      doc.text(`Resposta ${index + 1} - ${reportValueToText(submission.nome_entrevistado) === "-" ? "Anônimo" : reportValueToText(submission.nome_entrevistado)}`, margin, currentY);
      currentY += 3;

      autoTable(doc, {
        startY: currentY,
        head: [["Campo da resposta", "Informação"]],
        body: [
          ["Pesquisa", reportValueToText(survey.nome)],
          ["Entrevistado", reportValueToText(submission.nome_entrevistado)],
          ["Telefone", reportValueToText(submission.telefone)],
          ["Bairro", reportValueToText(submission.bairro)],
          ["Data da coleta", format(new Date(submission.data_coleta), "dd/MM/yyyy HH:mm", { locale: ptBR })],
          ["Origem", submission.origem === "web" ? "Web" : "Aplicativo"],
          ["Sexo", getLabel("sexo", submission.dados_fixos?.sexo)],
          ["Faixa etária", getLabel("faixa_etaria", submission.dados_fixos?.faixa_etaria)],
          ["Escolaridade", getLabel("escolaridade", submission.dados_fixos?.escolaridade)],
          ["Renda", getLabel("renda", submission.dados_fixos?.renda)],
          ["Religião", getLabel("religiao", submission.dados_fixos?.religiao)],
          ["Estado civil", getLabel("estado_civil", submission.dados_fixos?.estado_civil)],
        ],
        theme: "striped",
        margin: { top: 20, bottom: 18, left: margin, right: margin },
        headStyles: { fillColor: [5, 50, 97], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 8.5, cellPadding: 2.5, overflow: "linebreak", valign: "top" },
        columnStyles: { 0: { cellWidth: 52, fontStyle: "bold" }, 1: { cellWidth: usableWidth - 52 } },
        showHead: "everyPage",
      });
      currentY = tableEnd();

      const dynamicRows = questions.map((question: any) => [
        reportValueToText(question.label || question.id),
        reportValueToText(submission.respostas_dinamicas?.[question.id]),
      ]);
      currentY = ensureSpace(currentY, 18);
      doc.setTextColor(5, 50, 97);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Perguntas dinâmicas", margin, currentY);
      currentY += 3;
      autoTable(doc, {
        startY: currentY,
        head: [["Pergunta", "Resposta"]],
        body: dynamicRows.length ? dynamicRows : [["-", "-"]],
        theme: "grid",
        margin: { top: 20, bottom: 18, left: margin, right: margin },
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 8.5, cellPadding: 3, overflow: "linebreak", valign: "top" },
        columnStyles: { 0: { cellWidth: 72, fontStyle: "bold" }, 1: { cellWidth: usableWidth - 72 } },
        showHead: "everyPage",
      });
      currentY = tableEnd() + 4;
    });
  });

  const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFillColor(5, 50, 97);
    doc.rect(0, 0, pageWidth, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("VERAXUS - RESPOSTAS DA PESQUISA", margin, 9);
    doc.setFont("helvetica", "normal");
    doc.text(reportValueToText(survey.nome), pageWidth - margin, 9, { align: "right" });
    doc.setDrawColor(210, 210, 210);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setTextColor(110, 110, 110);
    doc.setFontSize(8);
    doc.text(`Gerado em ${generatedAt} - Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  const fileName = `respostas_${reportValueToText(survey.nome).replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase() || "pesquisa"}.pdf`;
  doc.save(fileName);
};

export const generateRespondentsPDF = (
  survey: Survey,
  submissions: Submission[],
  selectedMemberId = "todos",
) => {
  const validSubmissions = (Array.isArray(submissions) ? submissions : [])
    .filter(submission => submission && submission.valida !== false)
    .filter(submission => selectedMemberId === "todos" || getSubmissionMemberId(submission) === selectedMemberId)
    .sort((a, b) => {
      const dateDifference = new Date(b.data_coleta).getTime() - new Date(a.data_coleta).getTime();
      return dateDifference || a.id.localeCompare(b.id);
    });
  if (validSubmissions.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

  doc.setFillColor(5, 50, 97);
  doc.rect(0, 0, pageWidth, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("VERAXUS - DADOS DOS RESPONDENTES", margin, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(reportValueToText(survey.nome), margin, 18);

  autoTable(doc, {
    startY: 34,
    head: [["Nome", "Telefone", "Bairro"]],
    body: validSubmissions.map(submission => [
      reportValueToText(submission.nome_entrevistado),
      reportValueToText(submission.telefone),
      reportValueToText(submission.bairro),
    ]),
    theme: "grid",
    margin: { top: 30, bottom: 20, left: margin, right: margin },
    showHead: "everyPage",
    headStyles: { fillColor: [5, 50, 97], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak", valign: "top" },
    columnStyles: { 0: { cellWidth: 72 }, 1: { cellWidth: 42 }, 2: { cellWidth: pageWidth - margin * 2 - 114 } },
  });

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setDrawColor(210, 210, 210);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setTextColor(110, 110, 110);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Gerado em ${generatedAt} - Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  const fileName = `dados_respondentes_${reportValueToText(survey.nome).replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase() || "pesquisa"}.pdf`;
  doc.save(fileName);
};

const getSubmissionMemberId = (submission: Submission): string => {
  const memberId = submission.origem === "web" ? submission.referenciado_por : submission.pesquisador_id;
  return memberId || "sistema";
};

interface TemporalPdfCellBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

type TemporalPdfVariation = { direction: 'up' | 'down' | 'stable'; value: number };

const drawTemporalVariation = (doc: jsPDF, cell: TemporalPdfCellBounds, variation: TemporalPdfVariation) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  if (variation.direction === 'stable') {
    doc.setTextColor(120, 120, 120);
    doc.text('-', cell.x + cell.width / 2, cell.y + cell.height - 3, { align: 'center' });
    return;
  }

  const color: [number, number, number] = variation.direction === 'up' ? [5, 150, 105] : [225, 29, 72];
  const arrowX = cell.x + cell.width / 2 - 8;
  const arrowBottom = cell.y + cell.height - 4;
  const arrowTop = arrowBottom - 5;
  doc.setDrawColor(...color);
  doc.setTextColor(...color);
  doc.setLineWidth(0.6);
  if (variation.direction === 'up') {
    doc.line(arrowX, arrowBottom, arrowX, arrowTop);
    doc.line(arrowX, arrowTop, arrowX - 2, arrowTop + 2);
    doc.line(arrowX, arrowTop, arrowX + 2, arrowTop + 2);
  } else {
    doc.line(arrowX, arrowTop, arrowX, arrowBottom);
    doc.line(arrowX, arrowBottom, arrowX - 2, arrowBottom - 2);
    doc.line(arrowX, arrowBottom, arrowX + 2, arrowBottom - 2);
  }
  doc.text(`${Math.abs(variation.value).toFixed(0)}%`, arrowX + 4, arrowBottom + 1);
};

const TEMPORAL_REGIONAL_COLORS: [number, number, number][] = [
  [15, 118, 110],
  [37, 99, 235],
  [219, 39, 119],
  [217, 119, 6],
  [124, 58, 237],
  [8, 145, 178],
  [101, 163, 13],
  [71, 85, 105],
];

type TemporalRegionalPdfEntry = TemporalRegionalSlice & {
  name: string;
  color: [number, number, number];
};

const regionalEntryName = (slice: TemporalRegionalSlice): string => (
  slice.regionLabel ? `${slice.surveyName} · ${slice.regionLabel}` : slice.surveyName
);

const drawTemporalRegionalDonut = (
  doc: jsPDF,
  entries: TemporalRegionalPdfEntry[],
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
) => {
  const percentages = entries.map(entry => Math.max(0, Number(entry.percentage) || 0));
  const percentageTotal = percentages.reduce((total, weight) => total + weight, 0);
  const weights = percentageTotal > 0
    ? percentages
    : entries.map(entry => Math.max(0, Number(entry.count) || 0));
  const weightTotal = weights.reduce((total, weight) => total + weight, 0);
  if (weightTotal <= 0) return;
  let startAngle = -Math.PI / 2;

  entries.forEach((entry, index) => {
    const sliceAngle = (weights[index] / weightTotal) * Math.PI * 2;
    if (sliceAngle <= 0) return;
    const gap = entries.length > 1 ? Math.min(0.025, sliceAngle / 4) : 0;
    const start = startAngle + gap;
    const end = startAngle + sliceAngle - gap;
    if (end <= start) {
      startAngle += sliceAngle;
      return;
    }
    const points: [number, number][] = [];
    const steps = Math.max(3, Math.ceil((end - start) / (Math.PI / 18)));
    for (let step = 0; step <= steps; step += 1) {
      const angle = start + ((end - start) * step) / steps;
      points.push([centerX + Math.cos(angle) * outerRadius, centerY + Math.sin(angle) * outerRadius]);
    }
    for (let step = steps; step >= 0; step -= 1) {
      const angle = start + ((end - start) * step) / steps;
      points.push([centerX + Math.cos(angle) * innerRadius, centerY + Math.sin(angle) * innerRadius]);
    }
    const vectors = points.slice(1).map((point, pointIndex) => [
      point[0] - points[pointIndex][0],
      point[1] - points[pointIndex][1],
    ] as [number, number]);
    doc.setFillColor(...entry.color);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.lines(vectors, points[0][0], points[0][1], [1, 1], 'FD', true);
    startAngle += sliceAngle;
  });

  doc.setFillColor(255, 255, 255);
  doc.circle(centerX, centerY, innerRadius, 'F');
};

export const generateTemporalReportPDF = async (
  survey: Survey,
  questionLabel: string,
  filters: TemporalReportFilters,
  report: TemporalReportData,
  chartCapture?: TemporalChartCapture,
) => {
  if (report.points.length === 0 || report.answerOptions.length === 0) return;
  const cover = await loadReportCover('/assets/veraxus-pesquisas-capa-temporal.png');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  addReportCover(doc, cover, 'PNG');
  doc.addPage();
  const periodLabel = filters.startDate || filters.endDate
    ? `${filters.startDate || 'Início'} até ${filters.endDate || 'Fim'}`
    : 'Todo o período';
  const groupingLabel = filters.grouping === 'day' ? 'Dia' : filters.grouping === 'week' ? 'Semana' : 'Mês';
  const metricLabel = filters.displayMode === 'percentage' ? 'Percentual' : 'Quantidade';
  const formatPercentage = (value: number) => `${Math.round(value)}%`;
  const getVariation = (value: number, index: number): TemporalPdfVariation => {
    if (index === 0 || Math.abs(value) < 0.05) return { direction: 'stable', value: 0 };
    return { direction: value > 0 ? 'up' : 'down', value };
  };

  doc.setFillColor(5, 50, 97);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('EVOLUÇÃO TEMPORAL', margin, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(reportValueToText(survey.nome), margin, 21);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(`Pergunta: ${questionLabel}`, pageWidth - margin * 2), margin, 39);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Período: ${periodLabel} · Agrupamento: ${groupingLabel} · Métrica do gráfico: ${metricLabel}`, margin, 47);
  doc.text(`Respostas válidas analisadas: ${report.totalResponses}`, margin, 54);

  if (chartCapture && chartCapture.width > 0 && chartCapture.height > 0) {
    const chartTop = 62;
    const chartBottom = pageHeight - 18;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = chartBottom - chartTop;
    const aspectRatio = chartCapture.width / chartCapture.height;
    const imageWidth = Math.min(maxWidth, maxHeight * aspectRatio);
    const imageHeight = imageWidth / aspectRatio;
    doc.addImage(chartCapture.dataUrl, 'PNG', margin + (maxWidth - imageWidth) / 2, chartTop, imageWidth, imageHeight);
  }

  addTemporalVisualizationPages(doc, report, filters.displayMode);

  const regionalBreakdowns = report.regionalBreakdowns || {};
  const regionalOptions = report.answerOptions.slice(0, 4);
  const hasRegionalData = Object.values(regionalBreakdowns).some(slices => (
    Array.isArray(slices) && slices.some(slice => slice.total > 0 || slice.count > 0 || slice.percentage > 0)
  ));

  if (hasRegionalData && regionalOptions.length > 0) {
    const surveyIds = Array.from(new Set(Object.values(regionalBreakdowns).flat().map(slice => slice.surveyId)));
    const colorBySurveyId = new Map(surveyIds.map((surveyId, index) => [surveyId, TEMPORAL_REGIONAL_COLORS[index % TEMPORAL_REGIONAL_COLORS.length]]));
    const cardGap = 6;
    const cardWidth = (pageWidth - margin * 2 - cardGap) / 2;
    const cardPadding = 5;
    const valueWidth = 31;
    const legendLabelWidth = cardWidth - cardPadding * 2 - valueWidth - 4;
    const regionalCards = regionalOptions.map(option => {
      const entries: TemporalRegionalPdfEntry[] = (regionalBreakdowns[option.value] || []).map(slice => ({
        ...slice,
        name: regionalEntryName(slice),
        color: colorBySurveyId.get(slice.surveyId) || TEMPORAL_REGIONAL_COLORS[0],
      }));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const titleLines = doc.splitTextToSize(option.label, cardWidth - cardPadding * 2) as string[];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const legend = entries.map(entry => ({
        entry,
        lines: doc.splitTextToSize(entry.name, legendLabelWidth) as string[],
        value: `${entry.count.toLocaleString('pt-BR')} · ${entry.percentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
      }));
      const legendHeight = legend.reduce((height, item) => height + Math.max(1, item.lines.length) * 3.3 + 1.5, 0);
      const titleHeight = Math.max(1, titleLines.length) * 4.3;
      const height = cardPadding * 2 + titleHeight + 3 + 38 + 4 + legendHeight;
      return { option, entries, titleLines, legend, height };
    });

    const drawRegionalPageHeader = (continuation: boolean) => {
      doc.setTextColor(5, 50, 97);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('VISUALIZAÇÃO TEMPORAL · PESQUISA / REGIÃO', margin, 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      doc.text(
        continuation
          ? 'Continuação — cada resultado apresenta o donut completo e sua legenda com pesquisa, região, quantidade e percentual.'
          : 'Cada resultado apresenta o donut completo e sua legenda com pesquisa, região, quantidade e percentual.',
        margin,
        26,
      );
    };

    let cardIndex = 0;
    let isContinuation = false;
    while (cardIndex < regionalCards.length) {
      doc.addPage();
      drawRegionalPageHeader(isContinuation);
      let currentY = 34;
      while (cardIndex < regionalCards.length) {
        const rowCards = regionalCards.slice(cardIndex, cardIndex + 2);
        const rowHeight = Math.max(...rowCards.map(card => card.height));
        if (currentY > 34 && currentY + rowHeight > pageHeight - 18) break;
        rowCards.forEach((card, columnIndex) => {
          const cardX = margin + columnIndex * (cardWidth + cardGap);
          const cardY = currentY;
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.25);
          doc.roundedRect(cardX, cardY, cardWidth, card.height, 3, 3, 'FD');

          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(card.titleLines, cardX + cardWidth / 2, cardY + cardPadding + 3.5, { align: 'center' });

          const titleHeight = Math.max(1, card.titleLines.length) * 4.3;
          const donutCenterX = cardX + cardWidth / 2;
          const donutCenterY = cardY + cardPadding + titleHeight + 3 + 19;
          drawTemporalRegionalDonut(doc, card.entries, donutCenterX, donutCenterY, 17, 8.5);

          let legendY = donutCenterY + 17 + 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          card.legend.forEach(item => {
            const lineHeight = 3.3;
            const rowHeight = Math.max(1, item.lines.length) * lineHeight;
            doc.setFillColor(...item.entry.color);
            doc.circle(cardX + cardPadding + 1.5, legendY - 1.3, 1.3, 'F');
            doc.setTextColor(71, 85, 105);
            doc.text(item.lines, cardX + cardPadding + 4, legendY);
            doc.setTextColor(15, 23, 42);
            doc.text(item.value, cardX + cardWidth - cardPadding, legendY, { align: 'right' });
            legendY += rowHeight + 1.5;
          });
        });
        currentY += rowHeight + cardGap;
        cardIndex += rowCards.length;
      }
      isContinuation = true;
    }
  }

  doc.addPage();

  if (report.points.length > 10) {
    const detailedRows = report.answerOptions.flatMap(option => report.points.map(point => [
      option.label,
      point.label,
      formatPercentage(point.percentages[option.value] || 0),
      '',
    ]));
    autoTable(doc, {
      startY: 61,
      head: [['Resultado', 'Período', 'Percentual', 'Variação']],
      body: detailedRows,
      theme: 'grid',
      margin: { top: 32, bottom: 16, left: margin, right: margin },
      showHead: 'everyPage',
      headStyles: { fillColor: [5, 50, 97], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 3, minCellHeight: 16, overflow: 'linebreak', valign: 'top' },
      columnStyles: { 0: { cellWidth: 62, fontStyle: 'bold' }, 1: { cellWidth: 70 }, 2: { cellWidth: 32, halign: 'right' }, 3: { cellWidth: 32, halign: 'right' } },
      didDrawCell: data => {
        if (data.section !== 'body' || data.column.index !== 3) return;
        const optionIndex = Math.floor(data.row.index / report.points.length);
        const pointIndex = data.row.index % report.points.length;
        const option = report.answerOptions[optionIndex];
        const point = report.points[pointIndex];
        drawTemporalVariation(doc, data.cell, getVariation(point?.variations[option?.value || '']?.value || 0, pointIndex));
      },
    });
  } else {
    const rows = report.answerOptions.map(option => [
      option.label,
      ...report.points.map(point => formatPercentage(point.percentages[option.value] || 0)),
    ]);
    const head = [['Resultado', ...report.points.map(point => point.label)]];
    const resultWidth = 48;
    const periodWidth = (pageWidth - margin * 2 - resultWidth) / report.points.length;
    autoTable(doc, {
      startY: 61,
      head,
      body: rows,
      theme: 'grid',
      margin: { top: 32, bottom: 16, left: margin, right: margin },
      showHead: 'everyPage',
      headStyles: { fillColor: [5, 50, 97], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
      styles: { fontSize: 8, cellPadding: 3, minCellHeight: 16, overflow: 'linebreak', valign: 'top', halign: 'center' },
      columnStyles: { 0: { cellWidth: resultWidth, halign: 'left', fontStyle: 'bold' }, ...Object.fromEntries(report.points.map((_, index) => [index + 1, { cellWidth: periodWidth }])) },
      didDrawCell: data => {
        if (data.section !== 'body' || data.column.index === 0) return;
        const option = report.answerOptions[data.row.index];
        const pointIndex = data.column.index - 1;
        const point = report.points[pointIndex];
        drawTemporalVariation(doc, data.cell, getVariation(point?.variations[option?.value || '']?.value || 0, pointIndex));
      },
    });
  }

  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let page = 2; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setTextColor(110, 110, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Gerado em ${generatedAt} - Veraxus - Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  const fileName = `evolucao_temporal_${reportValueToText(survey.nome).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase() || 'pesquisa'}.pdf`;
  doc.save(fileName);
};
