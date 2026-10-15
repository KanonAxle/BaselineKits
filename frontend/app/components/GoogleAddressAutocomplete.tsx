'use client';

import { useEffect, useRef, useState } from 'react';
import { autocompleteGoogleAddress, getGoogleAddressDetails } from '../../lib/api';

type AddressDetails = {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  formatted_address: string;
};

type Suggestion = {
  place_id: string;
  description: string;
};

type Props = {
  value: string;
  onChange: (street: string) => void;
  onAddressSelected: (address: AddressDetails) => void;
  className?: string;
};

export default function GoogleAddressAutocomplete({
  value,
  onChange,
  onAddressSelected,
  className = '',
}: Props) {
  const sessionToken = useRef<string | null>(null);
  const suppressNextAutocomplete = useRef(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (suppressNextAutocomplete.current) {
      suppressNextAutocomplete.current = false;
      return;
    }
    const input = value.trim();
    if (input.length < 4) return;

    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      const token = sessionToken.current || window.crypto.randomUUID();
      sessionToken.current = token;

      try {
        const result = await autocompleteGoogleAddress(input, token);
        if (!active) return;
        setSuggestions(result.suggestions || []);
        if (!result.suggestions?.length) setError('No matching addresses found. You can enter the address manually.');
      } catch (requestError) {
        if (!active) return;
        setSuggestions([]);
        setError(requestError instanceof Error ? requestError.message : 'Address suggestions are unavailable. Enter the address manually.');
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [value]);

  async function selectSuggestion(suggestion: Suggestion) {
    const token = sessionToken.current;
    if (!token) return;

    setSelecting(true);
    setError('');
    try {
      const result = await getGoogleAddressDetails(suggestion.place_id, token);
      const address = result.address as AddressDetails;
      if (address.country !== 'US') {
        setError('We currently ship only within the United States. Please enter a U.S. address.');
        return;
      }
      if (!address.street || !address.city || !address.state || !address.zip) {
        setError('That result did not include a complete mailing address. Please enter the address manually.');
        return;
      }

      suppressNextAutocomplete.current = true;
      onAddressSelected(address);
      setSuggestions([]);
      sessionToken.current = null;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The selected address could not be loaded. Enter it manually.');
    } finally {
      setSelecting(false);
    }
  }

  return (
    <div className="relative md:col-span-2">
      <input
        type="text"
        value={value}
        onChange={event => {
          const nextValue = event.target.value;
          onChange(nextValue);
          if (nextValue.trim().length < 4) {
            sessionToken.current = null;
            setSuggestions([]);
            setError('');
            setLoading(false);
          }
        }}
        placeholder="Start typing your street address"
        autoComplete="street-address"
        aria-label="Street address"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
        aria-controls="google-address-suggestions"
        className={className}
      />
      {(loading || selecting) && (
        <span className="absolute right-3 top-3 text-xs text-stone-500">
          {selecting ? 'Loading address…' : 'Searching…'}
        </span>
      )}
      {suggestions.length > 0 && (
        <ul
          id="google-address-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-stone-700 bg-stone-900 shadow-xl"
        >
          {suggestions.map(suggestion => (
            <li key={suggestion.place_id}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => selectSuggestion(suggestion)}
                disabled={selecting}
                className="w-full px-4 py-3 text-left text-sm text-stone-200 hover:bg-stone-800 disabled:opacity-50"
              >
                {suggestion.description}
              </button>
            </li>
          ))}
          <li className="border-t border-stone-800 px-3 py-1 text-right text-[10px] text-stone-500">
            Powered by Google
          </li>
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-amber-400">{error}</p>}
      <p className="mt-1 text-right text-[10px] text-stone-600">Address suggestions by Google</p>
    </div>
  );
}
