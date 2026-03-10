import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { COLORS, RADII, SPACING } from "../theme";

interface GlowCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.card,
    padding: SPACING.cardPadding,
    borderWidth: 1,
    borderColor: COLORS.divider,
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 10,
  },
});

export function GlowCard(props: GlowCardProps) {
  return <View style={[styles.base, props.style]}>{props.children}</View>;
}
