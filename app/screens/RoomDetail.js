import React from "react";
import { Dimensions, FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { activities, devices } from "../data/homeData";

const { width } = Dimensions.get("window");
const PAGE_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = (width - PAGE_PADDING * 2 - CARD_GAP) / 2;

const RoomDetail = ({ route, navigation }) => {
  const { roomName = "Ruang Tamu", roomId = "living" } = route.params || {};
  const roomDevices = devices.filter((device) => device.roomId === roomId);
  const activeDevices = roomDevices.filter((device) => device.power).length;

  return (
    <ScreenShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <AnimatedPressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back</Text>
          </AnimatedPressable>
          <View style={styles.topActions}>
            <AnimatedPressable
              style={styles.editButton}
              onPress={() => navigation.navigate("AddRoom", { mode: "edit", roomName, roomId })}
            >
              <Text style={styles.editText}>Edit</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.addButton}
              onPress={() => navigation.navigate("AddFeature", { roomName, roomId })}
            >
              <Text style={styles.addText}>+ Add</Text>
            </AnimatedPressable>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={1}>{roomName}</Text>
        <Text style={styles.subtitle}>
          {roomDevices.length} devices - {activeDevices} active
        </Text>

        <FlatList
          data={roomDevices}
          scrollEnabled={false}
          numColumns={2}
          columnWrapperStyle={styles.cardRow}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AnimatedPressable
              style={styles.deviceCard}
              onPress={() =>
                item.id === "clothesline"
                  ? navigation.navigate("LaundryStatus", { weather: "rainy" })
                  : navigation.navigate("DeviceControl", { deviceId: item.id })
              }
            >
              <View>
                <Text style={styles.deviceName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.deviceDetail} numberOfLines={1}>{item.detail}</Text>
              </View>
              <View>
                <View style={[styles.statePill, !item.power && styles.statePillOff]}>
                  <Text style={[styles.stateText, !item.power && styles.stateTextOff]} numberOfLines={1}>
                    {item.status}
                  </Text>
                </View>
                <Text style={styles.controlText}>Control</Text>
              </View>
            </AnimatedPressable>
          )}
        />

        <Text style={styles.sectionTitle}>Recent activity</Text>
        <View style={styles.activityList}>
          {activities.map((item) => (
            <View key={item.id} style={styles.activityItem}>
              <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          ))}
        </View>
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
    color: "#3478F6",
    fontSize: 16,
    fontWeight: "900",
  },
  addButton: {
    backgroundColor: "#2E2F2B",
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
    borderColor: "#DADDD4",
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  editText: {
    color: "#42443E",
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
    color: "#20211E",
    letterSpacing: 0,
  },
  subtitle: {
    color: "#8A8D86",
    fontSize: 15,
    marginTop: 5,
    marginBottom: 20,
  },
  cardRow: {
    justifyContent: "space-between",
    marginBottom: CARD_GAP,
  },
  deviceCard: {
    width: CARD_WIDTH,
    minHeight: 154,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADDD4",
    borderRadius: 14,
    padding: 14,
    justifyContent: "space-between",
  },
  deviceName: {
    color: "#252621",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  deviceDetail: {
    color: "#8E918A",
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
    borderColor: "#8DD897",
    backgroundColor: "#F0FFF2",
    paddingHorizontal: 10,
  },
  statePillOff: {
    borderColor: "#D7D9D3",
    backgroundColor: "#F6F7F3",
  },
  stateText: {
    color: "#278039",
    fontSize: 13,
    fontWeight: "900",
  },
  stateTextOff: {
    color: "#8A8D86",
  },
  controlText: {
    color: "#3478F6",
    marginTop: 10,
    fontSize: 13,
    fontWeight: "900",
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 10,
    fontSize: 20,
    fontWeight: "900",
    color: "#22231F",
  },
  activityList: {
    marginTop: 2,
  },
  activityItem: {
    minHeight: 50,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADDD4",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityTitle: {
    flex: 1,
    color: "#42443E",
    fontSize: 13,
    fontWeight: "700",
    paddingRight: 8,
  },
  activityTime: {
    color: "#B0B3AC",
    fontSize: 12,
  },
  logButton: {
    alignItems: "center",
    paddingVertical: 14,
  },
  logText: {
    color: "#3478F6",
    fontSize: 13,
    fontWeight: "900",
  },
});

export default RoomDetail;
