import React from "react";
import { Text, View, StyleSheet } from "react-native";
import AnimatedPressable from "./AnimatedPressable";
import { transformStyle, useTheme } from "../theme";

const tabs = [
  { key: "home", label: "Home", route: "Dashboard" },
  { key: "sensors", label: "Sensors", route: "SensorMonitor" },
  { key: "schedule", label: "Schedule", route: "Schedule" },
  { key: "alerts", label: "Alerts", route: "Alerts" },
  { key: "members", label: "Members", route: "Members" },
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
    height: 70,
    paddingHorizontal: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tab: {
    width: 66,
    alignItems: "center",
  },
  label: {
    fontSize: 11.5,
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
    marginTop: 7,
  },
  activeIndicator: {
    backgroundColor: "#0A0F2C",
  },
});

export default BottomNav;
