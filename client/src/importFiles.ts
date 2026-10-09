import * as XLSX from "xlsx";

export const MAX_IMPORT_FILE_BYTES = 25 * 1024 * 1024;
// Excel workbooks from CJ are mostly embedded styling/images that never reach
// the API — the converted CSV text is what the 35M char budget below guards —
// so they get a higher raw-size ceiling (parsing much bigger files can freeze
// the browser tab).
export const MAX_EXCEL_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_TOTAL_CSV_CHARS = 35 * 1024 * 1024;
export const MAX_IMPORT_FILES = 10;

export function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".xlsx") || name.endsWith(".xls");
}

// CJ workbooks put a marketing banner row above the real column headers,
// which would otherwise become the CSV header row and break the import.
function stripLeadingBannerRows(csvText: string): string {
  const lines = csvText.split("\n");
  const headerIndex = lines.findIndex((line) => {
    const lowered = line.toLowerCase();
    return lowered.includes("product name") || lowered.includes("products name");
  });
  return headerIndex > 0 && headerIndex <= 10 ? lines.slice(headerIndex).join("\n") : csvText;
}

export async function fileToCsvText(file: File): Promise<string> {
  if (!isExcelFile(file)) {
    return file.text();
  }

  const workbook = XLSX.read(await file.arrayBuffer());
  const firstSheetName = workbook.SheetNames[0];
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  if (!sheet) {
    throw new Error(`"${file.name}" has no worksheets. Export the product list from CJ again.`);
  }

  const csvText = stripLeadingBannerRows(XLSX.utils.sheet_to_csv(sheet));
  if (!csvText.trim()) {
    throw new Error(`"${file.name}" looks empty. Check that the first worksheet has the product rows.`);
  }
  return csvText;
}

export async function filesToCsvTexts(files: File[]): Promise<string[]> {
  if (files.length > MAX_IMPORT_FILES) {
    throw new Error(`Import ${MAX_IMPORT_FILES} files or fewer at a time.`);
  }

  for (const file of files) {
    const excel = isExcelFile(file);
    const limit = excel ? MAX_EXCEL_FILE_BYTES : MAX_IMPORT_FILE_BYTES;
    if (file.size > limit) {
      const limitMb = Math.round(limit / (1024 * 1024));
      const sizeMb = Math.round(file.size / (1024 * 1024));
      const hint = excel
        ? "Huge CJ workbooks are mostly embedded photos — run scripts/convert-cj-xlsx.py on it to get a small CSV, or export CSV from CJ."
        : "Export a smaller file from CJ, or split it into batches.";
      throw new Error(`"${file.name}" is ${sizeMb}MB (limit ${limitMb}MB). ${hint}`);
    }
  }

  const csvTexts: string[] = [];
  let totalChars = 0;
  for (const file of files) {
    const csvText = await fileToCsvText(file);
    totalChars += csvText.length;
    if (totalChars > MAX_TOTAL_CSV_CHARS) {
      throw new Error("These files are too large to import together. Split the import into smaller batches.");
    }
    csvTexts.push(csvText);
  }
  return csvTexts;
}
