import React from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { transformStyle, useTheme } from "../../theme";
import AnimatedPressable from "./AnimatedPressable";

const tabs = [
  { key: "home", label: "Home", route: "Dashboard" },
  { key: "sensors", label: "Sensors", route: "SensorMonitor" },
  { key: "schedule", label: "Schedule", route: "Schedule" },
  { key: "alerts", label: "Alerts", route: "Alerts" },
  { key: "profile", label: "Profile", route: "Profile" },
];

const BottomNav = ({ active = "home", navigation }) => {
  const { mode, theme } = useTheme();

  return (
    <View style={transformStyle(styles.nav, theme, mode)}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <AnimatedPressable
            key={tab.key}
            style={styles.tab}
            onPress={() => tab.route && navigation.navigate(tab.route)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                mode === "dark" && styles.labelDark,
                isActive && styles.activeLabel,
                mode === "dark" && isActive && styles.activeLabelDark,
              ]}
            >
              {tab.label}
            </Text>
            <View
              style={[styles.indicator, isActive && styles.activeIndicator]}
            />
          </AnimatedPressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  nav: {
    height: 54,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 2,
  },
  tab: {
    flex: 1,
    maxWidth: 70,
    alignItems: "center",
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  labelDark: {
    color: "#B7C0D1",
  },
  activeLabel: {
    color: "#0A0F2C",
  },
  activeLabelDark: {
    color: "#FFFFFF",
  },
  indicator: {
    width: 22,
    height: 3,
    borderRadius: 3,
    backgroundColor: "transparent",
    marginTop: 4,
  },
  activeIndicator: {
    backgroundColor: "#0A0F2C",
  },
});

export default BottomNav;
