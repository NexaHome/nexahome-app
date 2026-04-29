import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, ActivityIndicator, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { postGraphQL } from "../../utils/api";

const DEVICE_TEMPLATES = [
  { id: "fire", name: "Fire Sensor", type: "sensor", category: "fire", antares_device_name: "Fire", status: "Safe" },
  { id: "gas", name: "Gas Sensor", type: "sensor", category: "gas", antares_device_name: "gas", status: "Normal" },
  { id: "water", name: "Water Sensor", type: "sensor", category: "water", antares_device_name: "water", status: "Low" },
  { id: "rain", name: "Rain Sensor", type: "sensor", category: "rain", antares_device_name: "rain", status: "Clear" },
  { id: "light", name: "Light Sensor", type: "sensor", category: "Light", antares_device_name: "light", status: "Bright" },
];

const AddDevice = ({ navigation, route }) => {
  const { roomName = "Room", roomId } = route.params || {};
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreateDevice = async () => {
    if (!selectedId) {
      setError("Please select a device type first");
      return;
    }
    
    const template = DEVICE_TEMPLATES.find(t => t.id === selectedId);
    
    try {
      setSaving(true);
      setError("");
      
      const token = await SecureStore.getItemAsync("token");
      const homeId = await SecureStore.getItemAsync("activeHomeId");
      
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
          "x-room-id": roomId,
        }
      );
      
      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      Alert.alert("Success", `Device ${template.name} registered successfully!`, [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      setError("Failed to register device: " + err.message);
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
        <Text style={styles.subtitle}>Register a new device to {roomName}.</Text>

        <Text style={styles.sectionTitle}>Select device type</Text>
        
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
                <Text style={styles.templateMeta}>Category: {item.category}</Text>
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
            <Text style={styles.saveText}>Register Device</Text>
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
  backText: { color: "#FF6B00", fontSize: 14, fontWeight: "900" },
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
  templateActive: { borderColor: "#FF6B00", backgroundColor: "#FFF4ED" },
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
  radioActive: { borderColor: "#FF6B00" },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#FF6B00" },
  saveButton: { height: 48, borderRadius: 9, backgroundColor: "#0A0F2C", alignItems: "center", justifyContent: "center", marginTop: 20 },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});

export default AddDevice;
