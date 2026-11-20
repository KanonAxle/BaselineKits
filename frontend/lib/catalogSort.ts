export const CATALOG_SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A → Z' },
  { value: 'name_desc', label: 'Name: Z → A' },
] as const;

export type CatalogSort = typeof CATALOG_SORT_OPTIONS[number]['value'];

export function sortCatalog<T extends { name: string }>(
  items: T[],
  sort: CatalogSort,
  getPrice: (item: T) => number,
): T[] {
  const result = [...items];
  if (sort === 'price_asc') result.sort((a, b) => getPrice(a) - getPrice(b));
  if (sort === 'price_desc') result.sort((a, b) => getPrice(b) - getPrice(a));
  if (sort === 'name_asc') result.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'name_desc') result.sort((a, b) => b.name.localeCompare(a.name));
  return result;
}
