import type { CSSProperties } from 'react';
import type { Segment } from './data/models';

/**
 * Mirrors relun-android ui/theme. Sizes are px where Android uses dp/sp (1:1).
 * Keep the two in sync: a colour or type change there is a change here.
 */

/** Neutrals and status colours shared by both segments. */
export const RelunColors = {
  Ink: '#1A1A1A',
  Body: '#4A4A4A',
  Muted: '#757575',
  Faint: '#A0A0A0',
  Background: '#FAFAFA',
  Surface: '#FFFFFF',
  Border: '#E3E3E3',
  BorderSoft: '#EFEFEF',
  Divider: '#F2F2F2',
  Track: '#EFEFEF',
  Disabled: '#ECECEC',
  DisabledText: '#6B6B6B',
  ChipFill: '#F5F3F2',
  Skeleton: '#ECECEC',
  SkeletonHighlight: '#F8F8F8',

  // Separate from the rose accent so errors never read as branding.
  Error: '#B3261E',
  ErrorFill: '#FDECEA',
  ErrorBorder: '#F2B8B5',
  Success: '#1E8E5A',
  SuccessFill: '#E6F4EC',
  SuccessText: '#14653F',
  OnlineDot: '#22A861',
  WarningFill: '#FFF6E0',
  WarningText: '#6B4A00',

  CoinLight: '#FFF3A6',
  Coin: '#FFD700',
  CoinDark: '#E0B400',
  CoinRim: '#C99A00',
  CoinText: '#7A5A00',
  CoinPanel: '#FFF8D6',
  CoinPanelBorder: '#F3E2A0',

  Scrim: 'rgba(20,10,10,0.45)',

  /** Welcome, "You're in" and the match screen: rose (Relationship) into orange (Fun). */
  HeroGradient: 'linear-gradient(135deg, #E0245E, #FF9F1C)',
  HeroGlow: 'rgba(255,140,100,0.45)',
} as const;

/**
 * The accent set for the user's segment. Rose buttons use a deeper fill than the
 * brand pink so white text passes contrast; Fun buttons keep orange with dark text.
 */
export type SegmentColors = {
  segment: Segment;
  brand: string;
  fill: string;
  onFill: string;
  text: string;
  tint: string;
  wash: string;
  label: string;
  pill: string;
  description: string;
  /** Material Symbols name. */
  icon: string;
};

export const SegmentColorSets: Record<Segment, SegmentColors> = {
  relationship: {
    segment: 'relationship',
    brand: '#FF4B7D',
    fill: '#E0245E',
    onFill: '#FFFFFF',
    text: '#C81E52',
    tint: '#FFE9F0',
    wash: '#FFE1EA',
    label: 'Relationship',
    pill: 'Here for love',
    description: 'Looking for something serious and long-term',
    icon: 'favorite',
  },
  fun: {
    segment: 'fun',
    brand: '#FF9F1C',
    fill: '#FF9F1C',
    onFill: '#1A1A1A',
    text: '#A35400',
    tint: '#FFF1DB',
    wash: '#FFE7C2',
    label: 'Fun',
    pill: 'Here for fun',
    description: 'Casual, flirty, and keeping it light',
    icon: 'auto_awesome',
  },
};

export const segmentColors = (segment: Segment): SegmentColors => SegmentColorSets[segment] ?? SegmentColorSets.relationship;

const style = (size: number, weight: number, lineHeight?: number, tracking = 0): CSSProperties => ({
  fontFamily: 'Outfit, system-ui, sans-serif',
  fontWeight: weight,
  fontSize: size,
  lineHeight: lineHeight ?? 'normal',
  letterSpacing: tracking ? `${tracking}em` : undefined,
});

/** Same scale as Android's RelunTypography (Material 3 slots). */
export const T = {
  displayLarge: style(40, 700, 1.05, -0.02),
  displayMedium: style(36, 700, 1.05, -0.02),
  displaySmall: style(34, 700, 1.1),
  headlineLarge: style(30, 700, 1.15, -0.01),
  headlineMedium: style(28, 700, 1.15, -0.01),
  headlineSmall: style(24, 700, 1.15),
  titleLarge: style(22, 700, 1.2),
  titleMedium: style(20, 700, 1.2),
  titleSmall: style(16, 600, 1.25),
  bodyLarge: style(17, 400, 1.45),
  bodyMedium: style(15, 400, 1.45),
  bodySmall: style(13, 400, 1.4),
  labelLarge: style(17, 600),
  labelMedium: style(14, 600),
  labelSmall: style(12, 600),
  /** Small caps section headers: "ABOUT", "NEW MATCHES". */
  sectionLabel: style(13, 600, undefined, 0.06),
} satisfies Record<string, CSSProperties>;

export const Outfit = 'Outfit, system-ui, sans-serif';
export const Pacifico = 'Pacifico, cursive';
