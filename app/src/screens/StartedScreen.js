import React, { useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";

export default function StartedScreen({ navigation }) {
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        navigation.replace("Dashboard");
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>NexaHome</Text>
        <Text style={styles.logoSub}>Smart Living</Text>
      </View>

      <Image source={require("../../assets/logo.png")} style={styles.image} />

      <View style={styles.content}>
        <Text style={styles.subtitle}>Control your home, anywhere</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.secondaryButtonText}>Login</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>v1.0.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  logoBox: {
    marginTop: 80,
    alignItems: "center",
  },
  logoText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F2937",
  },
  logoSub: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 6,
  },
  image: {
    width: 220,
    height: 220,
    resizeMode: "contain",
  },
  content: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 32,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#FF6B00",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#FF6B00",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#FF6B00",
    fontSize: 16,
    fontWeight: "600",
  },
  version: {
    color: "#9CA3AF",
    fontSize: 14,
  },
});
