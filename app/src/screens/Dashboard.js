import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { useTheme } from "../../theme";
import { postGraphQL } from "../../utils/api";
import { registerForPushNotificationsAsync } from "../../utils/notifications";

const { width } = Dimensions.get("window");
const PAGE_PADDING = 22;
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
  const [pushToken, setPushToken] = useState(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadDashboard();
    });
    
    // Register for push notifications
    const setupNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setPushToken(token);
          console.log("🚀 Expo Push Token:", token);
          const authToken = await SecureStore.getItemAsync("token");
          if (authToken) {
            const mutation = `
              mutation UpdatePushToken($input: UpdatePushTokenInput!) {
                updatePushToken(input: $input) { _id }
              }
            `;
            await postGraphQL(
              { 
                query: mutation, 
                variables: { input: { token } } 
              },
              { Authorization: `Bearer ${authToken}` }
            );
          }
        }
      } catch (err) {
        console.log("Failed to register push token:", err);
      }
    };
    setupNotifications();

    return unsubscribe;
  }, [navigation]);

  const loadRoomsForHome = async (token, homeId) => {
    const dashboardQuery = `
      query DashboardData {
        home { _id name }
        roomsByHomeBasic { _id name }
        devicesByHome { _id name type is_active status last_value category }
      }
    `;

    try {
      const response = await postGraphQL(
        { query: dashboardQuery },
        { Authorization: `Bearer ${token}`, "x-home-id": homeId }
      );
      const result = await response.json();
      const data = result?.data || {};

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

      const allDevices = data.devicesByHome || [];
      const activeCount = allDevices.filter((d) => d.is_active).length;

      if (data.home) {
        setSummary({
          roomsCount: data.roomsByHomeBasic?.length ?? 0,
          activeDevicesCount: activeCount,
          homeStatus: "Online",
          homeName: data.home.name,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDashboard = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        navigation.replace("Login");
        return;
      }

      const meResponse = await postGraphQL(
        { query: `query { me { name email } }` },
        { Authorization: `Bearer ${token}` }
      );
      const meResult = await meResponse.json();
      if (meResult?.data?.me) {
        setUser({
          name: meResult.data.me.name || "User",
          email: meResult.data.me.email || "",
        });
      }

      setLoadingRooms(true);
      const homesResponse = await postGraphQL(
        { query: `query { homes { _id name } }` },
        { Authorization: `Bearer ${token}` }
      );
      const homesResult = await homesResponse.json();
      const homesData = homesResult?.data?.homes || [];
      setHomes(homesData);

      if (homesData.length === 0) {
        setRoomItems([{ roomId: "add", name: "+ Add room", isAdd: true }]);
        setSummary({ roomsCount: 0, activeDevicesCount: 0, homeStatus: "No Home", homeName: "Main Home" });
        return;
      }

      const savedHomeId = await SecureStore.getItemAsync("activeHomeId");
      const selectedHomeId = homesData.find((h) => h._id === savedHomeId)?._id || homesData[0]?._id;
      setSelectedHomeIdState(selectedHomeId);
      await SecureStore.setItemAsync("activeHomeId", selectedHomeId);
      await loadRoomsForHome(token, selectedHomeId);
    } catch (error) {
      setRoomError("Failed to load dashboard data");
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSelectHome = async (homeId) => {
    const token = await SecureStore.getItemAsync("token");
    setLoadingRooms(true);
    setSelectedHomeIdState(homeId);
    await SecureStore.setItemAsync("activeHomeId", homeId);
    await loadRoomsForHome(token, homeId);
    setLoadingRooms(false);
  };

  const initials = user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "NH";

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.modeRow}>
          <AnimatedPressable style={styles.modeButton} onPress={toggleMode}>
            <Text style={styles.modeText}>{mode === "dark" ? "Light" : "Dark"}</Text>
          </AnimatedPressable>
        </View>

        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>
              {(() => {
                const hour = new Date().getHours();
                if (hour < 11) return "Good morning,";
                if (hour < 15) return "Good afternoon,";
                if (hour < 19) return "Good evening,";
                return "Good night,";
              })()}
            </Text>
            <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        <View style={styles.mainActionRow}>
          <View style={styles.homeCard}>
            <View style={styles.homeCardHeader}>
              <View style={styles.onlineStatus}>
                <View style={styles.onlinePulse} />
                <Text style={styles.onlineText}>{summary.homeStatus}</Text>
              </View>
              {loadingRooms && <ActivityIndicator size="small" color="#FF6B00" />}
              <AnimatedPressable onPress={() => navigation.navigate("HomesSettings")} style={styles.settingsIconBtn}>
                <Text style={{ fontSize: 18 }}>⚙️</Text>
              </AnimatedPressable>
            </View>
            <Text style={styles.homeTitle}>{summary.homeName}</Text>
            <Text style={styles.homeSubtitle}>{summary.roomsCount} rooms • {summary.activeDevicesCount} active</Text>
          </View>
        </View>

        {homes.length > 1 && (
          <View style={styles.homeSelectorWrap}>
            <Text style={styles.selectorLabel}>Select home</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {homes.map((home) => {
                const isActive = home._id === selectedHomeIdState;
                return (
                  <AnimatedPressable key={home._id} style={[styles.homeChip, isActive && styles.homeChipActive]} onPress={() => handleSelectHome(home._id)}>
                    <Text style={[styles.homeChipText, isActive && styles.homeChipTextActive]}>{home.name}</Text>
                  </AnimatedPressable>
                );
              })}
              <AnimatedPressable style={[styles.homeChip, { borderStyle: "dashed", borderColor: "#FF6B00" }]} onPress={() => navigation.navigate("HomesSettings")}>
                <Text style={[styles.homeChipText, { color: "#FF6B00" }]}>+ Add Home</Text>
              </AnimatedPressable>
            </ScrollView>
          </View>
        )}

        <AnimatedPressable style={styles.aiCard} onPress={() => navigation.navigate("AIRecommendations")}>
          <View style={styles.aiCardContent}>
            <View style={styles.aiIconWrapper}><Text style={{ fontSize: 22 }}>✨</Text></View>
            <View style={styles.aiTextContainer}>
              <Text style={styles.aiTitle}>AI Recommendations</Text>
              <Text style={styles.aiDesc}>Personalized safety & energy saving tips</Text>
            </View>
            <View style={styles.aiArrowCircle}><Text style={styles.aiArrowText}>→</Text></View>
          </View>
        </AnimatedPressable>

        <Text style={styles.sectionTitle}>Rooms</Text>
        {loadingRooms ? (
          <Text style={styles.loadingText}>Loading rooms...</Text>
        ) : (
          <FlatList
            data={roomItems}
            scrollEnabled={false}
            numColumns={2}
            columnWrapperStyle={styles.cardRow}
            keyExtractor={(item) => item.roomId}
            renderItem={({ item }) => {
              if (item.isAdd) {
                return (
                  <AnimatedPressable style={styles.addRoomCard} onPress={() => navigation.navigate("AddRoom")}>
                    <Text style={styles.addRoomText}>+ Add room</Text>
                  </AnimatedPressable>
                );
              }
              return (
                <AnimatedPressable style={styles.roomCard} onPress={() => navigation.navigate("RoomDetail", { roomId: item.roomId, roomName: item.name })}>
                  <View style={styles.roomIconBox}><Text style={styles.roomIconEmoji}>🏠</Text></View>
                  <View>
                    <Text style={styles.roomName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.roomLabel}>Living Area</Text>
                  </View>
                  <View style={styles.roomFooter}>
                    <View style={styles.viewBtn}><Text style={styles.viewBtnText}>Manage</Text></View>
                  </View>
                </AnimatedPressable>
              );
            }}
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
  modeRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 10 },
  modeButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: "#F1F5F9" },
  modeText: { fontSize: 12, fontWeight: "900", color: "#0A0F2C" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  headerCopy: { flex: 1 },
  greeting: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  name: { fontSize: 26, fontWeight: "900", color: "#0A0F2C", marginTop: 2 },
  name: { fontSize: 26, fontWeight: "900", color: "#0A0F2C", marginTop: 2 },
  avatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  avatarText: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  mainActionRow: { marginBottom: 24 },
  homeCard: { backgroundColor: "#0A0F2C", borderRadius: 28, padding: 24, shadowColor: "#0A0F2C", shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  homeCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  onlineStatus: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0, 212, 255, 0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  onlinePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#00D4FF", marginRight: 8 },
  onlineText: { color: "#00D4FF", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  settingsIconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255, 255, 255, 0.1)", alignItems: "center", justifyContent: "center" },
  homeTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  homeSubtitle: { color: "rgba(255, 255, 255, 0.6)", fontSize: 13, marginTop: 4, fontWeight: "600" },
  homeSelectorWrap: { marginBottom: 24 },
  selectorLabel: { color: "#64748B", fontSize: 12, fontWeight: "800", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 },
  homeChip: { height: 42, borderRadius: 14, paddingHorizontal: 16, marginRight: 12, borderWidth: 1.5, borderColor: "#F1F5F9", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  homeChipActive: { borderColor: "#FF6B00", backgroundColor: "#FF6B00" },
  homeChipText: { color: "#0A0F2C", fontSize: 14, fontWeight: "800" },
  homeChipTextActive: { color: "#FFFFFF" },
  aiCard: { backgroundColor: "#FF6B00", borderRadius: 24, padding: 20, marginBottom: 28, shadowColor: "#FF6B00", shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  aiCardContent: { flexDirection: "row", alignItems: "center" },
  aiIconWrapper: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginRight: 16 },
  aiTextContainer: { flex: 1 },
  aiTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  aiDesc: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600", marginTop: 2 },
  aiArrowCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  aiArrowText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: "#0A0F2C", marginBottom: 16 },
  cardRow: { justifyContent: "space-between", marginBottom: 12 },
  roomCard: { width: CARD_WIDTH, minHeight: 170, backgroundColor: "#FFFFFF", borderRadius: 26, padding: 20, justifyContent: "space-between", shadowColor: "#0A0F2C", shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, borderWidth: 1.5, borderColor: "#F1F5F9" },
  roomIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  roomIconEmoji: { fontSize: 20 },
  roomName: { color: "#0A0F2C", fontSize: 17, fontWeight: "900" },
  roomLabel: { color: "#64748B", fontSize: 12, fontWeight: "600", marginTop: 4 },
  roomFooter: { marginTop: 16 },
  viewBtn: { width: "100%", height: 36, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  viewBtnText: { color: "#64748B", fontSize: 12, fontWeight: "900" },
  addRoomCard: { width: CARD_WIDTH, minHeight: 170, borderRadius: 26, borderWidth: 2, borderStyle: "dashed", borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  addRoomText: { color: "#FF6B00", fontSize: 15, fontWeight: "900" },
  loadingText: { textAlign: "center", color: "#64748B", marginTop: 20, fontSize: 14, fontWeight: "600" },
  errorText: { textAlign: "center", color: "#FF5C7A", marginBottom: 10, fontSize: 13, fontWeight: "700" },
});

export default Dashboard;
