import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { automations } from "../data/homeData";

const Automation = ({ navigation }) => {
  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Automation</Text>
          <AnimatedPressable style={styles.darkButton}>
            <Text style={styles.darkText}>+ New rule</Text>
          </AnimatedPressable>
        </View>

        {automations.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.action}>Then {item.action}</Text>
            <Text style={styles.sensor}>Sensor: {item.sensor}</Text>
            <View style={styles.footer}>
              <View style={[styles.status, !item.active && styles.statusOff]}>
                <Text style={[styles.statusText, !item.active && styles.statusTextOff]}>
                  {item.active ? "Active" : "Inactive"}
                </Text>
              </View>
              <View style={styles.actions}>
                <AnimatedPressable style={styles.smallButton}>
                  <Text style={styles.smallText}>Edit</Text>
                </AnimatedPressable>
                <AnimatedPressable style={styles.deleteButton}>
                  <Text style={styles.deleteText}>Delete</Text>
                </AnimatedPressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      <BottomNav active="schedule" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 26 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#20211E",
    letterSpacing: 0,
  },
  darkButton: {
    backgroundColor: "#2E2F2B",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  darkText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADDD4",
    borderRadius: 13,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { color: "#252621", fontSize: 16, fontWeight: "900" },
  action: { color: "#5E615A", fontSize: 13, marginTop: 5 },
  sensor: { color: "#8B8E87", fontSize: 12.5, marginTop: 3 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  status: {
    minWidth: 64,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#8DD897",
    backgroundColor: "#F0FFF2",
    alignItems: "center",
    justifyContent: "center",
  },
  statusOff: { borderColor: "#D7D9D3", backgroundColor: "#F6F7F3" },
  statusText: { color: "#278039", fontSize: 11, fontWeight: "900" },
  statusTextOff: { color: "#8A8D86" },
  actions: { flexDirection: "row" },
  smallButton: {
    height: 28,
    minWidth: 54,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DADDD4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  smallText: { color: "#5E615A", fontSize: 11, fontWeight: "800" },
  deleteButton: {
    height: 28,
    minWidth: 58,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FF7777",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { color: "#FF5C5C", fontSize: 11, fontWeight: "800" },
});

export default Automation;
