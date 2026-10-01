// Palette inspired by the deep-forest / mint field-map reference design.
export const AgriColors = {
  background: '#F1F3EE',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F5F0',
  forest: '#123B29',
  forestDeep: '#0C2A1D',
  primary: '#1E5C3B',
  primaryDark: '#153F2C',
  primarySoft: '#E2F1DC',
  mint: '#D7EECF',
  mintStrong: '#A9DB9C',
  lime: '#8ACB6E',
  text: '#11261B',
  textMuted: '#66776C',
  textFaint: '#9AA79F',
  textOnDark: '#F3F8F1',
  textOnDarkMuted: '#A9C3B1',
  border: '#E2E8DF',
  success: '#2F8A55',
  error: '#C0473F',
  warning: '#C07E22',
  soil: '#2B7652',
  temperature: '#B66A3C',
  humidity: '#4D7C83',
  ivory: '#F1F3EE',
} as const;

// Matches the box colours the Pi draws on annotated scans.
export const DiseaseColors: Record<string, string> = {
  Healthy: '#22C55E',
  'Bacterial Spot': '#F97316',
  'Early Blight': '#EAB308',
  'Late Blight': '#EF4444',
  'Yellow Leaf Curl Virus': '#A855F7',
};

export const AgriSpacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
} as const;

export const AgriRadius = {
  sm: 12,
  md: 18,
  lg: 26,
  xl: 34,
  pill: 999,
} as const;

export const AgriShadow = {
  boxShadow: '0px 8px 18px rgba(12, 42, 29, 0.08)',
} as const;

export const AgriShadowStrong = {
  boxShadow: '0px 12px 28px rgba(12, 42, 29, 0.28)',
} as const;
