const UNITED_STATES_COUNTRY_CODES = new Set([
  'US',
  'USA',
  'UNITED STATES',
  'UNITED STATES OF AMERICA',
]);

function isUsShippingCountry(country) {
  if (country === undefined || country === null) return true;
  if (typeof country !== 'string') return false;
  return UNITED_STATES_COUNTRY_CODES.has(country.trim().toUpperCase());
}

module.exports = { isUsShippingCountry };
