import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import * as SecureStore from "expo-secure-store";
import { postGraphQL } from "../../utils/api";

const { width } = Dimensions.get("window");
const PAGE_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = (width - PAGE_PADDING * 2 - CARD_GAP) / 2;

// Format tanggal ke format user-friendly
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  if (diffWeeks < 4) return `${diffWeeks} minggu lalu`;
  if (diffMonths < 12) return `${diffMonths} bulan lalu`;
  return `${diffYears} tahun lalu`;
};

const RoomDetail = ({ route, navigation }) => {
  const { roomName: initialRoomName = "Room", roomId } = route.params || {};
  const [roomName, setRoomName] = useState(initialRoomName);
  const [roomDevices, setRoomDevices] = useState([]);
  const [activeDevices, setActiveDevices] = useState(0);
  const [roomSubtitle, setRoomSubtitle] = useState("-");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [creatingDevice, setCreatingDevice] = useState(false);
  const [createError, setCreateError] = useState("");
  const [homeLogs, setHomeLogs] = useState([]);
  const [recentRoomLogs, setRecentRoomLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [showAllLogs, setShowAllLogs] = useState(false);

  const fetchRoomAndDevices = async () => {
    if (!roomId) {
      setError("Room ID tidak ditemukan.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        throw new Error("Token tidak ditemukan, silakan login ulang.");
      }

      const homeId = await SecureStore.getItemAsync("activeHomeId");
      if (!homeId) {
        throw new Error("Home aktif tidak ditemukan.");
      }

      const roomQuery = `
        query RoomSummaries {
          roomsByHomeBasic {
            _id
            name
          }
        }
      `;

      const roomResponse = await postGraphQL(
        {
          query: roomQuery,
        },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": homeId,
        },
      );
      const roomResult = await roomResponse.json();

      if (!roomResponse.ok || roomResult.errors) {
        throw new Error(
          roomResult.errors?.[0]?.message || "Gagal mengambil detail room",
        );
      }

      const rooms = roomResult.data?.roomsByHomeBasic || [];
      const selectedRoom = rooms.find((item) => item._id === roomId);

      if (!selectedRoom) {
        throw new Error("Room tidak ditemukan di server");
      }

      const deviceQuery = `
        query DevicesByRoom {
          devicesByRoom {
            _id
            name
            type
            status
            is_active
            category
            antares_device_name
            last_value
            createdAt
            room_id
          }
        }
      `;

      const deviceResponse = await postGraphQL(
        {
          query: deviceQuery,
        },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": homeId,
          "x-room-id": roomId,
        },
      );
      const deviceResult = await deviceResponse.json();

      if (!deviceResponse.ok || deviceResult.errors) {
        throw new Error(
          deviceResult.errors?.[0]?.message || "Gagal mengambil device",
        );
      }

      const devices = deviceResult.data?.devicesByRoom || [];
      const activeCount = devices.filter((device) => device.is_active).length;

      setRoomName(selectedRoom.name || initialRoomName);
      setActiveDevices(activeCount);
      setRoomSubtitle(`${devices.length} device`);
      setRoomDevices(devices);
      // fetch logs for the home and compute recent logs for this room
      try {
        setLogsLoading(true);
        setLogsError("");

        const logsQuery = `
          query LogsByHome {
            logsByHome {
              _id
              device_id
              value
              createdAt
            }
          }
        `;

        const logsResponse = await postGraphQL(
          { query: logsQuery },
          { Authorization: `Bearer ${token}`, "x-home-id": homeId },
        );
        const logsResult = await logsResponse.json();

        if (!logsResponse.ok || logsResult.errors) {
          throw new Error(
            logsResult.errors?.[0]?.message || "Gagal memuat logs",
          );
        }

        const allLogs = logsResult.data?.logsByHome || [];
        setHomeLogs(allLogs);

        // map device id to name for friendly display
        const deviceNameById = {};
        devices.forEach((d) => (deviceNameById[d._id] = d.name));

        // filter logs for devices in this room and sort desc by createdAt
        const roomFiltered = allLogs
          .filter((l) => deviceNameById[l.device_id])
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setRecentRoomLogs(roomFiltered.slice(0, 3));
      } catch (logErr) {
        setLogsError(logErr.message || "Gagal memuat logs");
        setHomeLogs([]);
        setRecentRoomLogs([]);
      } finally {
        setLogsLoading(false);
      }
    } catch (fetchError) {
      setError(fetchError.message || "Terjadi kesalahan");
      setRoomDevices([]);
    } finally {
      setLoading(false);
    }
  };

  // Create Device logic moved to AddDevice.js screen

  useEffect(() => {
    fetchRoomAndDevices();
  }, [roomId, initialRoomName]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchRoomAndDevices();
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <ScreenShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <AnimatedPressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>Back</Text>
          </AnimatedPressable>
          <View style={styles.topActions}>
            <AnimatedPressable
              style={styles.editButton}
              onPress={() =>
                navigation.navigate("AddRoom", {
                  mode: "edit",
                  roomName,
                  roomId,
                })
              }
            >
              <Text style={styles.editText}>Edit</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.addButton}
              onPress={() =>
                navigation.navigate("AddDevice", { roomName, roomId })
              }
            >
              <Text style={styles.addText}>+ Add</Text>
            </AnimatedPressable>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {roomName}
        </Text>
        <Text style={styles.subtitle}>{roomSubtitle}</Text>

        {loading && <Text style={styles.infoText}>Loading room data...</Text>}
        {!loading && !!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.deviceCardSingle}>
          <Text style={styles.deviceName}>Active devices</Text>
          <Text style={styles.deviceDetail}>{activeDevices} device aktif</Text>
          {!loading && !roomDevices.length && !error && (
            <Text style={styles.infoText}>Belum ada device di room ini.</Text>
          )}
        </View>

        {!!roomDevices.length && (
          <FlatList
            data={roomDevices}
            numColumns={2}
            keyExtractor={(item) => item._id}
            columnWrapperStyle={styles.cardRow}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const isActive = !!item.is_active;
              const statusText = item.status || (isActive ? "Active" : "Off");
              const subtitle = item.category || item.type || "Device";

              return (
                <AnimatedPressable
                  style={styles.deviceCard}
                  onPress={() =>
                    navigation.navigate("DeviceControl", {
                      deviceId: item._id,
                      roomId,
                    })
                  }
                >
                  <Text style={styles.deviceName} numberOfLines={2}>
                    {item.name || "Device"}
                  </Text>
                  <View
                    style={[styles.statePill, !isActive && styles.statePillOff]}
                  >
                    <Text
                      style={[
                        styles.stateText,
                        !isActive && styles.stateTextOff,
                      ]}
                    >
                      {statusText}
                    </Text>
                  </View>
                </AnimatedPressable>
              );
            }}
          />
        )}

        {/* Inline Add Device form has been removed in favor of AddDevice.js template screen */}

        <Text style={styles.sectionTitle}>Recent activity</Text>
        {logsLoading && (
          <Text style={styles.infoText}>Loading recent activity...</Text>
        )}
        {!logsLoading && !!logsError && (
          <Text style={styles.errorText}>{logsError}</Text>
        )}
        {!logsLoading && !logsError && (
          <View style={styles.activityList}>
            {recentRoomLogs.length === 0 && (
              <Text style={styles.infoText}>
                Belum ada aktivitas terbaru di room ini.
              </Text>
            )}
            {recentRoomLogs.map((log) => {
              const deviceNameMap = {};
              roomDevices.forEach((d) => (deviceNameMap[d._id] = d.name));
              const name = deviceNameMap[log.device_id] || log.device_id;
              return (
                <View key={log._id} style={styles.activityItem}>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{name}</Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {formatDate(log.createdAt)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <AnimatedPressable
          style={styles.logButton}
          onPress={() => setShowAllLogs((v) => !v)}
        >
          <Text style={styles.logText}>
            {showAllLogs ? "Hide all logs" : "View all logs"}
          </Text>
        </AnimatedPressable>

        {showAllLogs && (
          <View style={styles.logCard}>
            <Text style={styles.logTitle}>All logs</Text>
            {logsLoading && (
              <Text style={styles.infoText}>Loading logs...</Text>
            )}
            {!logsLoading && !!logsError && (
              <Text style={styles.errorText}>{logsError}</Text>
            )}
            {!logsLoading && !logsError && homeLogs.length === 0 && (
              <Text style={styles.infoText}>Belum ada logs di home ini.</Text>
            )}
            {!logsLoading && !logsError && homeLogs.length > 0 && (
              <View>
                {homeLogs.map((log) => {
                  const deviceNameMap = {};
                  roomDevices.forEach((d) => (deviceNameMap[d._id] = d.name));
                  const name = deviceNameMap[log.device_id] || log.device_id;
                  return (
                    <View key={log._id} style={styles.logItem}>
                      <View style={styles.logContent}>
                        <Text style={styles.logName}>{name}</Text>
                        <Text style={styles.logValue}>{log.value}</Text>
                      </View>
                      <Text style={styles.logTime}>
                        {formatDate(log.createdAt)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <BottomNav active="home" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: PAGE_PADDING,
    paddingBottom: 26,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  backButton: {
    paddingVertical: 10,
    paddingRight: 18,
  },
  backText: {
    color: "#7B61FF",
    fontSize: 16,
    fontWeight: "900",
  },
  addButton: {
    backgroundColor: "#0A0F2C",
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderRadius: 9,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  editText: {
    color: "#0A0F2C",
    fontSize: 13,
    fontWeight: "900",
  },
  addText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  title: {
    fontSize: 29,
    fontWeight: "900",
    color: "#0A0F2C",
    letterSpacing: 0,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 15,
    marginTop: 5,
    marginBottom: 20,
  },
  infoText: {
    color: "#64748B",
    fontSize: 14,
    marginBottom: 14,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    marginBottom: 14,
  },
  cardRow: {
    justifyContent: "space-between",
    marginBottom: CARD_GAP,
  },
  deviceCardSingle: {
    width: "100%",
    minHeight: 130,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 14,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  deviceCard: {
    width: CARD_WIDTH,
    minHeight: 154,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 14,
    justifyContent: "space-between",
  },
  formCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 14,
  },
  formTitle: {
    color: "#0A0F2C",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
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
  primaryButton: {
    height: 46,
    borderRadius: 9,
    backgroundColor: "#0A0F2C",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  deviceName: {
    color: "#0A0F2C",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  deviceDetail: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 8,
  },
  statePill: {
    alignSelf: "flex-start",
    minWidth: 70,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#00D4FF",
    backgroundColor: "#E6FAFF",
    paddingHorizontal: 10,
  },
  statePillOff: {
    borderColor: "#D8DEE9",
    backgroundColor: "#F8FAFC",
  },
  stateText: {
    color: "#036B82",
    fontSize: 13,
    fontWeight: "900",
  },
  stateTextOff: {
    color: "#64748B",
  },
  controlText: {
    color: "#7B61FF",
    marginTop: 10,
    fontSize: 13,
    fontWeight: "900",
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 10,
    fontSize: 20,
    fontWeight: "900",
    color: "#0A0F2C",
  },
  activityList: {
    marginTop: 2,
  },
  activityItem: {
    minHeight: 50,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityContent: {
    flex: 1,
    marginRight: 8,
  },
  activityTitle: {
    color: "#0A0F2C",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  activityStatus: {
    color: "#7B61FF",
    fontSize: 12,
    fontWeight: "600",
  },
  activityTime: {
    color: "#94A3B8",
    fontSize: 11,
  },
  logButton: {
    alignItems: "center",
    paddingVertical: 14,
  },
  logText: {
    color: "#7B61FF",
    fontSize: 13,
    fontWeight: "900",
  },
  logCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 10,
    padding: 14,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0A0F2C",
    marginBottom: 12,
  },
  logItem: {
    minHeight: 50,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logContent: {
    flex: 1,
    marginRight: 8,
  },
  logName: {
    color: "#0A0F2C",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  logValue: {
    color: "#7B61FF",
    fontSize: 12,
    fontWeight: "600",
  },
  logTime: {
    color: "#94A3B8",
    fontSize: 11,
  },
});

export default RoomDetail;
