import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import Toggle from "../components/Toggle";

const LaundryControl = ({ navigation }) => {
  const [position, setPosition] = useState("Masuk");
  const [disableAuto, setDisableAuto] = useState(false);

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.handle} />
        </View>
        <View style={styles.sheet}>
          <View style={styles.drag} />
          <Text style={styles.title}>Kontrol manual</Text>
          <Text style={styles.subtitle}>Gantungan Baju - Teras</Text>
          <Text style={styles.label}>Posisi saat ini</Text>
          <Text style={styles.position}>{position}</Text>

          <View style={styles.segment}>
            {["Keluar", "Masuk"].map((item) => (
              <AnimatedPressable
                key={item}
                style={[styles.segmentButton, position === item && styles.segmentActive]}
                onPress={() => setPosition(item)}
              >
                <Text style={[styles.segmentText, position === item && styles.segmentTextActive]}>
                  {item === "Keluar" ? "Keluarkan" : "Masukkan"}
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          <View style={styles.settingCard}>
            <Text style={styles.settingText}>Nonaktifkan mode otomatis</Text>
            <Toggle active={disableAuto} onPress={() => setDisableAuto((value) => !value)} />
          </View>
          <View style={styles.warning}>
            <Text style={styles.warningText}>Saat mode manual aktif, sensor hujan tidak menggerakkan gantungan.</Text>
          </View>
          <AnimatedPressable style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Batal</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
      <BottomNav active="home" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { minHeight: "100%" },
  hero: { height: 250, backgroundColor: "#E8E9E4", alignItems: "center", justifyContent: "center" },
  handle: { width: 96, height: 8, borderRadius: 8, backgroundColor: "#D1D3CD" },
  sheet: {
    marginTop: -18,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "#E1E3DD",
    padding: 20,
    paddingBottom: 26,
  },
  drag: { width: 58, height: 5, borderRadius: 5, backgroundColor: "#DADDD4", alignSelf: "center", marginBottom: 16 },
  title: { color: "#20211E", fontSize: 22, fontWeight: "900", letterSpacing: 0 },
  subtitle: { color: "#8B8E87", fontSize: 13, marginTop: 4, marginBottom: 18 },
  label: { color: "#8B8E87", fontSize: 12, fontWeight: "800" },
  position: { color: "#252621", fontSize: 16, fontWeight: "900", marginTop: 4, marginBottom: 10 },
  segment: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  segmentButton: {
    width: "48%",
    height: 46,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DADDD4",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: { backgroundColor: "#2E2F2B", borderColor: "#2E2F2B" },
  segmentText: { color: "#42443E", fontSize: 14, fontWeight: "900" },
  segmentTextActive: { color: "#FFFFFF" },
  settingCard: {
    minHeight: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingText: { color: "#42443E", fontSize: 14, fontWeight: "800" },
  warning: {
    borderWidth: 1,
    borderColor: "#F1BD47",
    backgroundColor: "#FFF7DE",
    borderRadius: 9,
    padding: 12,
    marginBottom: 12,
  },
  warningText: { color: "#B27700", fontSize: 12, fontWeight: "800", lineHeight: 17 },
  cancelButton: {
    height: 46,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DADDD4",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#8B8E87", fontSize: 14, fontWeight: "900" },
});

export default LaundryControl;
