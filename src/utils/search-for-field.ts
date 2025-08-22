function searchForField(study: any, searchField?: string) {
  if (!searchField) return null;
  const parts = searchField.split(".");
  let value: any = study;
  for (const p of parts) {
    value = value?.[p];
    if (!value) break;
  }
  return value ?? "Field not found";
}