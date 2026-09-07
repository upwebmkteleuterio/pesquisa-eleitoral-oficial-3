import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Submission, Survey, Researcher, DemographicOption } from '../types';
import { aggregateQuestionResponses } from './responseNormalization';

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

export const generateReportPDF = (survey: Survey, submissions: Submission[]) => {
  const validSubmissions = submissions.filter(submission => submission.valida !== false);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
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
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setDrawColor(210, 210, 210);
    doc.line(15, page === 1 ? 31 : 16, pageWidth - 15, page === 1 ? 31 : 16);
    doc.setTextColor(110, 110, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (page > 1) doc.text(`Veraxus - ${reportValueToText(survey.nome)}`, 15, 11);
    doc.text(`Gerado em ${generatedAt} - Página ${page} de ${pageCount}`, pageWidth - 15, pageHeight - 9, { align: 'right' });
  }

  const fileName = `relatorio_${reportValueToText(survey.nome).replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase() || 'pesquisa'}.pdf`;
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

const getSubmissionMemberId = (submission: Submission): string => {
  const memberId = submission.origem === "web" ? submission.referenciado_por : submission.pesquisador_id;
  return memberId || "sistema";
};
