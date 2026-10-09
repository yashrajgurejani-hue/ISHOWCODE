import { CaptionConfig } from '../types';

export const FONT_OPTIONS: Array<{ name: CaptionConfig['fontFamily']; label: string; family: string }> = [
  { name: 'Inter', label: 'Inter', family: "'Inter', sans-serif" },
  { name: 'Roboto', label: 'Roboto', family: "'Roboto', sans-serif" },
  { name: 'Montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif" },
  { name: 'Open Sans', label: 'Open Sans', family: "'Open Sans', sans-serif" },
  { name: 'Lexend', label: 'Lexend', family: "'Lexend', sans-serif" },
  { name: 'Poppins', label: 'Poppins', family: "'Poppins', sans-serif" },
  { name: 'Merriweather', label: 'Merriweather', family: "'Merriweather', serif" },
  { name: 'Playfair Display', label: 'Playfair Display', family: "'Playfair Display', serif" },
  { name: 'Fira Code', label: 'Fira Code', family: "'Fira Code', monospace" },
  { name: 'Outfit', label: 'Outfit', family: "'Outfit', sans-serif" },
];

export const FONT_WEIGHTS: Array<{ value: CaptionConfig['fontWeight']; label: string }> = [
  { value: 300, label: 'Light (300)' },
  { value: 400, label: 'Regular (400)' },
  { value: 500, label: 'Medium (500)' },
  { value: 600, label: 'Semi-Bold (600)' },
  { value: 700, label: 'Bold (700)' },
  { value: 800, label: 'Extra-Bold (800)' },
];

const CAPTION_STORAGE_KEY = 'bridgespeak_caption_config';

export class CaptionController {
  private static config: CaptionConfig = {
    fontFamily: 'Lexend',
    fontSize: 24,
    fontWeight: 600,
    textColor: '#EAE3DB',
    bgColor: '#1E1A18',
    bgOpacity: 85,
    hasTextShadow: true,
    textAlign: 'center',
  };

  static init(isDarkTheme: boolean = true): CaptionConfig {
    try {
      const saved = localStorage.getItem(CAPTION_STORAGE_KEY);
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      } else {
        this.config.textColor = isDarkTheme ? '#EAE3DB' : '#3A312B';
        this.config.bgColor = isDarkTheme ? '#1E1A18' : '#F4EFEA';
      }
    } catch {
      // fallback
    }
    return { ...this.config };
  }

  static getConfig(): CaptionConfig {
    return { ...this.config };
  }

  static setConfig(newConfig: Partial<CaptionConfig>): CaptionConfig {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(CAPTION_STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // ignore
    }
    return { ...this.config };
  }

  static resetDefaults(isDarkTheme: boolean = true): CaptionConfig {
    this.config = {
      fontFamily: 'Lexend',
      fontSize: 24,
      fontWeight: 600,
      textColor: isDarkTheme ? '#EAE3DB' : '#3A312B',
      bgColor: isDarkTheme ? '#1E1A18' : '#F4EFEA',
      bgOpacity: 85,
      hasTextShadow: true,
      textAlign: 'center',
    };
    try {
      localStorage.setItem(CAPTION_STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // ignore
    }
    return { ...this.config };
  }

  /**
   * Helper to generate React CSSProperties object from caption configuration
   */
  static getStyleObject(config: CaptionConfig): React.CSSProperties {
    const font = FONT_OPTIONS.find((f) => f.name === config.fontFamily);
    return {
      fontFamily: font ? font.family : "'Inter', sans-serif",
      fontSize: `${config.fontSize}px`,
      fontWeight: config.fontWeight,
      color: config.textColor,
      backgroundColor: this.getRgbaBackground(config.bgColor, config.bgOpacity),
      textAlign: config.textAlign,
      textShadow: config.hasTextShadow ? '0 2px 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)' : 'none',
    };
  }

  /**
   * Helper to generate RGBA background string from hex + opacity
   */
  static getRgbaBackground(hex: string, opacity: number): string {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    const alpha = (opacity / 100).toFixed(2);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
