import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import * as SecureStore from "expo-secure-store";
import { postGraphQL } from "../../utils/api";
import { useTheme } from "../../theme";

const { width } = Dimensions.get("window");
const PAGE_PADDING = 22;
const CARD_GAP = 12;
const CARD_WIDTH = (width - PAGE_PADDING * 2 - CARD_GAP) / 2;

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffSecs = Math.floor((now - date) / 1000);
  if (diffSecs < 60) return "Just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
};

const RoomDetail = ({ route, navigation }) => {
  const { theme, mode } = useTheme();
  const { roomName: initialRoomName = "Room", roomId } = route.params || {};
  const [roomName, setRoomName] = useState(initialRoomName);
  const [roomDevices, setRoomDevices] = useState([]);
  const [activeDevices, setActiveDevices] = useState(0);
  const [roomSubtitle, setRoomSubtitle] = useState("-");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentRoomLogs, setRecentRoomLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchRoomAndDevices = async () => {
    if (!roomId) {
      setError("Room ID not found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("token");
      const homeId = await SecureStore.getItemAsync("activeHomeId");
      if (!token || !homeId) throw new Error("Auth failed");

      const response = await postGraphQL(
        {
          query: `
            query RoomDetailData {
              roomsByHomeBasic { _id name }
              devicesByRoom { _id name type status is_active category last_value createdAt }
              logsByHome { _id device_id value createdAt }
            }
          `,
        },
        { Authorization: `Bearer ${token}`, "x-home-id": homeId, "x-room-id": roomId }
      );
      
      const result = await response.json();
      const data = result.data || {};
      
      const selectedRoom = (data.roomsByHomeBasic || []).find(r => r._id === roomId);
      if (selectedRoom) setRoomName(selectedRoom.name);

      const devices = data.devicesByRoom || [];
      setRoomDevices(devices);
      setActiveDevices(devices.filter(d => d.is_active).length);
      setRoomSubtitle(`${devices.length} Devices • ${devices.filter(d => d.is_active).length} Active`);

      const deviceNames = {};
      devices.forEach(d => deviceNames[d._id] = d.name);
      
      const filteredLogs = (data.logsByHome || [])
        .filter(l => deviceNames[l.device_id])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      
      setRecentRoomLogs(filteredLogs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomAndDevices();
    const unsubscribe = navigation.addListener("focus", fetchRoomAndDevices);
    return unsubscribe;
  }, [navigation, roomId]);

  const getIcon = (cat) => {
    const map = { lamp: "💡", fan: "🌬️", ac: "❄️", security: "🛡️", sensor: "📡" };
    return map[cat?.toLowerCase()] || "📱";
  };

  const formatLogValue = (val) => {
    if (!val) return "No data";
    try {
      // Handle potential double stringification
      let parsed = typeof val === "string" ? JSON.parse(val) : val;
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      
      if (parsed.status) {
        const sensorType = (parsed.sensor || "").toLowerCase();
        if (sensorType === "fire" || sensorType === "water" || sensorType === "gas" || sensorType === "rain") {
          return `Status: ${parsed.status.toUpperCase()}`;
        }
        if (parsed.formatted && parsed.formatted !== "0 %") {
          return `${parsed.status.toUpperCase()} (${parsed.formatted})`;
        }
        return `Status: ${parsed.status.toUpperCase()}`;
      }

      if (typeof parsed !== 'object') {
        const s = String(parsed).toUpperCase();
        if (s === "1" || s === "ON" || s === "TRUE") return "Turned ON";
        if (s === "0" || s === "OFF" || s === "FALSE") return "Turned OFF";
        return s;
      }

      return "Device Updated";
    } catch {
      const s = String(val).toUpperCase();
      if (s === "1" || s === "ON") return "Turned ON";
      if (s === "0" || s === "OFF") return "Turned OFF";
      return s;
    }
  };

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <AnimatedPressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </AnimatedPressable>
          <View style={styles.headerActions}>
            <AnimatedPressable style={styles.iconBtn} onPress={() => navigation.navigate("AddRoom", { mode: "edit", roomName, roomId })}>
              <Text style={{fontSize: 16}}>⚙️</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.addBtn} onPress={() => navigation.navigate("AddDevice", { roomName, roomId })}>
              <Text style={styles.addBtnText}>+ Add Device</Text>
            </AnimatedPressable>
          </View>
        </View>

        <Text style={styles.title}>{roomName}</Text>
        <Text style={styles.subtitle}>{roomSubtitle}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{activeDevices}</Text>
            <Text style={styles.statLab}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{roomDevices.length}</Text>
            <Text style={styles.statLab}>Total</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Devices</Text>
        {loading ? (
          <Text style={styles.infoText}>Loading...</Text>
        ) : roomDevices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No devices in this room yet.</Text>
          </View>
        ) : (
          <FlatList
            data={roomDevices}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.cardRow}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <AnimatedPressable 
                style={styles.deviceCard} 
                onPress={() => navigation.navigate("DeviceControl", { deviceId: item._id, roomId })}
              >
                <View style={[styles.iconBox, item.is_active && styles.iconBoxActive]}>
                  <Text style={styles.emoji}>{getIcon(item.category)}</Text>
                </View>
                <Text style={styles.deviceName} numberOfLines={1}>{item.name}</Text>
                <View style={[styles.statusPill, !item.is_active && styles.statusPillOff]}>
                  <Text style={[styles.statusText, !item.is_active && styles.statusTextOff]}>
                    {item.is_active ? (item.status || "On") : "Off"}
                  </Text>
                </View>
              </AnimatedPressable>
            )}
          />
        )}

      </ScrollView>
      <BottomNav active="home" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 22, paddingBottom: 100 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  backBtnText: { fontSize: 20, fontWeight: "900", color: "#0A0F2C" },
  headerActions: { flexDirection: "row", gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  addBtn: { paddingHorizontal: 16, height: 40, borderRadius: 12, backgroundColor: "#7B61FF", alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  title: { fontSize: 32, fontWeight: "900", color: "#0A0F2C" },
  subtitle: { fontSize: 14, color: "#64748B", fontWeight: "600", marginTop: 4, marginBottom: 24 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: "#0A0F2C", borderRadius: 20, padding: 16 },
  statVal: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  statLab: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginTop: 2 },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: "#0A0F2C", marginBottom: 16, marginTop: 10 },
  cardRow: { justifyContent: "space-between", marginBottom: 12 },
  deviceCard: { width: CARD_WIDTH, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18, borderWidth: 1.5, borderColor: "#F1F5F9", shadowColor: "#0A0F2C", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  iconBoxActive: { backgroundColor: "#EEF2FF" },
  emoji: { fontSize: 22 },
  deviceName: { fontSize: 16, fontWeight: "900", color: "#0A0F2C", marginBottom: 8 },
  statusPill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: "#E6FAFF", borderWidth: 1.2, borderColor: "#00D4FF" },
  statusPillOff: { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" },
  statusText: { fontSize: 11, fontWeight: "900", color: "#036B82", textTransform: "uppercase" },
  statusTextOff: { color: "#64748B" },
  activityList: { gap: 10 },
  activityItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: "#F1F5F9" },
  activityIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", marginRight: 12 },
  activityName: { fontSize: 14, fontWeight: "800", color: "#0A0F2C" },
  activityValue: { fontSize: 12, color: "#64748B", fontWeight: "600", marginTop: 1 },
  activityTime: { fontSize: 11, color: "#94A3B8", fontWeight: "700" },
  infoText: { color: "#64748B", fontSize: 14, fontStyle: "italic" },
  emptyState: { padding: 40, alignItems: "center" },
  emptyText: { color: "#94A3B8", fontSize: 14, fontWeight: "600" },
});

export default RoomDetail;
