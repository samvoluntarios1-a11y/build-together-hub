import * as XLSX from "xlsx";

type Cell = string | number | null | undefined;

function csvEscape(value: Cell): string {
  const s = value == null ? "" : String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCSV(filename: string, headers: string[], rows: Cell[][]) {
  const lines = [headers, ...rows].map((r) => r.map(csvEscape).join(";"));
  // BOM para que Excel abra UTF-8 correctamente
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  downloadBlob(blob, filename);
}

export interface ExportFilters {
  periodType: string;
  fromDate?: string;
  toDate?: string;
  categories?: string[];
  status?: string;
  level?: string;
  accommodation?: string;
  locality?: string;
  includeAssignedOnly?: boolean;
  includeAvailableNotAssigned?: boolean;
}

export interface ExcelSheet {

  name: string;
  headers: string[];
  rows: Cell[][];
}

export function downloadExcel(filename: string, sheets: ExcelSheet[]) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    ws["!cols"] = sheet.headers.map((h, i) => ({
      wch: Math.max(
        h.length + 2,
        ...sheet.rows.slice(0, 200).map((r) => String(r[i] ?? "").length + 2),
        10,
      ),
    }));
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: sheet.rows.length, c: sheet.headers.length - 1 },
      }),
    };
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; color: #1a3a5c; margin: 0; padding: 24px; font-size: 12px; }
  .report-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1a3a5c; padding-bottom: 12px; margin-bottom: 16px; }
  .report-header h1 { font-size: 20px; margin: 0; color: #1a3a5c; }
  .report-header .brand { font-weight: 800; color: #00b8dd; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
  h2.day { background: #1a3a5c; color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 13px; margin: 18px 0 8px; page-break-after: avoid; }
  h3.cat { color: #1a3a5c; font-size: 12px; margin: 10px 0 4px; text-transform: uppercase; letter-spacing: .5px; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; page-break-inside: auto; }
  th { background: #1a3a5c; color: #fff; text-align: left; padding: 5px 8px; font-size: 11px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
  tr:nth-child(even) td { background: #f5f7fa; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 10px; font-weight: 700; }
  .badge-p { background: #dcfce7; color: #166534; }
  .badge-s { background: #fef9c3; color: #854d0e; }
  .footer { margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
  .empty { color: #94a3b8; font-style: italic; padding: 4px 8px; }
  @media print { body { padding: 0; } }
`;

/** Abre una ventana imprimible (el usuario puede guardar como PDF). */
export function printHtmlReport(title: string, bodyHtml: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return false;
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_STYLES}</style></head><body>${bodyHtml}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
  return true;
}

export function reportHeader(title: string, subtitle: string) {
  const today = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `<div class="report-header"><div><div class="brand">Voluntarios Obra</div><h1>${title}</h1></div><div style="text-align:right;color:#64748b">${subtitle}<br>Generado: ${today}</div></div>`;
}

export function reportFooter() {
  const today = new Date().toLocaleString("es-AR");
  return `<div class="footer"><span>Voluntarios Obra — Documento generado automáticamente</span><span>${today}</span></div>`;
}
