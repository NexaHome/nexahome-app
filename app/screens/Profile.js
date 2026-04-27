import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { postGraphQL } from "../utils/api";

export default function Profile({ navigation }) {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState({ name: "Loading...", email: "Loading..." });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Session habis", "Silakan login ulang");
        navigation.navigate("Login");
        return;
      }

      const response = await postGraphQL(
        {
          query: `
            query Me {
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

      const result = await response.json();

      if (result.errors) {
        Alert.alert(
          "Error",
          result.errors[0]?.message || "Gagal mengambil profile",
        );
        return;
      }

      setUser(result.data.me);
    } catch (error) {
      Alert.alert("Error", "Gagal terhubung ke server");
      console.log(error);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("userName");
    await AsyncStorage.removeItem("userEmail");
    navigation.navigate("Login");
  };

  const MenuRow = ({ title, value, onPress, rightType = "arrow" }) => (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.menuTitle}>{title}</Text>

      {rightType === "switch" ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: "#D1D5DB", true: "#7DDC7A" }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <View style={styles.rightSide}>
          {value ? <Text style={styles.menuValue}>{value}</Text> : null}
          <Text style={styles.arrow}>›</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "NH";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.name}>{user?.name || "No Name"}</Text>
        <Text style={styles.email}>{user?.email || "No Email"}</Text>

        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit profile</Text>
        </TouchableOpacity>

        <View style={styles.menuGroup}>
          <MenuRow
            title="Notifications"
            value={notifications}
            rightType="switch"
            onPress={() => setNotifications(!notifications)}
          />

          <MenuRow
            title="Dark mode"
            value={darkMode}
            rightType="switch"
            onPress={() => setDarkMode(!darkMode)}
          />

          <MenuRow title="Language" value="Indonesia" onPress={() => {}} />
          <MenuRow title="Change password" onPress={() => {}} />
          <MenuRow title="Privacy & security" onPress={() => {}} />
          <MenuRow title="About app" value="v1.0.0" onPress={() => {}} />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate("Dashboard")}>
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("SensorMonitor")}>
          <Text style={styles.navText}>Sensors</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Schedule")}>
          <Text style={styles.navText}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Alerts")}>
          <Text style={styles.navText}>Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.activeNavText}>Profile</Text>
          <View style={styles.activeLine} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 100,
    alignItems: "center",
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#DDF0FF",
    borderWidth: 2,
    borderColor: "#8CC8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    color: "#2563EB",
    fontWeight: "500",
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
  },
  email: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 4,
    marginBottom: 16,
  },
  editButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
  },
  editButtonText: {
    fontSize: 16,
    color: "#4B5563",
    fontWeight: "500",
  },
  menuGroup: {
    width: "100%",
    gap: 12,
  },
  menuRow: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuTitle: {
    fontSize: 18,
    color: "#374151",
  },
  menuValue: {
    fontSize: 16,
    color: "#9CA3AF",
    marginRight: 6,
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
  },
  arrow: {
    fontSize: 22,
    color: "#BDBDBD",
    marginTop: -2,
  },
  logoutButton: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "#FFFFFF",
  },
  logoutButtonText: {
    color: "#EF4444",
    fontSize: 18,
    fontWeight: "500",
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  navText: {
    color: "#B0B0B0",
    fontSize: 14,
  },
  activeNavText: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  activeLine: {
    marginTop: 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#1F2937",
  },
});
