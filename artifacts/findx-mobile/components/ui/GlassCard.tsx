import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

export interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Show a soft amber brand glow border */
  glow?: boolean;
  /** Disable press animation */
  noAnimation?: boolean;
  /** BlurView intensity (iOS only), default 20 */
  blurIntensity?: number;
  /** Disable padding */
  noPadding?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCard({
  children,
  style,
  contentStyle,
  onPress,
  glow = false,
  noAnimation = false,
  blurIntensity = 20,
  noPadding = false,
}: GlassCardProps) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (noAnimation) return;
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (noAnimation) return;
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const glowStyle: ViewStyle = glow
    ? {
        shadowColor: colors.brand,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
      }
    : {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 4,
      };

  const borderStyle = {
    borderColor: glow
      ? `rgba(245,158,11,0.30)`
      : colors.glassBorder,
    borderWidth: 1,
  };

  const innerContent = (
    <View
      style={[
        !noPadding && styles.padding,
        contentStyle,
        { flex: 1 },
      ]}
    >
      {children}
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress}
        style={[styles.container, glowStyle, style, animatedStyle]}
      >
        <BlurView
          intensity={blurIntensity}
          tint={colors.isDark ? "dark" : "light"}
          style={[styles.blur, borderStyle, styles.overflow]}
        >
          {innerContent}
        </BlurView>
      </AnimatedPressable>
    );
  }

  // Android / Web fallback — semi-transparent background
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[
        styles.container,
        glowStyle,
        { backgroundColor: colors.glassBackground },
        borderStyle,
        styles.overflow,
        style,
        animatedStyle,
      ]}
    >
      {innerContent}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
  },
  blur: {
    flex: 1,
    borderRadius: 16,
  },
  overflow: {
    overflow: "hidden",
  },
  padding: {
    padding: 16,
  },
});

export default GlassCard;
