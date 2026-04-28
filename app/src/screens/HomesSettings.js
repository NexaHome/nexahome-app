import React, { useEffect, useState } from "react";
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

const HomesSettings = ({ navigation }) => {
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  
  // Join home state
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

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
        throw new Error(result.errors[0].message || "Gagal memuat homes");
      }

      setHomes(result.data?.homes || []);
    } catch (err) {
      Alert.alert("Error", err.message || "Gagal memuat homes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomes();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Nama home tidak boleh kosong");
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
          throw new Error(r.errors[0].message || "Gagal update home");
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
        throw new Error(r.errors[0].message || "Gagal membuat home");

      const newHomeId = r.data?.createHome?._id;
      if (newHomeId) {
        await SecureStore.setItemAsync("activeHomeId", newHomeId);
      }

      setName("");
      await loadHomes();
    } catch (err) {
      Alert.alert("Error", err.message || "Gagal menyimpan home");
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
    Alert.alert("Hapus home", `Hapus home \"${home.name}\"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
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
              throw new Error(r.errors[0].message || "Gagal menghapus home");

            // if deleted home was active, clear activeHomeId
            const activeHomeId = await SecureStore.getItemAsync("activeHomeId");
            if (activeHomeId === home._id) {
              await SecureStore.deleteItemAsync("activeHomeId");
            }

            await loadHomes();
          } catch (err) {
            Alert.alert("Error", err.message || "Gagal menghapus home");
          }
        },
      },
    ]);
  };
  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("Error", "Kode invite tidak boleh kosong");
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
        throw new Error(r.errors[0].message || "Gagal join home");
      }

      Alert.alert("Sukses", `Berhasil bergabung dengan ${r.data?.joinHomeByCode?.name}`);
      setInviteCode("");
      await loadHomes();
    } catch (err) {
      Alert.alert("Error", err.message || "Gagal join home");
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScreenShell>
      <View style={styles.container}>
        <Text style={styles.title}>Homes settings</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>
            {editingId ? "Edit home" : "Add home"}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nama home"
            style={styles.input}
            editable={!saving}
          />

          <View style={styles.formActions}>
            <AnimatedPressable
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>
                  {editingId ? "Update" : "Create"}
                </Text>
              )}
            </AnimatedPressable>
            {editingId && (
              <AnimatedPressable
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </AnimatedPressable>
            )}
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Join home via Code</Text>
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="Masukkan Invite Code (misal: A1B2C3)"
            style={styles.input}
            editable={!joining}
            autoCapitalize="characters"
          />

          <View style={styles.formActions}>
            <AnimatedPressable
              style={[styles.saveButton, joining && { opacity: 0.6 }]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Join Home</Text>
              )}
            </AnimatedPressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your homes</Text>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={homes}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.homeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.homeName}>{item.name}</Text>
                  <Text style={styles.homeMeta}>Invite Code: {item.invite_code || "-"}</Text>
                  <Text style={styles.homeMeta}>ID: {item._id}</Text>
                </View>
                <AnimatedPressable
                  style={styles.smallButton}
                  onPress={() => handleEdit(item)}
                >
                  <Text style={styles.smallButtonText}>Edit</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[
                    styles.smallButton,
                    { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" },
                  ]}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={[styles.smallButtonText, { color: "#9B1C1C" }]}>
                    Delete
                  </Text>
                </AnimatedPressable>
              </View>
            )}
          />
        )}
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0A0F2C",
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  label: { color: "#64748B", fontSize: 12, fontWeight: "700", marginBottom: 8 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#E6EEF6",
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
    fontWeight: "700",
  },
  formActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  saveButton: {
    height: 44,
    borderRadius: 9,
    backgroundColor: "#0A0F2C",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  saveText: { color: "#FFF", fontWeight: "900" },
  cancelButton: {
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  cancelText: { color: "#111827", fontWeight: "700" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0A0F2C",
    marginTop: 10,
    marginBottom: 8,
  },
  homeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E6EEF6",
    borderRadius: 10,
    marginBottom: 8,
  },
  homeName: { fontSize: 15, fontWeight: "900", color: "#0A0F2C" },
  homeMeta: { color: "#64748B", fontSize: 12 },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#EEF2FF",
    marginLeft: 8,
  },
  smallButtonText: { color: "#1E3A8A", fontWeight: "900" },
});

export default HomesSettings;
