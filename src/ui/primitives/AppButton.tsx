import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { COLORS, RADII } from "../theme";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "default" | "large" | "chip";
type ButtonShape = "card" | "chip" | "pill";

interface AppButtonProps {
  children?: ReactNode;
  label?: string;
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function AppButton({
  children,
  label,
  onPress,
  onPressIn,
  onPressOut,
  variant = "secondary",
  size = "default",
  shape = "card",
  disabled = false,
  style,
  textStyle,
  testID,
}: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.base,
        variant === "primary" ? styles.primary : styles.secondary,
        size === "large" ? styles.large : size === "chip" ? styles.chip : styles.default,
        shape === "pill" ? styles.pill : shape === "chip" ? styles.chipShape : styles.card,
        disabled ? styles.disabled : null,
        style,
      ]}
      testID={testID}
    >
      {children ?? (
        <Text
          style={[
            styles.text,
            variant === "primary" ? styles.primaryText : styles.secondaryText,
            size === "chip" ? styles.chipText : null,
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: COLORS.accent,
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  secondary: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  default: {
    minHeight: 46,
  },
  large: {
    minHeight: 54,
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: 12,
  },
  card: {
    borderRadius: RADII.card,
  },
  chipShape: {
    borderRadius: RADII.chip,
  },
  pill: {
    borderRadius: RADII.pill,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    color: COLORS.text,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  primaryText: {
    fontSize: 14,
  },
  secondaryText: {
    fontSize: 15,
  },
  chipText: {
    fontSize: 12,
    letterSpacing: 0,
  },
});
