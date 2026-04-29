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
      Alert.alert("Error", "Home name cannot be empty");
      return;
    }

    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert(
          "Error",
          "Login session not found. Please log in again.",
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
        throw new Error(result.errors[0].message || "Failed to create home");
      }

      if (result.data?.createHome) {
        const newHomeId = result.data.createHome._id;
        await SecureStore.setItemAsync("activeHomeId", newHomeId);

        Alert.alert("Success", "Home created successfully!", [
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
          Create a new home to manage your devices separately.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Home Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Example: Main Home, Villa"
            editable={!loading}
          />
        </View>

        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.previewCard}>
          <View>
            <Text style={styles.previewTitle}>{name || "New home"}</Text>
          </View>
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>New</Text>
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
            <Text style={styles.saveText}>Create New Home</Text>
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
    borderColor: "#FF6B00",
    backgroundColor: "#FFF4ED",
  },
  previewBadgeText: { color: "#B24B00", fontSize: 12, fontWeight: "900" },
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
