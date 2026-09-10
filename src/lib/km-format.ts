/**
 * Rótulo único de quilometragem.
 *
 * O campo `km` dos trechos já vem com o prefixo ("KM 13+000", "km 222,8"),
 * então concatenar "KM" na interface produzia "KM KM 13+000".
 * Use sempre `kmLabel` para exibir a quilometragem de um trecho.
 */
export const kmLabel = (km: string | number | null | undefined): string => {
  if (km == null) return "—";
  const raw = String(km).trim();
  if (!raw) return "—";
  const semPrefixo = raw.replace(/^k\s*m\.?\s*/i, "").trim();
  return `KM ${semPrefixo}`;
};
