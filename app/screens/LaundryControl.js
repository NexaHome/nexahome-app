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
  hero: { height: 250, backgroundColor: "#EEF2F7", alignItems: "center", justifyContent: "center" },
  handle: { width: 96, height: 8, borderRadius: 8, backgroundColor: "#D8DEE9" },
  sheet: {
    marginTop: -18,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    padding: 20,
    paddingBottom: 26,
  },
  drag: { width: 58, height: 5, borderRadius: 5, backgroundColor: "#D8DEE9", alignSelf: "center", marginBottom: 16 },
  title: { color: "#0A0F2C", fontSize: 22, fontWeight: "900", letterSpacing: 0 },
  subtitle: { color: "#64748B", fontSize: 13, marginTop: 4, marginBottom: 18 },
  label: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  position: { color: "#0A0F2C", fontSize: 16, fontWeight: "900", marginTop: 4, marginBottom: 10 },
  segment: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  segmentButton: {
    width: "48%",
    height: 46,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: { backgroundColor: "#0A0F2C", borderColor: "#0A0F2C" },
  segmentText: { color: "#0A0F2C", fontSize: 14, fontWeight: "900" },
  segmentTextActive: { color: "#FFFFFF" },
  settingCard: {
    minHeight: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingText: { color: "#0A0F2C", fontSize: 14, fontWeight: "800" },
  warning: {
    borderWidth: 1,
    borderColor: "#7B61FF",
    backgroundColor: "#F0ECFF",
    borderRadius: 9,
    padding: 12,
    marginBottom: 12,
  },
  warningText: { color: "#6D4DFF", fontSize: 12, fontWeight: "800", lineHeight: 17 },
  cancelButton: {
    height: 46,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#64748B", fontSize: 14, fontWeight: "900" },
});

export default LaundryControl;
