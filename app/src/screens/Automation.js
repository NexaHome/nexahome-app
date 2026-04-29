import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { postGraphQL } from "../../utils/api";

const Automation = ({ navigation }) => {
  const [automations, set_automations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAutomations = async () => {
      try {
        setLoading(true);
        const token = await SecureStore.getItemAsync("token");
        const activeHomeId = await SecureStore.getItemAsync("activeHomeId");

        const query = `
          query {
            automations {
              _id
              name
              trigger
              action
              is_active
            }
          }
        `;

        const response = await postGraphQL(
          { query },
          { 
            Authorization: `Bearer ${token}`,
            "x-home-id": activeHomeId
          }
        );

        const result = await response.json();
        if (result.data?.automations) {
          set_automations(
            result.data.automations.map((a) => ({
              id: a._id,
              name: a.name,
              sensor: a.trigger || "N/A",
              action: a.action,
              active: a.is_active ?? true,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load automations", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAutomations();
  }, []);

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Automation</Text>
          <AnimatedPressable style={styles.darkButton}>
            <Text style={styles.darkText}>+ New rule</Text>
          </AnimatedPressable>
        </View>

        {loading && <ActivityIndicator size="small" color="#7B61FF" style={{ marginTop: 20 }} />}
        
        {!loading && automations.length === 0 && (
          <Text style={{ color: "#64748B", marginTop: 20 }}>No automation rules created yet.</Text>
        )}

        {!loading && automations.map((item) => (
          <AnimatedPressable key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Text style={{ fontSize: 18 }}>⚡</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.triggerText}>Trigger: {item.sensor}</Text>
              </View>
              <View style={[styles.statusPill, !item.active && styles.statusPillOff]}>
                <Text style={[styles.statusPillText, !item.active && styles.statusPillTextOff]}>
                  {item.active ? "Active" : "Paused"}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Text style={styles.actionLabel}>THEN</Text>
              <View style={styles.actionBox}>
                <Text style={styles.actionValue}>{item.action}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.footer}>
              <View style={styles.btnRow}>
                <AnimatedPressable style={styles.editBtn}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </AnimatedPressable>
                <AnimatedPressable style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </AnimatedPressable>
              </View>
            </View>
          </AnimatedPressable>
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
    color: "#0A0F2C",
    letterSpacing: 0,
  },
  darkButton: {
    backgroundColor: "#0A0F2C",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  darkText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
  },
  triggerText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#E6FAFF",
    borderWidth: 1,
    borderColor: "#00D4FF",
  },
  statusPillOff: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  statusPillText: {
    color: "#036B82",
    fontSize: 10,
    fontWeight: "900",
  },
  statusPillTextOff: {
    color: "#64748B",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#94A3B8",
    marginRight: 12,
  },
  actionBox: {
    flex: 1,
  },
  actionValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  editBtn: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
  },
  deleteBtn: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    color: "#E11D48",
    fontSize: 12,
    fontWeight: "800",
  },
});

export default Automation;
