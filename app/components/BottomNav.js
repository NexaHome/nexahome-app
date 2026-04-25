import React from "react";
import { Text, View, StyleSheet } from "react-native";
import AnimatedPressable from "./AnimatedPressable";

const tabs = [
  { key: "home", label: "Home", route: "Dashboard" },
  { key: "sensors", label: "Sensors", route: "SensorMonitor" },
  { key: "schedule", label: "Schedule", route: "Schedule" },
  { key: "alerts", label: "Alerts", route: "Alerts" },
  { key: "members", label: "Members", route: "Members" },
];

const BottomNav = ({ active = "home", navigation }) => {
  return (
    <View style={styles.nav}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <AnimatedPressable
            key={tab.key}
            style={styles.tab}
            onPress={() => tab.route && navigation.navigate(tab.route)}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
            <View style={[styles.indicator, isActive && styles.activeIndicator]} />
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
    borderTopColor: "#E3E4DF",
    backgroundColor: "#FCFCFA",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tab: {
    width: 66,
    alignItems: "center",
  },
  label: {
    fontSize: 11.5,
    color: "#9A9D96",
    fontWeight: "600",
  },
  activeLabel: {
    color: "#22231F",
  },
  indicator: {
    width: 22,
    height: 3,
    borderRadius: 3,
    backgroundColor: "transparent",
    marginTop: 7,
  },
  activeIndicator: {
    backgroundColor: "#22231F",
  },
});

export default BottomNav;
