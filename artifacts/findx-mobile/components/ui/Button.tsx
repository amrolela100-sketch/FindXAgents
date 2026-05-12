import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 20, stiffness: 400 });
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  };

  const isDisabled = disabled || loading;

  const sizeStyles = {
    sm: { height: 36, paddingHorizontal: 14, borderRadius: 10 },
    md: { height: 48, paddingHorizontal: 20, borderRadius: 14 },
    lg: { height: 56, paddingHorizontal: 26, borderRadius: 16 },
  }[size];

  const textSizes = {
    sm: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    md: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    lg: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  }[size];

  const renderContent = (textColor: string) => (
    <>
      {icon && iconPosition === "left" && icon}
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[textSizes, { color: textColor }, textStyle]}>{label}</Text>
      )}
      {icon && iconPosition === "right" && icon}
    </>
  );

  // Primary: amber gradient
  if (variant === "primary") {
    return (
      <AnimatedPressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          animatedStyle,
          { alignSelf: fullWidth ? "stretch" : "flex-start" },
          style,
        ]}
      >
        <LinearGradient
          colors={
            isDisabled
              ? ["rgba(245,158,11,0.40)", "rgba(249,115,22,0.40)"]
              : [colors.brandGradientStart, colors.brandGradientEnd]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.base,
            sizeStyles,
            fullWidth && styles.fullWidth,
            isDisabled && styles.disabled,
          ]}
        >
          {renderContent("#FFFFFF")}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  // Danger: red fill
  if (variant === "danger") {
    return (
      <AnimatedPressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.base,
          sizeStyles,
          fullWidth && styles.fullWidth,
          { backgroundColor: isDisabled ? `${colors.danger}60` : colors.danger },
          isDisabled && styles.disabled,
          animatedStyle,
          style,
        ]}
      >
        {renderContent("#FFFFFF")}
      </AnimatedPressable>
    );
  }

  // Secondary: glass
  if (variant === "secondary") {
    return (
      <AnimatedPressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.base,
          sizeStyles,
          fullWidth && styles.fullWidth,
          {
            backgroundColor: colors.glassBackground,
            borderWidth: 1,
            borderColor: colors.glassBorder,
          },
          isDisabled && styles.disabled,
          animatedStyle,
          style,
        ]}
      >
        {renderContent(colors.foreground)}
      </AnimatedPressable>
    );
  }

  // Ghost: transparent
  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.base,
        sizeStyles,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {renderContent(colors.foregroundMuted)}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  disabled: {
    opacity: 0.55,
  },
});

export default Button;
