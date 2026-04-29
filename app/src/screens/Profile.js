import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { useTheme } from "../../theme";
import AnimatedPressable from "../components/AnimatedPressable";
import { postGraphQL } from "../../utils/api";

export default function Profile({ navigation }) {
  const { theme, mode, toggleMode } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [user, setUser] = useState({ name: "Loading...", email: "Loading..." });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert("Session expired", "Please log in again");
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
          result.errors[0]?.message || "Failed to fetch profile",
        );
        return;
      }

      setUser(result.data.me);
    } catch (error) {
      Alert.alert("Error", "Failed to connect to server");
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
    <AnimatedPressable
      style={styles.menuRow}
      onPress={onPress}
    >
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>

      {rightType === "switch" ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: theme.border, true: "#7DDC7A" }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <View style={styles.rightSide}>
          {value ? <Text style={styles.menuValue}>{value}</Text> : null}
          <Text style={styles.arrow}>→</Text>
        </View>
      )}
    </AnimatedPressable>
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
    <ScreenShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account Settings</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || "No Name"}</Text>
            <Text style={styles.email}>{user?.email || "No Email"}</Text>
          </View>
          <AnimatedPressable style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit</Text>
          </AnimatedPressable>
        </View>

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            title="Dark Mode"
            value={mode === "dark"}
            rightType="switch"
            onPress={toggleMode}
          />
          <MenuRow
            title="Push Notifications"
            value={notifications}
            rightType="switch"
            onPress={() => setNotifications(!notifications)}
          />
          <MenuRow
            title="Members & Access"
            subtitle="Manage people in your home"
            onPress={() => navigation.navigate("Members")}
          />
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT ACTIONS</Text>
        <AnimatedPressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </AnimatedPressable>
      </ScrollView>
      <BottomNav active="profile" navigation={navigation} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 22, paddingBottom: 100 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#0A0F2C" },
  profileCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    shadowColor: "#0A0F2C",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 24, color: "#4338CA", fontWeight: "900" },
  profileInfo: { flex: 1, marginLeft: 16 },
  name: { fontSize: 20, fontWeight: "800", color: "#0A0F2C" },
  email: { fontSize: 13, color: "#64748B", marginTop: 2, fontWeight: "600" },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  editButtonText: { fontSize: 13, color: "#0A0F2C", fontWeight: "900" },
  sectionLabel: {
    marginTop: 28,
    marginBottom: 12,
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  menuGroup: { width: "100%", gap: 12 },
  menuRow: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
  },
  menuTextWrap: { flex: 1, paddingRight: 10 },
  menuTitle: { fontSize: 16, color: "#0A0F2C", fontWeight: "800" },
  menuSubtitle: { fontSize: 12, color: "#64748B", marginTop: 2, fontWeight: "600" },
  menuValue: { fontSize: 14, color: "#94A3B8", marginRight: 6, fontWeight: "700" },
  rightSide: { flexDirection: "row", alignItems: "center" },
  arrow: { fontSize: 20, color: "#CBD5E1", fontWeight: "900" },
  logoutButton: {
    width: "100%",
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#FFF1F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },
  logoutButtonText: { color: "#E11D48", fontSize: 16, fontWeight: "900" },
});
