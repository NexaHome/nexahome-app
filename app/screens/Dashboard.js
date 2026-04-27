import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { sensors } from "../data/homeData";
import { useTheme } from "../theme";
import { postGraphQL } from "../utils/api";

const { width } = Dimensions.get("window");
const PAGE_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = (width - PAGE_PADDING * 2 - CARD_GAP) / 2;

const Dashboard = ({ navigation }) => {
  const { mode, toggleMode } = useTheme();
  const [user, setUser] = useState({ name: "User", email: "" });
  const [roomItems, setRoomItems] = useState([
    { roomId: "add", name: "+ Add room", isAdd: true },
  ]);
  const [summary, setSummary] = useState({
    roomsCount: 0,
    activeDevicesCount: 0,
    homeStatus: "No Home",
  });
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomError, setRoomError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

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
          homesResult.errors[0]?.message || "Gagal memuat daftar home";
        throw new Error(homesMessage);
      }

      const homes = homesResult?.data?.homes || [];
      const savedHomeId = await AsyncStorage.getItem("activeHomeId");
      const savedHomeExists = homes.some((home) => home._id === savedHomeId);
      const selectedHomeId =
        (savedHomeExists && savedHomeId) || homes[0]?._id || null;

      if (!selectedHomeId) {
        setRoomItems([{ roomId: "add", name: "+ Add room", isAdd: true }]);
        setSummary({
          roomsCount: 0,
          activeDevicesCount: 0,
          homeStatus: "No Home",
        });
        setRoomError("Belum ada home untuk akun ini");
        return;
      }

      await AsyncStorage.setItem("activeHomeId", selectedHomeId);

      const homeResponse = await postGraphQL(
        {
          query: `
            query DashboardByHome($homeId: String) {
              roomsByHome(homeId: $homeId) {
                roomId
                name
                subtitle
                activeDevices
                totalDevices
              }
              dashboardHome(homeId: $homeId) {
                homeId
                homeName
                homeStatus
                roomsCount
                activeDevicesCount
              }
            }
          `,
          variables: {
            homeId: selectedHomeId,
          },
        },
        {
          Authorization: `Bearer ${token}`,
        },
      );

      const homeResult = await homeResponse.json();

      if (homeResult?.errors?.length) {
        const message =
          homeResult.errors[0]?.message || "Gagal memuat data dashboard";
        setRoomError(
          message.toLowerCase().includes("home not found")
            ? "Belum ada home untuk akun ini"
            : message,
        );
      }

      if (homeResult?.data?.roomsByHome?.length) {
        setRoomItems([
          ...homeResult.data.roomsByHome,
          { roomId: "add", name: "+ Add room", isAdd: true },
        ]);
      } else {
        setRoomItems([{ roomId: "add", name: "+ Add room", isAdd: true }]);
      }

      if (homeResult?.data?.dashboardHome) {
        setSummary({
          roomsCount: homeResult.data.dashboardHome.roomsCount ?? 0,
          activeDevicesCount:
            homeResult.data.dashboardHome.activeDevicesCount ?? 0,
          homeStatus: homeResult.data.dashboardHome.homeStatus ?? "No Home",
        });
      } else {
        setSummary({
          roomsCount: 0,
          activeDevicesCount: 0,
          homeStatus: "No Home",
        });
      }
    } catch (error) {
      console.log("DASHBOARD ERROR:", error);
      setRoomError(
        error?.message?.toLowerCase().includes("home")
          ? "Belum ada home untuk akun ini"
          : "Gagal memuat data dashboard",
      );
      setRoomItems([{ roomId: "add", name: "+ Add room", isAdd: true }]);
      setSummary({
        roomsCount: 0,
        activeDevicesCount: 0,
        homeStatus: "No Home",
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
                        {item.subtitle || "No description"}
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
          </>
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
  scroll: { flex: 1 },
  content: { padding: PAGE_PADDING, paddingBottom: 26 },
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
