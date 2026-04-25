import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { alerts } from "../data/homeData";

const toneStyle = {
  Critical: { card: "#FFF0F3", border: "#FF5C7A", text: "#FF5C7A" },
  Warning: { card: "#F0ECFF", border: "#7B61FF", text: "#6D4DFF" },
  Info: { card: "#FFFFFF", border: "#D8DEE9", text: "#64748B" },
  Read: { card: "#F8FAFC", border: "#D8DEE9", text: "#94A3B8" },
};

const Alerts = ({ navigation }) => {
  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Alerts</Text>
          <AnimatedPressable style={styles.markButton}>
            <Text style={styles.markText}>Mark all read</Text>
          </AnimatedPressable>
        </View>

        <View style={styles.filters}>
          {["All", "Unread", "Critical"].map((filter, index) => (
            <View key={filter} style={[styles.filter, index === 0 && styles.filterActive]}>
              <Text style={[styles.filterText, index === 0 && styles.filterTextActive]}>
                {filter}
              </Text>
            </View>
          ))}
        </View>

        {alerts.map((item) => {
          const tone = toneStyle[item.level] || toneStyle.Info;
          return (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}
            >
              <View style={[styles.icon, { borderColor: tone.border }]}>
                <Text style={[styles.iconText, { color: tone.text }]}>!</Text>
              </View>
              <View style={styles.cardCopy}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[styles.level, { borderColor: tone.border }]}>
                    <Text style={[styles.levelText, { color: tone.text }]}>{item.level}</Text>
                  </View>
                </View>
                <Text style={styles.detail} numberOfLines={1}>{item.detail}</Text>
                <View style={styles.actionRow}>
                  <AnimatedPressable style={styles.actionButton}>
                    <Text style={styles.actionText}>Resolve</Text>
                  </AnimatedPressable>
                  <AnimatedPressable style={styles.actionButton}>
                    <Text style={styles.linkText}>View sensor</Text>
                  </AnimatedPressable>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <BottomNav active="alerts" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 26 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: { fontSize: 25, fontWeight: "900", color: "#0A0F2C", letterSpacing: 0 },
  markButton: { paddingVertical: 8, paddingLeft: 12 },
  markText: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  filters: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  filter: {
    width: "31%",
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  filterActive: { backgroundColor: "#0A0F2C", borderColor: "#0A0F2C" },
  filterText: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: "#FFFFFF" },
  card: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 13,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  iconText: { fontSize: 16, fontWeight: "900" },
  cardCopy: { flex: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: {
    flex: 1,
    color: "#0A0F2C",
    fontSize: 14,
    fontWeight: "900",
    paddingRight: 8,
  },
  level: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  levelText: { fontSize: 10, fontWeight: "900" },
  detail: { color: "#64748B", fontSize: 12, marginTop: 5 },
  actionRow: { flexDirection: "row", marginTop: 12 },
  actionButton: {
    height: 30,
    minWidth: 82,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  actionText: { color: "#64748B", fontSize: 11, fontWeight: "800" },
  linkText: { color: "#7B61FF", fontSize: 11, fontWeight: "800" },
});

export default Alerts;
