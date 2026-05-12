import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreRingProps {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  animate?: boolean;
}

function getScoreColor(score: number, colors: ReturnType<typeof useColors>): string {
  if (score >= 80) return colors.statusWonText;
  if (score >= 60) return colors.statusQualifiedText;
  if (score >= 40) return colors.statusAnalyzingText;
  return colors.statusLostText;
}

export function ScoreRing({
  score,
  size = 52,
  strokeWidth = 4,
  showLabel = true,
  animate = true,
}: ScoreRingProps) {
  const colors = useColors();
  const progress = useSharedValue(0);

  const normalizedScore = score ?? 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const scoreColor = score !== null ? getScoreColor(normalizedScore, colors) : colors.foregroundSubtle;

  useEffect(() => {
    if (animate) {
      progress.value = 0;
      progress.value = withTiming(normalizedScore / 100, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = normalizedScore / 100;
    }
  }, [normalizedScore, animate]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.divider}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {showLabel && (
        <Text
          style={{
            fontSize: size * 0.26,
            fontFamily: "Inter_700Bold",
            color: score !== null ? scoreColor : colors.foregroundSubtle,
          }}
        >
          {score !== null ? `${Math.round(normalizedScore)}` : "—"}
        </Text>
      )}
    </View>
  );
}

export default ScoreRing;
