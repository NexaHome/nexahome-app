import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { postGraphQL } from "../../utils/api";

const AddRoom = ({ navigation, route }) => {
  const isEdit = route.params?.mode === "edit";
  const [name, setName] = useState(route.params?.roomName || "Living Room");
  const [area, setArea] = useState("Main Floor");
  const [icon, setIcon] = useState("Sofa");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Room name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        throw new Error("Token not found, please log in again.");
      }

      const homeId = await SecureStore.getItemAsync("activeHomeId");
      if (!homeId) {
        throw new Error("Active home not found.");
      }

      const mutation = isEdit
        ? `
          mutation UpdateRoom($id: String!, $updateRoomInput: UpdateRoomInput!) {
            updateRoom(id: $id, updateRoomInput: $updateRoomInput) {
              _id
              name
            }
          }
        `
        : `
          mutation CreateRoom($createRoomInput: CreateRoomInput!) {
            createRoom(createRoomInput: $createRoomInput) {
              _id
              name
            }
          }
        `;

      const variables = isEdit
        ? { id: route.params?.roomId, updateRoomInput: { name: name.trim() } }
        : { createRoomInput: { name: name.trim() } };

      const response = await postGraphQL(
        {
          query: mutation,
          variables,
        },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": homeId,
        },
      );

      const result = await response.json();
      if (!response.ok || result.errors?.length) {
        throw new Error(result.errors?.[0]?.message || "Failed to save room");
      }

      navigation.goBack();
    } catch (saveError) {
      setError(saveError.message || "An error occurred");
    } finally {
      setSaving(false);
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
        <Text style={styles.title}>{isEdit ? "Edit room" : "Add room"}</Text>
        <Text style={styles.subtitle}>
          Organize rooms to make devices and sensors easier to find.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Room name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Example: Living Room"
          />

          <Text style={styles.label}>Area / Floor</Text>
          <TextInput
            style={styles.input}
            value={area}
            onChangeText={setArea}
            placeholder="Example: Upstairs"
          />

          <Text style={styles.label}>Icon / Category</Text>
          <TextInput
            style={styles.input}
            value={icon}
            onChangeText={setIcon}
            placeholder="Example: Kitchen"
          />
        </View>

        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.previewCard}>
          <View>
            <Text style={styles.previewTitle}>{name || "New Room"}</Text>
            <Text style={styles.previewMeta}>
              {area || "Not set"} - {icon || "Category"}
            </Text>
          </View>
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>Ready</Text>
          </View>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <AnimatedPressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>
              {isEdit ? "Save Changes" : "Add Room"}
            </Text>
          )}
        </AnimatedPressable>
        {isEdit && (
          <AnimatedPressable style={styles.deleteButton}>
            <Text style={styles.deleteText}>Delete Room</Text>
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
  saveButtonDisabled: { opacity: 0.7 },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  errorText: {
    color: "#FF5C7A",
    fontSize: 12,
    marginBottom: 10,
    fontWeight: "800",
  },
  deleteButton: {
    height: 48,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#FF5C7A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  deleteText: { color: "#FF5C7A", fontSize: 14, fontWeight: "900" },
});

export default AddRoom;
