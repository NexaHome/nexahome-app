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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { postGraphQL } from "../utils/api";

const { width } = Dimensions.get("window");
const PAGE_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = (width - PAGE_PADDING * 2 - CARD_GAP) / 2;

const RoomDetail = ({ route, navigation }) => {
  const { roomName: initialRoomName = "Room", roomId } = route.params || {};
  const [roomName, setRoomName] = useState(initialRoomName);
  const [roomDevices, setRoomDevices] = useState([]);
  const [activeDevices, setActiveDevices] = useState(0);
  const [roomSubtitle, setRoomSubtitle] = useState("-");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRoomDetail = async () => {
      if (!roomId) {
        setError("Room ID tidak ditemukan.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const token = await AsyncStorage.getItem("token");
        if (!token) {
          throw new Error("Token tidak ditemukan, silakan login ulang.");
        }

        const homeId = await AsyncStorage.getItem("activeHomeId");
        if (!homeId) {
          throw new Error("Home aktif tidak ditemukan.");
        }

        const query = `
          query RoomSummaries {
            roomsByHomeBasic {
              _id
              name
            }
          }
        `;

        const response = await postGraphQL(
          {
            query,
          },
          {
            Authorization: `Bearer ${token}`,
            "x-home-id": homeId,
          },
        );
        const result = await response.json();

        if (!response.ok || result.errors) {
          throw new Error(
            result.errors?.[0]?.message || "Gagal mengambil detail room",
          );
        }

        const rooms = result.data?.roomsByHomeBasic || [];
        const selectedRoom = rooms.find((item) => item._id === roomId);

        if (!selectedRoom) {
          throw new Error("Room tidak ditemukan di server");
        }

        setRoomName(selectedRoom.name || initialRoomName);
        setActiveDevices(0);
        setRoomSubtitle("Room");
        setRoomDevices([]);
      } catch (fetchError) {
        setError(fetchError.message || "Terjadi kesalahan");
        setRoomDevices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomDetail();
  }, [roomId, initialRoomName]);

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
          <Text style={styles.infoText}>
            Detail perangkat belum tersedia dari endpoint server saat ini.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Recent activity</Text>
        <Text style={styles.infoText}>
          Recent activity belum tersedia dari endpoint server saat ini.
        </Text>
        <AnimatedPressable style={styles.logButton}>
          <Text style={styles.logText}>View all logs</Text>
        </AnimatedPressable>
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
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityTitle: {
    flex: 1,
    color: "#0A0F2C",
    fontSize: 13,
    fontWeight: "700",
    paddingRight: 8,
  },
  activityTime: {
    color: "#94A3B8",
    fontSize: 12,
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
});

export default RoomDetail;
