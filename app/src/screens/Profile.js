import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../components/BottomNav";
import { postGraphQL } from "../../utils/api";

export default function Profile({ navigation }) {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState({ name: "Loading...", email: "Loading..." });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

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
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("userName");
    await SecureStore.deleteItemAsync("userEmail");
    navigation.navigate("Login");
  };

  const MenuRow = ({
    title,
    value,
    onPress,
    rightType = "arrow",
    subtitle,
  }) => (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>

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
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <Text style={styles.name}>{user?.name || "No Name"}</Text>
          <Text style={styles.email}>{user?.email || "No Email"}</Text>

          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Preferences</Text>
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

          <MenuRow
            title="Members"
            subtitle="Manage home members and permissions"
            value="Open"
            onPress={() => navigation.navigate("Members")}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav active="profile" navigation={navigation} />
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
    paddingTop: 40,
    paddingBottom: 120,
  },
  profileCard: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: "#0A0F2C",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EAF4FF",
    borderWidth: 2,
    borderColor: "#8CC8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 34,
    color: "#2563EB",
    fontWeight: "900",
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
  },
  email: {
    fontSize: 15,
    color: "#9CA3AF",
    marginTop: 4,
    marginBottom: 16,
    textAlign: "center",
  },
  editButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
  },
  editButtonText: {
    fontSize: 15,
    color: "#4B5563",
    fontWeight: "700",
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 10,
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
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
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  menuTitle: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "800",
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  menuValue: {
    fontSize: 14,
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
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "#FFFFFF",
  },
  logoutButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "800",
  },
});
