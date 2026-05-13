// ISO 3166-1 alpha-2 country codes to full names
export const COUNTRIES = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AR: 'Argentina', AM: 'Armenia',
  AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan', BS: 'Bahamas', BE: 'Belgium',
  BR: 'Brazil', BG: 'Bulgaria', CA: 'Canada', CL: 'Chile', CN: 'China',
  CO: 'Colombia', HR: 'Croatia', CZ: 'Czech Republic', DK: 'Denmark', EG: 'Egypt',
  EE: 'Estonia', FI: 'Finland', FR: 'France', GE: 'Georgia', DE: 'Germany',
  GH: 'Ghana', GR: 'Greece', HU: 'Hungary', IS: 'Iceland', IN: 'India',
  ID: 'Indonesia', IE: 'Ireland', IL: 'Israel', IT: 'Italy', JP: 'Japan',
  KZ: 'Kazakhstan', KE: 'Kenya', KR: 'South Korea', LV: 'Latvia', LT: 'Lithuania',
  LU: 'Luxembourg', MY: 'Malaysia', MX: 'Mexico', NL: 'Netherlands', NZ: 'New Zealand',
  NG: 'Nigeria', NO: 'Norway', PK: 'Pakistan', PH: 'Philippines', PL: 'Poland',
  PT: 'Portugal', RO: 'Romania', RU: 'Russia', SA: 'Saudi Arabia', RS: 'Serbia',
  SK: 'Slovakia', SI: 'Slovenia', ZA: 'South Africa', ES: 'Spain', SE: 'Sweden',
  CH: 'Switzerland', TW: 'Taiwan', TH: 'Thailand', TR: 'Turkey', UA: 'Ukraine',
  GB: 'United Kingdom', US: 'United States', UY: 'Uruguay', VE: 'Venezuela',
  VN: 'Vietnam', YE: 'Yemen', ZW: 'Zimbabwe',
  // Custom aliases
  EN: 'England',
}

export const getCountryName = (code) => {
  if (!code) return null
  return COUNTRIES[code.toUpperCase()] || code.toUpperCase()
}

export const getFlagUrl = (code) => {
  if (!code || code.length < 2) return null
  // Map custom aliases to real ISO codes for flags
  const flagCode = code.toUpperCase() === 'EN' ? 'gb-eng' : code.toLowerCase()
  return `https://flagcdn.com/24x18/${flagCode}.png`
}
