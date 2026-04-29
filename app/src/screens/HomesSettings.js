import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import AnimatedPressable from "../components/AnimatedPressable";
import ScreenShell from "../components/ScreenShell";
import { postGraphQL } from "../../utils/api";
import { useTheme } from "../../theme";

const RawView = ({ children, style }) => <View style={style}>{children}</View>;
RawView.skipThemeTransform = true;

const HomesSettings = ({ navigation }) => {
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Join home state
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  const { theme, mode } = useTheme();

  // Create dynamic styles based on theme
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { padding: 20, paddingBottom: 40 },
        title: {
          fontSize: 22,
          fontWeight: "900",
          color: theme.text,
          marginBottom: 12,
        },
        formCard: {
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        },
        label: {
          color: theme.textMuted,
          fontSize: 12,
          fontWeight: "700",
          marginBottom: 8,
        },
        input: {
          height: 44,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          paddingHorizontal: 10,
          backgroundColor: theme.surfaceMuted,
          fontWeight: "700",
          color: theme.text,
        },
        formActions: { flexDirection: "row", gap: 10, marginTop: 12 },
        saveButton: {
          height: 46,
          borderRadius: 12,
          backgroundColor: theme.secondary,
          borderWidth: 1,
          borderColor: theme.secondary,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          minWidth: 120,
        },
        saveText: {
          color: "#FFFFFF",
          fontWeight: "900",
          fontSize: 14,
          letterSpacing: 0.3,
        },
        cancelButton: {
          height: 46,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surfaceMuted,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          minWidth: 110,
        },
        cancelText: { color: theme.text, fontWeight: "700" },
        sectionTitle: {
          fontSize: 16,
          fontWeight: "900",
          color: theme.text,
          marginTop: 10,
          marginBottom: 8,
        },
        homeRow: {
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 10,
          marginBottom: 8,
        },
        homeName: { fontSize: 15, fontWeight: "900", color: theme.text },
        homeMeta: { color: theme.textMuted, fontSize: 12 },
        smallButton: {
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.secondary,
          backgroundColor: theme.secondarySoft,
          marginLeft: 8,
          minWidth: 62,
          alignItems: "center",
        },
        smallButtonText: {
          color: theme.secondary,
          fontWeight: "900",
          fontSize: 12,
          letterSpacing: 0.2,
        },
        dangerButton: {
          backgroundColor: theme.dangerSoft,
          borderColor: theme.danger,
        },
        dangerButtonText: {
          color: theme.danger,
        },
      }),
    [theme],
  );

  const loadHomes = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        navigation.replace("Login");
        return;
      }

      const response = await postGraphQL(
        {
          query: `query Homes { homes { _id name owner_id invite_code createdAt } }`,
        },
        { Authorization: `Bearer ${token}` },
      );

      const result = await response.json();
      if (result.errors?.length) {
        throw new Error(result.errors[0].message || "Failed to load homes");
      }

      setHomes(result.data?.homes || []);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to load homes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomes();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Home name cannot be empty");
      return;
    }

    try {
      setSaving(true);
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        navigation.replace("Login");
        return;
      }

      if (editingId) {
        const query = `
          mutation UpdateHome($id: String!, $updateHomeInput: UpdateHomeInput!) {
            updateHome(id: $id, updateHomeInput: $updateHomeInput) { _id name }
          }
        `;
        const variables = { id: editingId, updateHomeInput: { name } };
        const res = await postGraphQL(
          { query, variables },
          { Authorization: `Bearer ${token}` },
        );
        const r = await res.json();
        if (r.errors)
          throw new Error(r.errors[0].message || "Failed to update home");
        setEditingId(null);
        setName("");
        await loadHomes();
        return;
      }

      const query = `
        mutation CreateHome($createHomeInput: CreateHomeInput!) {
          createHome(createHomeInput: $createHomeInput) { _id name }
        }
      `;
      const variables = { createHomeInput: { name } };
      const res = await postGraphQL(
        { query, variables },
        { Authorization: `Bearer ${token}` },
      );
      const r = await res.json();
      if (r.errors)
        throw new Error(r.errors[0].message || "Failed to create home");

      const newHomeId = r.data?.createHome?._id;
      if (newHomeId) {
        await SecureStore.setItemAsync("activeHomeId", newHomeId);
      }

      setName("");
      await loadHomes();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save home");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (home) => {
    setEditingId(home._id);
    setName(home.name || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName("");
  };

  const handleDelete = (home) => {
    Alert.alert("Delete home", `Delete home "${home.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync("token");
            if (!token) {
              navigation.replace("Login");
              return;
            }

            const query = `mutation DeleteHome($id: String!) { deleteHome(id: $id) }`;
            const variables = { id: home._id };
            const res = await postGraphQL(
              { query, variables },
              { Authorization: `Bearer ${token}` },
            );
            const r = await res.json();
            if (r.errors)
              throw new Error(r.errors[0].message || "Failed to delete home");

            // if deleted home was active, clear activeHomeId
            const activeHomeId = await SecureStore.getItemAsync("activeHomeId");
            if (activeHomeId === home._id) {
              await SecureStore.deleteItemAsync("activeHomeId");
            }

            await loadHomes();
          } catch (err) {
            Alert.alert("Error", err.message || "Failed to delete home");
          }
        },
      },
    ]);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("Error", "Invite code cannot be empty");
      return;
    }

    try {
      setJoining(true);
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        navigation.replace("Login");
        return;
      }

      const query = `
        mutation JoinHome($inviteCode: String!) {
          joinHomeByCode(inviteCode: $inviteCode) { _id name }
        }
      `;
      const variables = { inviteCode: inviteCode.trim() };
      const res = await postGraphQL(
        { query, variables },
        { Authorization: `Bearer ${token}` },
      );

      const r = await res.json();
      if (r.errors) {
        throw new Error(r.errors[0].message || "Failed to join home");
      }

      Alert.alert(
        "Success",
        `Successfully joined ${r.data?.joinHomeByCode?.name}`,
      );
      setInviteCode("");
      await loadHomes();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to join home");
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScreenShell>
      <RawView style={dynamicStyles.container}>
        <Text style={dynamicStyles.title}>Homes settings</Text>

        <View style={dynamicStyles.formCard}>
          <Text style={dynamicStyles.label}>
            {editingId ? "Edit home" : "Add home"}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Home name"
            placeholderTextColor={theme.textSoft}
            style={dynamicStyles.input}
            selectionColor={theme.secondary}
            cursorColor={mode === "dark" ? "#F8FAFC" : theme.primary}
            keyboardAppearance={mode === "dark" ? "dark" : "light"}
            editable={!saving}
          />

          <View style={dynamicStyles.formActions}>
            <AnimatedPressable
              style={[dynamicStyles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator
                  color={mode === "dark" ? theme.primary : theme.surface}
                />
              ) : (
                <Text style={dynamicStyles.saveText}>
                  {editingId ? "Update" : "Create"}
                </Text>
              )}
            </AnimatedPressable>
            {editingId && (
              <AnimatedPressable
                style={dynamicStyles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={dynamicStyles.cancelText}>Cancel</Text>
              </AnimatedPressable>
            )}
          </View>
        </View>

        <View style={dynamicStyles.formCard}>
          <Text style={dynamicStyles.label}>Join home via Code</Text>
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="Enter Invite Code (e.g. A1B2C3)"
            placeholderTextColor={theme.textSoft}
            style={dynamicStyles.input}
            selectionColor={theme.secondary}
            cursorColor={mode === "dark" ? "#F8FAFC" : theme.primary}
            keyboardAppearance={mode === "dark" ? "dark" : "light"}
            editable={!joining}
            autoCapitalize="characters"
          />

          <View style={dynamicStyles.formActions}>
            <AnimatedPressable
              style={[dynamicStyles.saveButton, joining && { opacity: 0.6 }]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator
                  color={mode === "dark" ? theme.primary : theme.surface}
                />
              ) : (
                <Text style={dynamicStyles.saveText}>Join Home</Text>
              )}
            </AnimatedPressable>
          </View>
        </View>

        <Text style={dynamicStyles.sectionTitle}>Your homes</Text>
        {loading ? (
          <ActivityIndicator color={theme.secondary} />
        ) : (
          <FlatList
            data={homes}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={dynamicStyles.homeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={dynamicStyles.homeName}>{item.name}</Text>
                  <Text style={dynamicStyles.homeMeta}>
                    Invite Code: {item.invite_code || "-"}
                  </Text>
                </View>
                <AnimatedPressable
                  style={dynamicStyles.smallButton}
                  onPress={() => handleEdit(item)}
                >
                  <Text style={dynamicStyles.smallButtonText}>Edit</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[
                    dynamicStyles.smallButton,
                    dynamicStyles.dangerButton,
                  ]}
                  onPress={() => handleDelete(item)}
                >
                  <Text
                    style={[
                      dynamicStyles.smallButtonText,
                      dynamicStyles.dangerButtonText,
                    ]}
                  >
                    Delete
                  </Text>
                </AnimatedPressable>
              </View>
            )}
          />
        )}
      </RawView>
    </ScreenShell>
  );
};

export default HomesSettings;
