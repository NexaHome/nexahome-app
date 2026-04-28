import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { featureTemplates } from "../data/homeData";

const AddFeature = ({ navigation, route }) => {
  const roomName = route.params?.roomName || "Teras";
  const [selected, setSelected] = useState("laundry");
  const [name, setName] = useState("Gantungan Baju");

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </AnimatedPressable>
        <Text style={styles.title}>Add feature</Text>
        <Text style={styles.subtitle}>Pasang fitur baru untuk room {roomName}.</Text>

        <Text style={styles.sectionTitle}>Pilih template</Text>
        {featureTemplates.map((item) => {
          const active = selected === item.id;
          return (
            <AnimatedPressable
              key={item.id}
              style={[styles.templateCard, active && styles.templateActive]}
              onPress={() => {
                setSelected(item.id);
                setName(item.name);
              }}
            >
              <View>
                <Text style={styles.templateTitle}>{item.name}</Text>
                <Text style={styles.templateMeta}>{item.type} - {item.room}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>
            </AnimatedPressable>
          );
        })}

        <Text style={styles.sectionTitle}>Detail fitur</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>Nama fitur</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
          <Text style={styles.label}>Room</Text>
          <TextInput style={styles.input} value={roomName} editable={false} />
        </View>

        <AnimatedPressable
          style={styles.saveButton}
          onPress={() =>
            selected === "laundry"
              ? navigation.navigate("LaundryStatus", { weather: "rainy" })
              : navigation.goBack()
          }
        >
          <Text style={styles.saveText}>Tambah fitur</Text>
        </AnimatedPressable>
      </ScrollView>
      <BottomNav active="home" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 26 },
  backButton: { paddingVertical: 8, paddingRight: 16, alignSelf: "flex-start" },
  backText: { color: "#7B61FF", fontSize: 14, fontWeight: "900" },
  title: { color: "#0A0F2C", fontSize: 27, fontWeight: "900", letterSpacing: 0, marginTop: 4 },
  subtitle: { color: "#64748B", fontSize: 13, marginTop: 5, marginBottom: 16 },
  sectionTitle: { color: "#0A0F2C", fontSize: 18, fontWeight: "900", marginBottom: 10, marginTop: 4 },
  templateCard: {
    minHeight: 72,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 13,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  templateActive: { borderColor: "#00D4FF", backgroundColor: "#F0ECFF" },
  templateTitle: { color: "#0A0F2C", fontSize: 16, fontWeight: "900" },
  templateMeta: { color: "#64748B", fontSize: 12.5, marginTop: 4 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: "#7B61FF" },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#7B61FF" },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  label: { color: "#64748B", fontSize: 12, fontWeight: "900", marginBottom: 7, marginTop: 8 },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 9,
    paddingHorizontal: 12,
    color: "#0A0F2C",
    fontSize: 14,
    fontWeight: "800",
    backgroundColor: "#EEF2F7",
  },
  saveButton: { height: 48, borderRadius: 9, backgroundColor: "#0A0F2C", alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});

export default AddFeature;
