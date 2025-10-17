import { Customer } from './supabase';

export function exportToCSV(customers: Customer[], filename: string = 'musteriler.csv') {
  const headers = ['Ad Soyad', 'E-posta', 'Telefon', 'Adres', 'Notlar'];

  const csvRows = [
    headers.join(','),
    ...customers
      .filter(customer => customer.phone && customer.phone.trim() !== '')
      .map(customer => {
        const siteName = customer.site_configurations?.site_name || '';
        const notesWithSite = siteName
          ? `${siteName}${customer.notes ? ' - ' + customer.notes : ''}`
          : customer.notes || '';

        const formattedPhone = formatPhoneNumber(customer.phone);

        const row = [
          escapeCSVField(customer.full_name),
          escapeCSVField(customer.email),
          escapeCSVField(formattedPhone),
          escapeCSVField(customer.address),
          escapeCSVField(notesWithSite)
        ];
        return row.join(',');
      })
  ];

  const csvContent = csvRows.join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSVField(field: string): string {
  if (!field) return '""';
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return `"${stringField}"`;
}

/**
 * Telefon numarasını normalize eder ve "+90 5XX XXX XX XX" formatına çevirir.
 */
function formatPhoneNumber(raw: string): string {
  if (!raw) return '';

  // Sadece rakamları al
  let digits = raw.replace(/\D/g, '');

  // Eğer başında "00" varsa kaldır
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Eğer başında "90" yoksa ekle
  if (!digits.startsWith('90')) {
    if (digits.startsWith('0')) digits = '90' + digits.slice(1);
    else if (digits.length === 10 && digits.startsWith('5')) digits = '90' + digits;
  }

  // Şimdi 12 haneli olmalı: 905XXXXXXXXX
  if (digits.length !== 12) return raw.trim(); // Geçersiz formatta ise orijinal döndür

  const part1 = digits.slice(2, 5); // 539
  const part2 = digits.slice(5, 8); // 889
  const part3 = digits.slice(8, 10); // 33
  const part4 = digits.slice(10, 12); // 21

  return `+90 ${part1} ${part2} ${part3} ${part4}`;
}
