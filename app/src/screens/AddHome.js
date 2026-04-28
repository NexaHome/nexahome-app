import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { postGraphQL } from "../../utils/api";

const AddHome = ({ navigation }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateHome = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Nama home tidak boleh kosong");
      return;
    }

    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert(
          "Error",
          "Sesi login tidak ditemukan. Silakan login ulang.",
        );
        navigation.replace("Login");
        return;
      }

      const query = `
        mutation CreateHome($createHomeInput: CreateHomeInput!) {
          createHome(createHomeInput: $createHomeInput) {
            _id
            name
          }
        }
      `;

      const variables = {
        createHomeInput: { name },
      };

      const response = await postGraphQL(
        { query, variables },
        { Authorization: `Bearer ${token}` },
      );

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message || "Gagal membuat home");
      }

      if (result.data?.createHome) {
        const newHomeId = result.data.createHome._id;
        await SecureStore.setItemAsync("activeHomeId", newHomeId);

        Alert.alert("Sukses", "Home berhasil dibuat!", [
          { text: "OK", onPress: () => navigation.replace("Dashboard") },
        ]);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AnimatedPressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Back</Text>
        </AnimatedPressable>
        <Text style={styles.title}>Add Home</Text>
        <Text style={styles.subtitle}>
          Buat rumah baru untuk mengelola device Anda secara terpisah.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Nama Home</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Rumah Utama, Villa"
            editable={!loading}
          />
        </View>

        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.previewCard}>
          <View>
            <Text style={styles.previewTitle}>{name || "Home baru"}</Text>
          </View>
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>Baru</Text>
          </View>
        </View>

        <AnimatedPressable
          style={[styles.saveButton, loading && { opacity: 0.7 }]}
          onPress={handleCreateHome}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveText}>Buat Home Baru</Text>
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
  title: {
    color: "#0A0F2C",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 4,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 5,
    marginBottom: 16,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 14,
  },
  label: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 7,
    marginTop: 8,
  },
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
  sectionTitle: {
    color: "#0A0F2C",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 10,
  },
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
  saveButton: {
    height: 48,
    borderRadius: 9,
    backgroundColor: "#0A0F2C",
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});

export default AddHome;
