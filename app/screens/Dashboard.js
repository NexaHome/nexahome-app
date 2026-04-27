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
import { rooms as dummyRooms, sensors } from "../data/homeData";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../theme";
import { BASE_URL } from "../utils/api";

const { width } = Dimensions.get("window");
const PAGE_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = (width - PAGE_PADDING * 2 - CARD_GAP) / 2;

const Dashboard = ({ navigation }) => {
  const { mode, toggleMode } = useTheme();
  const [roomItems, setRoomItems] = useState([]);
  const [summary, setSummary] = useState({
    roomsCount: 0,
    activeDevicesCount: 0,
    homeStatus: "-",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let token = await AsyncStorage.getItem("token");

        if (!token) {
          navigation.replace("Login");
          return;
        }
        // Connect to GraphQL server
        const url = BASE_URL;
        const query = `query { roomsByHome { roomId name subtitle activeDevices totalDevices } dashboardHome { roomsCount activeDevicesCount homeStatus } }`;
        let res;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ query }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (fetchErr) {
          if (fetchErr.name === "AbortError") {
            throw new Error("Fetch timeout - server not responding");
          }
          throw new Error(`Network error: ${fetchErr.message}`);
        }
        let jsonResponse;
        try {
          jsonResponse = await res.json();
        } catch (parseErr) {
          throw new Error("Invalid JSON from server");
        }
        if (!res.ok) {
          throw new Error(
            `HTTP ${res.status}: ${JSON.stringify(jsonResponse)}`,
          );
        }
        const { data, errors } = jsonResponse;
        if (errors) {
          throw new Error(errors[0]?.message || "GraphQL error");
        }
        if (data && data.roomsByHome) {
          setRoomItems([
            ...data.roomsByHome,
            { roomId: "add", name: "+ Add room", isAdd: true },
          ]);
          setSummary(
            data.dashboardHome || {
              roomsCount: 0,
              activeDevicesCount: 0,
              homeStatus: "-",
            },
          );
        } else {
          throw new Error("No data in response");
        }
      } catch (e) {
        setError(e.message);
        setRoomItems([
          ...dummyRooms,
          { id: "add", name: "+ Add room", isAdd: true },
        ]);
        setSummary({
          roomsCount: dummyRooms.length,
          activeDevicesCount: 0,
          homeStatus: "Offline",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
              Budi Santoso
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>BS</Text>
          </View>
        </View>

        <View style={styles.homeCard}>
          <View style={styles.homeCopy}>
            <Text style={styles.homeTitle}>Rumah Utama</Text>
            <Text style={styles.muted}>
              {summary.roomsCount} rooms - {summary.activeDevicesCount} devices
              active
            </Text>
          </View>
          <View style={styles.onlinePill}>
            <Text style={styles.onlineText}>{summary.homeStatus}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Rooms</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading rooms from server...</Text>
        ) : error ? (
          <Text style={styles.errorText}>Error: {error}</Text>
        ) : (
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
                    (item.roomId || item.id) === "add"
                      ? navigation.navigate("AddRoom")
                      : (item.roomId || item.id) === "terrace"
                        ? navigation.navigate("LaundryStatus", {
                            weather: "rainy",
                          })
                        : navigation.navigate("RoomDetail", {
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
                      {item.subtitle}
                    </Text>
                  </View>
                  <View style={styles.roomMeta}>
                    <Text style={styles.roomCount}>
                      {item.activeDevices ?? 0}/{item.totalDevices ?? 0}
                    </Text>
                    <View style={styles.openButton}>
                      <Text style={styles.openButtonText}>Open</Text>
                    </View>
                  </View>
                </AnimatedPressable>
              );
            }}
          />
        )}

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actions}>
          {["All on", "All off", "Away mode"].map((action) => (
            <AnimatedPressable key={action} style={styles.actionButton}>
              <Text style={styles.actionText} numberOfLines={1}>
                {action}
              </Text>
            </AnimatedPressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Sensor status</Text>
        <View style={styles.sensorGrid}>
          {sensors.map((sensor) => (
            <View key={sensor.id} style={styles.sensorItem}>
              <Text style={styles.sensorLabel} numberOfLines={1}>
                {sensor.label}
              </Text>
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
          ))}
        </View>
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
    shadowColor: "#0A0F2C",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  modeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  loadingText: {
    textAlign: "center",
    marginVertical: 30,
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
    letterSpacing: 0,
    marginTop: 3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EEF2F7",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#64748B",
    fontWeight: "900",
  },
  homeCard: {
    minHeight: 92,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#0A0F2C",
    shadowOpacity: 0.08,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
    minHeight: 124,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 14,
    justifyContent: "space-between",
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
    width: 72,
    height: 30,
    borderRadius: 7,
    backgroundColor: "#0A0F2C",
    alignItems: "center",
    justifyContent: "center",
  },
  openButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "900",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sensorItem: {
    width: "24%",
    minHeight: 80,
  },
  sensorLabel: {
    color: "#94A3B8",
    fontSize: 11,
  },
  sensorValue: {
    color: "#0A0F2C",
    fontSize: 13.5,
    fontWeight: "900",
    marginTop: 4,
  },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
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
});

export default Dashboard;
