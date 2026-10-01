import { ImageBackground, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

const TILES = {
  dark: require('@/assets/images/hatch-dark.png'),
  light: require('@/assets/images/hatch-light.png'),
};

type HatchBackgroundProps = { variant?: keyof typeof TILES; style?: StyleProp<ViewStyle>; children?: ReactNode };

/** Diagonal field-map hatching from the reference design, as a repeating tile. */
export function HatchBackground({ variant = 'dark', style, children }: HatchBackgroundProps) {
  return (
    <ImageBackground resizeMode="repeat" source={TILES[variant]} style={style}>
      {children}
    </ImageBackground>
  );
}
