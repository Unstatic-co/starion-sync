export function formatSheetNameInRange(sheetName: string) {
  return `'${sheetName.replace("'", "''")}'`;
}
