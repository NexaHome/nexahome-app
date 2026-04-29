import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { useTheme } from "../../theme";
import { postGraphQL } from "../../utils/api";

const { width } = Dimensions.get("window");
const PAGE_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = (width - PAGE_PADDING * 2 - CARD_GAP) / 2;

const Dashboard = ({ navigation }) => {
  const { mode, toggleMode } = useTheme();
  const [user, setUser] = useState({ name: "User", email: "" });
  const [homes, setHomes] = useState([]);
  const [roomItems, setRoomItems] = useState([
    { roomId: "add", name: "+ Add room", isAdd: true },
  ]);
  const [summary, setSummary] = useState({
    roomsCount: 0,
    activeDevicesCount: 0,
    homeStatus: "No Home",
    homeName: "Main Home",
  });
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomError, setRoomError] = useState("");
  const [selectedHomeIdState, setSelectedHomeIdState] = useState(null);
  const [homeResultRaw, setHomeResultRaw] = useState(null);

  const loadRoomsForHome = async (token, homeId) => {
    const dashboardQuery = `
      query DashboardData {
        home {
          _id
          name
        }
        roomsByHomeBasic {
          _id
          name
        }
        devicesByHome {
          _id
          name
          type
          is_active
          status
          last_value
        }
      }
    `;

    const response = await postGraphQL(
      { query: dashboardQuery },
      {
        Authorization: `Bearer ${token}`,
        "x-home-id": homeId,
      },
    );

    const result = await response.json();
    const data = result?.data || {};

    if (result?.errors?.length) {
      const message = result.errors[0]?.message || "Failed to load dashboard data";
      if (!message.toLowerCase().includes("home not found")) {
        setRoomError(message);
      }
    }

    // Set Rooms
    if (data.roomsByHomeBasic?.length) {
      setRoomItems([
        ...data.roomsByHomeBasic.map((room) => ({
          roomId: room._id,
          name: room.name,
          isAdd: false,
        })),
        { roomId: "add", name: "+ Add room", isAdd: true },
      ]);
    } else {
      setRoomItems([{ roomId: "add", name: "+ Add room", isAdd: true }]);
    }

    // Process Devices and Sensors
    const SENSOR_ICONS = {
      fire: "🔥",
      gas: "💨",
      water: "💧",
      rain: "🌧️",
      light: "💡",
      motion: "🏃",
      temperature: "🌡️",
      humidity: "💧",
    };

    const allDevices = data.devicesByHome || [];
    const activeCount = allDevices.filter((d) => d.is_active).length;
    const sensorsOnly = allDevices
      .filter((d) => d.type === "sensor")
      .map((s) => {
        let valObj = {};
        if (s.last_value) {
          try {
            valObj = JSON.parse(s.last_value);
          } catch (e) {}
        }

        const isAmber =
          s.status &&
          s.status !== "Safe" &&
          s.status !== "Normal" &&
          s.status !== "Clear";

        const category = (s.category || "").toLowerCase();

        return {
          id: s._id,
          label: s.name,
          icon: SENSOR_ICONS[category] || "📡",
          value: valObj.formatted || valObj.value || "-",
          state: s.status || "Normal",
          tone: isAmber ? "amber" : "green",
        };
      });

    const homeData = data.home;
    const roomsCount = data.roomsByHomeBasic?.length ?? 0;

    if (homeData) {
      setSummary({
        roomsCount,
        activeDevicesCount: activeCount,
        homeStatus: "Online",
        homeName: homeData.name,
      });
      // We can use a local state for sensors or use the summary object. 
      // For now, let's keep it simple and use the summary or a new state.
      // I'll add a state for sensors below.
      setRealSensors(sensorsOnly);
    } else {
      setSummary({
        roomsCount: 0,
        activeDevicesCount: 0,
        homeStatus: "No Home",
        homeName: "Main Home",
      });
      setRealSensors([]);
    }
  };

  const [realSensors, setRealSensors] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadDashboard();
    });

    return unsubscribe;
  }, [navigation]);

  const loadDashboard = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        navigation.replace("Login");
        return;
      }

      const meResponse = await postGraphQL(
        {
          query: `
            query {
              me {
                name
                email
              }
            }
          `,
        },
        {
          Authorization: `Bearer ${token}`,
        },
      );

      const meResult = await meResponse.json();

      if (meResult?.data?.me) {
        setUser({
          name: meResult.data.me.name || "User",
          email: meResult.data.me.email || "",
        });
      }

      setLoadingRooms(true);
      setRoomError("");

      const homesResponse = await postGraphQL(
        {
          query: `
            query {
              homes {
                _id
                name
              }
            }
          `,
        },
        {
          Authorization: `Bearer ${token}`,
        },
      );

      const homesResult = await homesResponse.json();

      if (homesResult?.errors?.length) {
        const homesMessage =
          homesResult.errors[0]?.message || "Failed to load home list";
        throw new Error(homesMessage);
      }

      const homes = homesResult?.data?.homes || [];
      setHomes(homes);

      if (homes.length === 0) {
        setSelectedHomeIdState(null);
        setRoomItems([{ roomId: "add", name: "+ Add room", isAdd: true }]);
        setSummary({
          roomsCount: 0,
          activeDevicesCount: 0,
          homeStatus: "No Home",
          homeName: "Rumah Utama",
        });
        setRoomError("");
        return;
      }

      const savedHomeId = await SecureStore.getItemAsync("activeHomeId");
      const selectedHomeId =
        homes.find((home) => home._id === savedHomeId)?._id ||
        homes[0]?._id ||
        null;

      setSelectedHomeIdState(selectedHomeId);

      if (!selectedHomeId) {
        setRoomItems([{ roomId: "add", name: "+ Add room", isAdd: true }]);
        setSummary({
          roomsCount: 0,
          activeDevicesCount: 0,
          homeStatus: "No Home",
          homeName: "Rumah Utama",
        });
        setRoomError("");
        return;
      }

      await SecureStore.setItemAsync("activeHomeId", selectedHomeId);
      await loadRoomsForHome(token, selectedHomeId);
    } catch (error) {
      console.log("DASHBOARD ERROR:", error);
      setRoomError(
        error?.message?.toLowerCase().includes("home")
          ? ""
          : "Failed to load dashboard data",
      );
      setRoomItems([{ roomId: "add", name: "+ Add room", isAdd: true }]);
      setSummary({
        roomsCount: 0,
        activeDevicesCount: 0,
        homeStatus: "No Home",
        homeName: "Rumah Utama",
      });
    } finally {
      setLoadingRooms(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "NH";

  const handleSelectHome = async (homeId) => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        navigation.replace("Login");
        return;
      }

      setLoadingRooms(true);
      setRoomError("");
      setSelectedHomeIdState(homeId);
      await SecureStore.setItemAsync("activeHomeId", homeId);
      await loadRoomsForHome(token, homeId);
    } catch (error) {
      setRoomError(error?.message || "Failed to load home");
    } finally {
      setLoadingRooms(false);
    }
  };

  return (
    <ScreenShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modeRow}>
          <AnimatedPressable style={styles.modeButton} onPress={toggleMode}>
            <Text style={styles.modeText}>
              {mode === "dark" ? "Light" : "Dark"}
            </Text>
          </AnimatedPressable>
        </View>

        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.name} numberOfLines={1}>
              {user.name}
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        <View style={styles.homeCard}>
          <View style={styles.homeCopy}>
            <Text style={styles.homeTitle}>{summary.homeName}</Text>
            <Text style={styles.muted}>
              {summary.roomsCount} rooms - {summary.activeDevicesCount} devices
              active
            </Text>
          </View>
          <View style={styles.onlinePill}>
            <Text style={styles.onlineText}>{summary.homeStatus}</Text>
          </View>
        </View>

        <AnimatedPressable
          style={styles.addHomeButton}
          onPress={() => navigation.navigate("HomesSettings")}
        >
          <Text style={styles.addHomeButtonText}>Settings</Text>
        </AnimatedPressable>

        {homes.length > 1 && (
          <View style={styles.homeSelectorWrap}>
            <Text style={styles.selectorLabel}>Select home</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {homes.map((home) => {
                const isActive = home._id === selectedHomeIdState;
                return (
                  <AnimatedPressable
                    key={home._id}
                    style={[styles.homeChip, isActive && styles.homeChipActive]}
                    onPress={() => handleSelectHome(home._id)}
                  >
                    <Text
                      style={[
                        styles.homeChipText,
                        isActive && styles.homeChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {home.name}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* AI Insights Card */}
        <AnimatedPressable
          style={styles.aiCard}
          onPress={() => navigation.navigate("AIRecommendations")}
        >
          <View style={styles.aiCardRow}>
            <View style={styles.aiIconBox}>
              <Text style={{ fontSize: 20 }}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>AI Insights</Text>
              <Text style={styles.aiDesc}>
                Get smart recommendations from sensor data
              </Text>
            </View>
            <Text style={styles.aiArrow}>→</Text>
          </View>
        </AnimatedPressable>

        <Text style={styles.sectionTitle}>Rooms</Text>

        {loadingRooms ? (
          <Text style={styles.loadingText}>Loading rooms from server...</Text>
        ) : (
          <>
            {!!roomError && <Text style={styles.errorText}>{roomError}</Text>}

            <FlatList
              data={roomItems}
              scrollEnabled={false}
              numColumns={2}
              columnWrapperStyle={styles.cardRow}
              keyExtractor={(item) => item.roomId || item.id}
              renderItem={({ item }) => {
                if (item.isAdd) {
                  return (
                    <AnimatedPressable
                      style={[styles.roomCard, styles.addRoomCard]}
                      onPress={() => navigation.navigate("AddRoom")}
                    >
                      <Text style={styles.addRoomText}>+ Add room</Text>
                    </AnimatedPressable>
                  );
                }

                return (
                  <AnimatedPressable
                    style={styles.roomCard}
                    onPress={() =>
                      navigation.navigate("RoomDetail", {
                        roomId: item.roomId || item.id,
                        roomName: item.name,
                      })
                    }
                  >
                    <View>
                      <Text style={styles.roomName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.muted} numberOfLines={1}>
                        Room
                      </Text>
                    </View>
                    <View style={styles.roomMeta}>
                      <Text style={styles.roomCount}>Open</Text>
                      <View style={styles.openButton}>
                        <Text style={styles.openButtonText}>Open</Text>
                      </View>
                    </View>
                  </AnimatedPressable>
                );
              }}
            />
          </>
        )}

        {/* <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actions}>
          {["All on", "All off", "Away mode"].map((action) => (
            <AnimatedPressable key={action} style={styles.actionButton}>
              <Text style={styles.actionText} numberOfLines={1}>
                {action}
              </Text>
            </AnimatedPressable>
          ))}
        </View> */}

        {/* <Text style={styles.sectionTitle}>Sensor status</Text>
        <View style={styles.sensorGrid}>
          {realSensors.length === 0 ? (
            <Text style={styles.emptyText}>Tidak ada sensor yang terhubung.</Text>
          ) : (
            realSensors.map((sensor) => (
              <View key={sensor.id} style={styles.sensorItem}>
                <View style={styles.sensorTop}>
                  <Text style={styles.sensorIcon}>{sensor.icon}</Text>
                  <Text style={styles.sensorLabel} numberOfLines={1}>
                    {sensor.label}
                  </Text>
                </View>
                <Text style={styles.sensorValue} numberOfLines={1}>
                  {sensor.value}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    sensor.tone === "amber" && styles.statusPillAmber,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      sensor.tone === "amber" && styles.statusTextAmber,
                    ]}
                    numberOfLines={1}
                  >
                    {sensor.state}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View> */}
      </ScrollView>

      <BottomNav active="home" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: PAGE_PADDING, paddingBottom: 60 },
  modeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  modeButton: {
    minWidth: 54,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0A0F2C",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  modeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  loadingText: {
    textAlign: "center",
    marginVertical: 24,
    color: "#64748B",
  },
  errorText: {
    color: "#FF5C7A",
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 12,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 14,
  },
  greeting: {
    color: "#64748B",
    fontSize: 15,
  },
  name: {
    color: "#0A0F2C",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 3,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },
  homeCard: {
    minHeight: 110,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  homeCopy: {
    flex: 1,
    paddingRight: 12,
  },
  homeTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0A0F2C",
  },
  muted: {
    color: "#64748B",
    fontSize: 13.5,
    marginTop: 5,
  },
  homeSelectorWrap: {
    marginTop: 14,
    marginBottom: 6,
  },
  addHomeButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  addHomeButtonText: {
    color: "#4338CA",
    fontSize: 14,
    fontWeight: "900",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    marginBottom: 10,
  },
  emptyHomesCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 14,
    marginBottom: 6,
  },
  emptyHomesCta: {
    height: 42,
    borderRadius: 10,
    backgroundColor: "#0A0F2C",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHomesCtaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  homesList: {
    gap: 10,
  },
  homeItemCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 12,
  },
  homeItemName: {
    color: "#0A0F2C",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
  },
  homeItemMeta: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
  selectorLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  homeChip: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  homeChipActive: {
    borderColor: "#0A0F2C",
    backgroundColor: "#0A0F2C",
  },
  homeChipText: {
    color: "#0A0F2C",
    fontSize: 13,
    fontWeight: "800",
  },
  homeChipTextActive: {
    color: "#FFFFFF",
  },
  onlinePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#00D4FF",
    backgroundColor: "#E6FAFF",
  },
  onlineText: {
    color: "#036B82",
    fontSize: 13,
    fontWeight: "900",
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 20,
    fontWeight: "900",
    color: "#0A0F2C",
  },
  cardRow: {
    justifyContent: "space-between",
    marginBottom: CARD_GAP,
  },
  roomCard: {
    width: CARD_WIDTH,
    minHeight: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  addRoomCard: {
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2F7",
  },
  roomName: {
    color: "#0A0F2C",
    fontSize: 16,
    fontWeight: "900",
  },
  roomMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  roomCount: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  openButton: {
    width: 60,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  openButtonText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "800",
  },
  addRoomText: {
    color: "#7B61FF",
    fontSize: 15,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    width: (width - PAGE_PADDING * 2 - 20) / 3,
    height: 46,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  actionText: {
    color: "#0A0F2C",
    fontSize: 13.5,
    fontWeight: "900",
  },
  sensorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  sensorItem: {
    width: (width - PAGE_PADDING * 2 - 12) / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 16,
    padding: 14,
  },
  sensorTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  sensorIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  sensorLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  sensorValue: {
    color: "#0A0F2C",
    fontSize: 18,
    fontWeight: "900",
    marginVertical: 4,
  },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#00D4FF",
    backgroundColor: "#E6FAFF",
  },
  statusPillAmber: {
    borderColor: "#7B61FF",
    backgroundColor: "#F0ECFF",
  },
  statusText: {
    color: "#036B82",
    fontSize: 9.5,
    fontWeight: "800",
  },
  statusTextAmber: {
    color: "#6D4DFF",
  },
  aiCard: {
    marginTop: 20,
    backgroundColor: "#F5F3FF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9E5FF",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  aiCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#4C1D95",
  },
  aiDesc: {
    fontSize: 12,
    color: "#7C3AED",
    marginTop: 2,
    fontWeight: "600",
  },
  aiArrow: {
    fontSize: 18,
    color: "#7C3AED",
    fontWeight: "900",
    marginLeft: 8,
  },
});

export default Dashboard;
