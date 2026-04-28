import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { postGraphQL } from "../utils/api";

const AddRoom = ({ navigation, route }) => {
  const isEdit = route.params?.mode === "edit";
  const roomId = route.params?.roomId;
  
  const [name, setName] = useState(route.params?.roomName || "");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Nama ruangan tidak boleh kosong");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const activeHomeId = await AsyncStorage.getItem("activeHomeId");
      
      let query, variables;

      if (isEdit) {
        query = `
          mutation UpdateRoom($id: String!, $updateRoomInput: UpdateRoomInput!) {
            updateRoom(id: $id, updateRoomInput: $updateRoomInput) {
              _id
              name
            }
          }
        `;
        variables = {
          id: roomId,
          updateRoomInput: { name }
        };
      } else {
        query = `
          mutation CreateRoom($createRoomInput: CreateRoomInput!) {
            createRoom(createRoomInput: $createRoomInput) {
              _id
              name
            }
          }
        `;
        variables = {
          createRoomInput: { name }
        };
      }

      const response = await postGraphQL(
        { query, variables },
        { 
          Authorization: `Bearer ${token}`,
          'x-home-id': activeHomeId
        }
      );
      
      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message || "Gagal menyimpan ruangan");
      }
      
      Alert.alert("Sukses", `Ruangan berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}!`, [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Konfirmasi Hapus",
      "Apakah Anda yakin ingin menghapus ruangan ini?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Hapus", 
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              const token = await AsyncStorage.getItem("token");
              
              const query = `
                mutation DeleteRoom($id: String!) {
                  deleteRoom(id: $id)
                }
              `;
              
              const response = await postGraphQL(
                { query, variables: { id: roomId } },
                { Authorization: `Bearer ${token}` }
              );
              
              const result = await response.json();
              if (result.errors) {
                throw new Error(result.errors[0].message || "Gagal menghapus ruangan");
              }
              
              Alert.alert("Sukses", "Ruangan berhasil dihapus!", [
                { text: "OK", onPress: () => navigation.replace("Dashboard") }
              ]);
            } catch (error) {
              Alert.alert("Error", error.message);
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

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
          <TextInput 
            style={styles.input} 
            value={name} 
            onChangeText={setName} 
            placeholder="Contoh: Teras, Dapur, Ruang Tamu" 
            editable={!loading && !deleting}
          />
        </View>

        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.previewCard}>
          <View>
            <Text style={styles.previewTitle}>{name || "Room baru"}</Text>
          </View>
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>{isEdit ? "Tersimpan" : "Baru"}</Text>
          </View>
        </View>

        <AnimatedPressable 
          style={[styles.saveButton, (loading || deleting) && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={loading || deleting}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveText}>{isEdit ? "Simpan perubahan" : "Tambah room"}</Text>
          )}
        </AnimatedPressable>
        
        {isEdit && (
          <AnimatedPressable 
            style={[styles.deleteButton, (loading || deleting) && { opacity: 0.7 }]} 
            onPress={handleDelete}
            disabled={loading || deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#FF5C7A" size="small" />
            ) : (
              <Text style={styles.deleteText}>Hapus room</Text>
            )}
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
