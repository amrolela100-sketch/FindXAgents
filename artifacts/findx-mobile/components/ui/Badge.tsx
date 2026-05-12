import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { AgentRunStatus, LeadStatus } from "@/lib/types";

// ── Status Badge ────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: LeadStatus;
  style?: StyleProp<ViewStyle>;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  discovered: "New",
  analyzing: "Analyzing",
  analyzed: "Analyzed",
  contacting: "Contacted",
  responded: "Responded",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const colors = useColors();

  const textColor = ((): string => {
    switch (status) {
      case "discovered": return colors.statusDiscoveredText;
      case "analyzing":  return colors.statusAnalyzingText;
      case "analyzed":   return colors.statusAnalyzedText;
      case "contacting": return colors.statusContactingText;
      case "responded":  return colors.statusRespondedText;
      case "qualified":  return colors.statusQualifiedText;
      case "won":        return colors.statusWonText;
      case "lost":       return colors.statusLostText;
      default:           return colors.foregroundMuted;
    }
  })();

  const bgColor = ((): string => {
    switch (status) {
      case "discovered": return colors.statusDiscoveredBg;
      case "analyzing":  return colors.statusAnalyzingBg;
      case "analyzed":   return colors.statusAnalyzedBg;
      case "contacting": return colors.statusContactingBg;
      case "responded":  return colors.statusRespondedBg;
      case "qualified":  return colors.statusQualifiedBg;
      case "won":        return colors.statusWonBg;
      case "lost":       return colors.statusLostBg;
      default:           return colors.statusDiscoveredBg;
    }
  })();

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
      <View style={[styles.dot, { backgroundColor: textColor }]} />
      <Text style={[styles.badgeText, { color: textColor }]}>
        {STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
}

// ── Run Status Badge ─────────────────────────────────────────────────────────

interface RunStatusBadgeProps {
  status: AgentRunStatus;
  style?: StyleProp<ViewStyle>;
}

const RUN_STATUS_LABELS: Record<AgentRunStatus, string> = {
  running: "Running",
  completed: "Completed",
  partial: "Partial",
  failed: "Failed",
  queued: "Queued",
  cancelled: "Cancelled",
};

export function RunStatusBadge({ status, style }: RunStatusBadgeProps) {
  const colors = useColors();

  const textColor = ((): string => {
    switch (status) {
      case "running":   return colors.runRunningText;
      case "completed": return colors.runCompletedText;
      case "partial":   return colors.runPartialText;
      case "failed":    return colors.runFailedText;
      case "queued":
      case "cancelled": return colors.runQueuedText;
      default:          return colors.foregroundMuted;
    }
  })();

  const bgColor = ((): string => {
    switch (status) {
      case "running":   return colors.runRunningBg;
      case "completed": return colors.runCompletedBg;
      case "partial":   return colors.runPartialBg;
      case "failed":    return colors.runFailedBg;
      case "queued":
      case "cancelled": return colors.runQueuedBg;
      default:          return colors.statusDiscoveredBg;
    }
  })();

  const isPulse = status === "running";

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
      <View style={[styles.dot, { backgroundColor: textColor }]} />
      <Text style={[styles.badgeText, { color: textColor }]}>
        {RUN_STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
}

// ── Score Badge ───────────────────────────────────────────────────────────

interface ScoreBadgeProps {
  score: number | null;
  style?: StyleProp<ViewStyle>;
}

function getScoreColor(score: number, colors: ReturnType<typeof useColors>): { text: string; bg: string } {
  if (score >= 80) return { text: colors.statusWonText, bg: colors.statusWonBg };
  if (score >= 60) return { text: colors.statusQualifiedText, bg: colors.statusQualifiedBg };
  if (score >= 40) return { text: colors.statusAnalyzingText, bg: colors.statusAnalyzingBg };
  return { text: colors.statusLostText, bg: colors.statusLostBg };
}

export function ScoreBadge({ score, style }: ScoreBadgeProps) {
  const colors = useColors();

  if (score === null || score === undefined) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.statusDiscoveredBg }, style]}>
        <Text style={[styles.badgeText, { color: colors.foregroundMuted }]}>—</Text>
      </View>
    );
  }

  const { text: textColor, bg: bgColor } = getScoreColor(score, colors);

  return (
    <View style={[styles.scoreBadge, { backgroundColor: bgColor }, style]}>
      <Text style={[styles.scoreText, { color: textColor }]}>{score}</Text>
    </View>
  );
}

// ── Generic Chip ─────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  active?: boolean;
  color?: string;
  activeBg?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, active, color, activeBg, style }: ChipProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: active
            ? (activeBg ?? `${colors.brand}22`)
            : colors.glassBackground,
          borderColor: active
            ? (color ?? colors.brand)
            : colors.glassBorder,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? (color ?? colors.brand) : colors.foregroundMuted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: "center",
  },
  scoreText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
