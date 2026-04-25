import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from "react-native";

const rooms = [
  { name: "Ruang Tamu", status: "2 devices on" },
  { name: "Dapur", status: "1 device on" },
  { name: "Kamar Tidur", status: "All off" },
];

const sensors = [
  { label: "Fire", value: "23 °C", tag: "Normal" },
  { label: "Gas", value: "12 ppm", tag: "Normal" },
  { label: "Water", value: "Dry", tag: "Normal" },
  { label: "Light", value: "340 lx", tag: "Bright" },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>Good morning,</Text>
        <Text style={styles.name}>Budi Santoso</Text>

        <View style={styles.homeCard}>
          <View>
            <Text style={styles.homeTitle}>Rumah Utama</Text>
            <Text style={styles.homeSub}>3 rooms · 6 devices active</Text>
          </View>
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Rooms</Text>
        <View style={styles.roomGrid}>
          {rooms.map((room, index) => (
            <View key={index} style={styles.roomCard}>
              <Text style={styles.roomName}>{room.name}</Text>
              <Text style={styles.roomStatus}>{room.status}</Text>
              <TouchableOpacity style={styles.openButton}>
                <Text style={styles.openButtonText}>Open</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addRoomCard}>
            <Text style={styles.addRoomText}>+ Add room</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>All on</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>All off</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>Away mode</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Sensor status</Text>
        <View style={styles.sensorBox}>
          {sensors.map((sensor, index) => (
            <View key={index} style={styles.sensorItem}>
              <Text style={styles.sensorLabel}>{sensor.label}</Text>
              <Text style={styles.sensorValue}>{sensor.value}</Text>
              <View
                style={[
                  styles.sensorTag,
                  sensor.tag === "Bright" && styles.brightTag,
                ]}
              >
                <Text
                  style={[
                    styles.sensorTagText,
                    sensor.tag === "Bright" && styles.brightTagText,
                  ]}
                >
                  {sensor.tag}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <Text style={styles.activeNav}>Home</Text>
        <Text style={styles.nav}>Sensors</Text>
        <Text style={styles.nav}>Schedule</Text>
        <Text style={styles.nav}>Alerts</Text>
        <Text style={styles.nav}>Profile</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  greeting: {
    fontSize: 16,
    color: "#6B7280",
  },
  name: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },
  homeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  homeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  homeSub: {
    color: "#6B7280",
    marginTop: 6,
  },
  onlineBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  onlineText: {
    color: "#16A34A",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
  },
  roomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  roomCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  roomName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  roomStatus: {
    color: "#6B7280",
    marginVertical: 8,
  },
  openButton: {
    backgroundColor: "#111827",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  openButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  addRoomCard: {
    width: "48%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    minHeight: 120,
  },
  addRoomText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  actionText: {
    color: "#111827",
    fontWeight: "500",
  },
  sensorBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 90,
  },
  sensorItem: {
    alignItems: "center",
    flex: 1,
  },
  sensorLabel: {
    color: "#6B7280",
    marginBottom: 4,
  },
  sensorValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  sensorTag: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sensorTagText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "600",
  },
  brightTag: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  brightTagText: {
    color: "#D97706",
  },
  bottomNav: {
    position: "absolute",
    bottom: 10,
    left: 20,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeNav: {
    color: "#111827",
    fontWeight: "700",
  },
  nav: {
    color: "#9CA3AF",
  },
});
