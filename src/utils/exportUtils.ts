import * as XLSX from 'xlsx';
import { Submission, Researcher, DemographicOption } from '../types';
import { format } from 'date-fns';

export const exportSubmissions = (
  submissions: Submission[],
  surveyName: string,
  researchers: Researcher[],
  demographicOptions: DemographicOption[],
  dynamicQuestions: any[],
  formatType: 'xlsx' | 'csv'
) => {
  const getLabel = (category: string, value: string) => {
    if (!value) return "-";
    const option = demographicOptions?.find(o => o.categoria === category && o.valor === value);
    return option ? option.label : value;
  };

  // Flatten the data for export
  const exportData = submissions.map(sub => {
    const collector = researchers?.find(r => r.id === sub.pesquisador_id);
    
    // Base object with fixed fields
    const row: any = {
      "Entrevistado": sub.nome_entrevistado || "Anônimo",
      "Telefone": sub.telefone || "-",
      "Bairro": sub.bairro || "-",
      "Data Coleta": format(new Date(sub.data_coleta), "dd/MM/yyyy HH:mm"),
      "Pesquisador": collector?.nome || "Sistema",
      "Sexo": getLabel('sexo', sub.dados_fixos?.sexo),
      "Faixa Etária": getLabel('faixa_etaria', sub.dados_fixos?.faixa_etaria),
      "Escolaridade": getLabel('escolaridade', sub.dados_fixos?.escolaridade),
      "Renda": getLabel('renda', sub.dados_fixos?.renda),
      "Religião": getLabel('religiao', sub.dados_fixos?.religiao),
      "Estado Civil": getLabel('estado_civil', sub.dados_fixos?.estado_civil),
    };

    // Add dynamic questions
    dynamicQuestions.forEach(q => {
      const val = sub.respostas_dinamicas[q.id];
      row[q.label] = Array.isArray(val) ? val.join(", ") : (val?.toString() || "-");
    });

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Respostas");

  // Generate and download
  const dateStr = format(new Date(), "dd-MM-yyyy");
  const fileName = `${surveyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_respostas_${dateStr}`;

  if (formatType === 'xlsx') {
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } else {
    XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: 'csv' });
  }
};