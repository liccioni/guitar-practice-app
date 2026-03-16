import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { COLORS, RADII } from "../theme";

type ChipTone = "neutral" | "choice" | "accent" | "success";
type ChipSize = "default" | "compact";

interface AppChipProps {
  children?: ReactNode;
  label?: string;
  onPress?: () => void;
  selected?: boolean;
  tone?: ChipTone;
  size?: ChipSize;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function AppChip({
  children,
  label,
  onPress,
  selected = false,
  tone = "neutral",
  size = "default",
  disabled = false,
  style,
  textStyle,
  testID,
}: AppChipProps) {
  const content = (
    <>
      {children ?? <Text style={[styles.text, textToneStyles[tone], size === "compact" ? styles.compactText : null, selectedTextToneStyles[tone], selected ? styles.selectedText : null, textStyle]}>{label}</Text>}
    </>
  );

  const composedStyle = [
    styles.base,
    size === "compact" ? styles.compact : styles.default,
    toneStyles[tone],
    selected ? selectedToneStyles[tone] : null,
    disabled ? styles.disabled : null,
    style,
  ];

  if (!onPress) {
    return (
      <View style={composedStyle} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={composedStyle}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 36,
    borderRadius: RADII.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  default: {
    minHeight: 36,
  },
  compact: {
    minHeight: 30,
    paddingHorizontal: 10,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontWeight: "700",
    textAlign: "center",
  },
  compactText: {
    fontSize: 11,
  },
  selectedText: {
    color: COLORS.text,
  },
});

const toneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: COLORS.cardSoft,
    borderColor: COLORS.divider,
  },
  choice: {
    backgroundColor: "rgba(0,0,0,0.12)",
    borderColor: "#334a73",
  },
  accent: {
    backgroundColor: "rgba(230,126,0,0.12)",
    borderColor: "rgba(230,126,0,0.28)",
  },
  success: {
    backgroundColor: "rgba(34,197,94,0.14)",
    borderColor: "rgba(34,197,94,0.35)",
  },
});

const selectedToneStyles = StyleSheet.create({
  neutral: {
    borderColor: COLORS.text,
  },
  choice: {
    borderColor: "rgba(230,126,0,0.9)",
    backgroundColor: "rgba(230,126,0,0.16)",
  },
  accent: {
    borderColor: COLORS.accentAlt,
    backgroundColor: COLORS.cardSoft,
  },
  success: {
    borderColor: "rgba(34,197,94,0.55)",
  },
});

const textToneStyles = StyleSheet.create({
  neutral: {
    color: COLORS.text,
    fontSize: 12,
  },
  choice: {
    color: COLORS.muted,
    fontSize: 11,
  },
  accent: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  success: {
    color: "#22c55e",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});

const selectedTextToneStyles = StyleSheet.create({
  neutral: {},
  choice: {
    color: COLORS.accent,
  },
  accent: {},
  success: {},
});
