import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import Toggle from "../components/Toggle";
import { laundryStatus } from "../data/homeData";

const LaundryStatus = ({ navigation, route }) => {
  const [autoMode, setAutoMode] = useState(true);
  const weather = route.params?.weather || "rainy";
  const status = laundryStatus[weather];

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </AnimatedPressable>
          <Text style={styles.roomText}>Teras</Text>
        </View>

        <Text style={styles.title}>Gantungan Baju</Text>
        <View style={styles.railCard}>
          <View style={styles.rail} />
          <View style={styles.hangers}>
            {[0, 1, 2, 3, 4].map((item) => (
              <View key={item} style={styles.hanger} />
            ))}
          </View>
          <Text style={styles.position}>Posisi: {status.position}</Text>
          <View style={[styles.modePill, status.safe && styles.safePill]}>
            <Text style={[styles.modeText, status.safe && styles.safeText]}>
              {status.safe ? "Cerah - aman" : "Otomatis aktif"}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View>
            <Text style={styles.infoLabel}>Sensor hujan</Text>
            <Text style={styles.infoTitle}>{status.title}</Text>
            <Text style={styles.infoMeta}>{status.value} - terdeteksi 5 menit lalu</Text>
          </View>
          <View style={[styles.weatherBadge, status.safe && styles.weatherBadgeSafe]}>
            <Text style={[styles.weatherText, status.safe && styles.weatherTextSafe]}>
              {status.badge}
            </Text>
          </View>
        </View>

        <View style={styles.settingCard}>
          <Text style={styles.settingText}>Mode otomatis</Text>
          <Toggle active={autoMode} onPress={() => setAutoMode((value) => !value)} />
        </View>

        <View style={styles.historyCard}>
          <Text style={styles.infoLabel}>Riwayat hari ini</Text>
          {status.history.map((item) => (
            <Text key={item} style={styles.historyText}>{item}</Text>
          ))}
        </View>

        <AnimatedPressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate("LaundryControl")}
        >
          <Text style={styles.primaryText}>Kontrol manual</Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("LaundryAutomationRule")}
        >
          <Text style={styles.secondaryText}>Edit rule otomatis</Text>
        </AnimatedPressable>
      </ScrollView>
      <BottomNav active="home" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 26 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backButton: { paddingVertical: 8, paddingRight: 16 },
  backText: { color: "#3478F6", fontSize: 14, fontWeight: "900" },
  roomText: { color: "#8B8E87", fontSize: 13, fontWeight: "700" },
  title: { color: "#20211E", fontSize: 25, fontWeight: "900", letterSpacing: 0, marginBottom: 12 },
  railCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADDD4",
    borderRadius: 13,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  rail: { width: "86%", height: 5, borderRadius: 4, backgroundColor: "#9A9D96" },
  hangers: { flexDirection: "row", width: "70%", justifyContent: "space-between", marginTop: -1 },
  hanger: { width: 10, height: 42, borderRadius: 3, backgroundColor: "#C7C9C3" },
  position: { color: "#8B8E87", fontSize: 12, marginTop: 10 },
  modePill: {
    marginTop: 8,
    minWidth: 128,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#7EC0FF",
    backgroundColor: "#EAF5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  safePill: { borderColor: "#8DD897", backgroundColor: "#F0FFF2" },
  modeText: { color: "#2580D7", fontSize: 12, fontWeight: "900" },
  safeText: { color: "#278039" },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADDD4",
    borderRadius: 13,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  infoLabel: { color: "#8B8E87", fontSize: 12, fontWeight: "700" },
  infoTitle: { color: "#252621", fontSize: 17, fontWeight: "900", marginTop: 4 },
  infoMeta: { color: "#8B8E87", fontSize: 12, marginTop: 3 },
  weatherBadge: {
    minWidth: 70,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#F1BD47",
    backgroundColor: "#FFF7DE",
    alignItems: "center",
    justifyContent: "center",
  },
  weatherBadgeSafe: { borderColor: "#8DD897", backgroundColor: "#F0FFF2" },
  weatherText: { color: "#B27700", fontSize: 12, fontWeight: "900" },
  weatherTextSafe: { color: "#278039" },
  settingCard: {
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADDD4",
    borderRadius: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  settingText: { color: "#42443E", fontSize: 14, fontWeight: "800" },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADDD4",
    borderRadius: 13,
    padding: 14,
    marginBottom: 12,
  },
  historyText: { color: "#42443E", fontSize: 13, marginTop: 5, fontWeight: "700" },
  primaryButton: {
    height: 48,
    borderRadius: 9,
    backgroundColor: "#2E2F2B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  secondaryButton: {
    height: 46,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DADDD4",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#3478F6", fontSize: 13, fontWeight: "900" },
});

export default LaundryStatus;
