import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Submission, Survey, Researcher, DemographicOption } from '../types';

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

export const generateReportPDF = (survey: Survey, submissions: Submission[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const total = submissions.length;
  const questions = [...(survey.schema_dinamico?.questions || [])];
  const questionIds = new Set(questions.map((question: any) => question.id));

  submissions.forEach(submission => {
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
  ['sexo', 'faixa_etaria', 'renda', 'escolaridade', 'religiao', 'estado_civil'].forEach(category => {
    const counts: Record<string, number> = {};
    submissions.forEach(submission => {
      const value = reportValueToText(submission.dados_fixos?.[category]);
      if (value !== '-') counts[value] = (counts[value] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (entries.length === 0) {
      demographicRows.push([category.replace('_', ' '), '0', '0.0%']);
      return;
    }
    entries.sort((a, b) => b[1] - a[1]).forEach(([value, count]) => {
      demographicRows.push([`${category.replace('_', ' ')}: ${REPORT_LABELS[category]?.[value] || value}`, String(count), reportPercentage(count, total)]);
    });
  });
  currentY = addDistributionTable(currentY, demographicRows);

  currentY = addSectionTitle('PERGUNTAS DINÂMICAS', currentY);
  for (const question of questions) {
    const label = reportValueToText(question.label || question.id);
    currentY = addSectionTitle(label, currentY);
    const counts: Record<string, number> = {};
    const configuredOptions = Array.isArray(question.options) ? question.options : [];
    configuredOptions.forEach((option: unknown) => {
      const optionText = reportValueToText(option);
      if (optionText !== '-') counts[optionText] = 0;
    });

    submissions.forEach(submission => {
      const answer = submission.respostas_dinamicas?.[question.id];
      const answers = Array.isArray(answer) ? answer : [answer];
      answers.forEach(value => {
        const text = reportValueToText(value);
        if (text !== '-') counts[text] = (counts[text] || 0) + 1;
      });
    });

    const entries = Object.entries(counts);
    const rows = entries.length > 0
      ? entries.sort((a, b) => b[1] - a[1]).map(([value, count]) => [value, String(count), reportPercentage(count, total)])
      : [['Sem respostas', '0', '0.0%']];
    currentY = addDistributionTable(currentY, rows);
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
