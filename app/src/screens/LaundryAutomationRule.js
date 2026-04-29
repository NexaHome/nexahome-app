import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import Toggle from "../components/Toggle";

const Row = ({ label, value }) => (
  <View style={styles.ruleRow}>
    <View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
    <Text style={styles.changeText}>Edit</Text>
  </View>
);

const LaundryAutomationRule = ({ navigation }) => {
  const [notify, setNotify] = useState(true);
  const [active, setActive] = useState(true);

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Automation</Text>
        </AnimatedPressable>
        <Text style={styles.title}>Edit rule</Text>

        <Text style={styles.section}>Trigger if...</Text>
        <Row label="Sensor" value="Water / Rain - Patio" />
        <Row label="Condition" value="Rain detected (> 0 mm)" />
        <Text style={styles.arrow}>↓</Text>

        <Text style={styles.section}>Action then...</Text>
        <Row label="Device" value="Clothes Hanger - Patio" />
        <Row label="Action" value="Pull in" />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Send notification when active</Text>
          <Toggle active={notify} onPress={() => setNotify((value) => !value)} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Rule active</Text>
          <Toggle active={active} onPress={() => setActive((value) => !value)} />
        </View>

        <AnimatedPressable style={styles.saveButton}>
          <Text style={styles.saveText}>Save rule</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.deleteButton}>
          <Text style={styles.deleteText}>Delete rule</Text>
        </AnimatedPressable>
      </ScrollView>
      <BottomNav active="schedule" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 26 },
  backButton: { paddingVertical: 8, paddingRight: 16, alignSelf: "flex-start" },
  backText: { color: "#7B61FF", fontSize: 14, fontWeight: "900" },
  title: { color: "#0A0F2C", fontSize: 25, fontWeight: "900", letterSpacing: 0, marginBottom: 16 },
  section: { color: "#64748B", fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginBottom: 8 },
  ruleRow: {
    minHeight: 64,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  rowValue: { color: "#0A0F2C", fontSize: 14, fontWeight: "900", marginTop: 4 },
  changeText: { color: "#7B61FF", fontSize: 12, fontWeight: "900" },
  arrow: { textAlign: "center", color: "#94A3B8", fontSize: 24, marginBottom: 8 },
  toggleRow: {
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleText: { color: "#0A0F2C", fontSize: 14, fontWeight: "800" },
  saveButton: { height: 48, borderRadius: 9, backgroundColor: "#0A0F2C", alignItems: "center", justifyContent: "center", marginTop: 6 },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  deleteButton: { height: 48, borderRadius: 9, borderWidth: 1, borderColor: "#FF5C7A", alignItems: "center", justifyContent: "center", marginTop: 10 },
  deleteText: { color: "#FF5C7A", fontSize: 14, fontWeight: "900" },
});

export default LaundryAutomationRule;
