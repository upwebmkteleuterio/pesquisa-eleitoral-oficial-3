export const normalizeBrazilianPhone = (value: string | null | undefined): string => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  return digits === '0000' ? '0000' : digits;
};

export const isValidBrazilianPhone = (value: string | null | undefined): boolean => {
  const normalized = normalizeBrazilianPhone(value);
  return normalized === '0000' || /^\d{10,11}$/.test(normalized);
};

export const formatBrazilianPhone = (value: string | null | undefined): string => {
  const normalized = normalizeBrazilianPhone(value);
  if (normalized === '0000') return normalized;
  if (normalized.length <= 2) return normalized;
  if (normalized.length <= 6) return `(${normalized.slice(0, 2)}) ${normalized.slice(2)}`;
  const separatorIndex = normalized.length === 11 ? 7 : 6;
  return `(${normalized.slice(0, 2)}) ${normalized.slice(2, separatorIndex)}-${normalized.slice(separatorIndex)}`;
};

export const phoneValidationMessage = 'Informe 0000 ou um telefone brasileiro com 10 ou 11 dígitos.';
