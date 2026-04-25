import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";

const AddRoom = ({ navigation, route }) => {
  const isEdit = route.params?.mode === "edit";
  const [name, setName] = useState(route.params?.roomName || "Teras");
  const [area, setArea] = useState("Luar rumah");
  const [icon, setIcon] = useState("Jemuran");

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </AnimatedPressable>
        <Text style={styles.title}>{isEdit ? "Edit room" : "Add room"}</Text>
        <Text style={styles.subtitle}>Atur ruangan biar device dan sensor gampang ditemukan.</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Nama room</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Contoh: Teras" />

          <Text style={styles.label}>Area / lantai</Text>
          <TextInput style={styles.input} value={area} onChangeText={setArea} placeholder="Contoh: Luar rumah" />

          <Text style={styles.label}>Icon / kategori</Text>
          <TextInput style={styles.input} value={icon} onChangeText={setIcon} placeholder="Contoh: Jemuran" />
        </View>

        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.previewCard}>
          <View>
            <Text style={styles.previewTitle}>{name || "Room baru"}</Text>
            <Text style={styles.previewMeta}>{area || "Belum diatur"} - {icon || "Kategori"}</Text>
          </View>
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>Ready</Text>
          </View>
        </View>

        <AnimatedPressable style={styles.saveButton} onPress={() => navigation.goBack()}>
          <Text style={styles.saveText}>{isEdit ? "Simpan perubahan" : "Tambah room"}</Text>
        </AnimatedPressable>
        {isEdit && (
          <AnimatedPressable style={styles.deleteButton}>
            <Text style={styles.deleteText}>Hapus room</Text>
          </AnimatedPressable>
        )}
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
  subtitle: { color: "#64748B", fontSize: 13, marginTop: 5, marginBottom: 16, lineHeight: 18 },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 14,
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
  sectionTitle: { color: "#0A0F2C", fontSize: 18, fontWeight: "900", marginTop: 18, marginBottom: 10 },
  previewCard: {
    minHeight: 78,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  previewTitle: { color: "#0A0F2C", fontSize: 17, fontWeight: "900" },
  previewMeta: { color: "#64748B", fontSize: 12.5, marginTop: 5 },
  previewBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#00D4FF",
    backgroundColor: "#E6FAFF",
  },
  previewBadgeText: { color: "#036B82", fontSize: 12, fontWeight: "900" },
  saveButton: { height: 48, borderRadius: 9, backgroundColor: "#0A0F2C", alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  deleteButton: { height: 48, borderRadius: 9, borderWidth: 1, borderColor: "#FF5C7A", alignItems: "center", justifyContent: "center", marginTop: 10 },
  deleteText: { color: "#FF5C7A", fontSize: 14, fontWeight: "900" },
});

export default AddRoom;
