import type { PersonSizing } from './cartContext';

export function hasRequiredAdultPacks(people: PersonSizing[] | undefined, required: string[]): boolean {
  if (!required.length) return true;
  const adults = (people || [])
    .filter(person => typeof person.label === 'string' && /^Adult(?:\s|$)/.test(person.label))
    .map(person => typeof person.gender === 'string' ? person.gender.toLowerCase() : '')
    .sort();
  const expected = [...required].sort();
  return adults.length === expected.length && adults.every((gender, index) => gender === expected[index]);
}
