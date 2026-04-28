import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimatedPressable from "../src/components/AnimatedPressable";
import BottomNav from "../src/components/BottomNav";
import ScreenShell from "../src/components/ScreenShell";
import { postGraphQL } from "../utils/api";

const DEVICE_TEMPLATES = [
  { id: "fire", name: "Sensor Api", type: "sensor", category: "fire", antares_device_name: "Fire", status: "Safe" },
  { id: "gas", name: "Sensor Gas", type: "sensor", category: "gas", antares_device_name: "gas", status: "Normal" },
  { id: "water", name: "Sensor Air", type: "sensor", category: "water", antares_device_name: "water", status: "Low" },
  { id: "rain", name: "Sensor Hujan", type: "sensor", category: "rain", antares_device_name: "rain", status: "Clear" },
  { id: "light", name: "Sensor Cahaya", type: "sensor", category: "Light", antares_device_name: "light", status: "Bright" },
];

const AddDevice = ({ navigation, route }) => {
  const { roomName = "Room", roomId } = route.params || {};
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreateDevice = async () => {
    if (!selectedId) {
      setError("Pilih tipe perangkat terlebih dahulu");
      return;
    }
    
    const template = DEVICE_TEMPLATES.find(t => t.id === selectedId);
    
    try {
      setSaving(true);
      setError("");
      
      const token = await AsyncStorage.getItem("token");
      const homeId = await AsyncStorage.getItem("activeHomeId");
      
      const query = `
        mutation CreateDevice($createDeviceInput: CreateDeviceInput!) {
          createDevice(createDeviceInput: $createDeviceInput) {
            _id
            name
          }
        }
      `;
      
      const response = await postGraphQL(
        {
          query,
          variables: { 
            createDeviceInput: {
              name: template.name,
              type: template.type,
              status: template.status,
              category: template.category,
              antares_device_name: template.antares_device_name
            }
          },
        },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": homeId,
          "x-room-id": roomId, // Required by createDevice mutation
        }
      );
      
      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      Alert.alert("Sukses", `Perangkat ${template.name} berhasil didaftarkan!`, [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      setError("Gagal mendaftarkan perangkat: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </AnimatedPressable>
        <Text style={styles.title}>Register Device</Text>
        <Text style={styles.subtitle}>Daftarkan perangkat baru ke {roomName}.</Text>

        <Text style={styles.sectionTitle}>Pilih tipe perangkat</Text>
        
        {!!error && <Text style={{ color: "red", marginBottom: 10 }}>{error}</Text>}
        
        {DEVICE_TEMPLATES.map((item) => {
          const active = selectedId === item.id;
          return (
            <AnimatedPressable
              key={item.id}
              style={[styles.templateCard, active && styles.templateActive]}
              onPress={() => setSelectedId(item.id)}
            >
              <View>
                <Text style={styles.templateTitle}>{item.name}</Text>
                <Text style={styles.templateMeta}>Kategori: {item.category}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>
            </AnimatedPressable>
          );
        })}

        <AnimatedPressable
          style={[styles.saveButton, (!selectedId || saving) && { opacity: 0.6 }]}
          onPress={handleCreateDevice}
          disabled={!selectedId || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveText}>Daftarkan Perangkat</Text>
          )}
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
  saveButton: { height: 48, borderRadius: 9, backgroundColor: "#0A0F2C", alignItems: "center", justifyContent: "center", marginTop: 20 },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});

export default AddDevice;
