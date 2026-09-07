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
    headStyles: { fillStyle: 'none', textColor: [100, 100, 100], fontStyle: 'bold', fontSize: 8 },
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
  const pageCount = doc.internal.getNumberOfPages();
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