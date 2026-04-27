import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { postGraphQL } from "../utils/api";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email dan password wajib diisi");
      return;
    }

    try {
      setLoading(true);

      const response = await postGraphQL({
        query: `
            mutation Login($email: String!, $password: String!) {
              login(loginInput: {
                email: $email,
                password: $password
              }) {
                accessToken
                userId
                email
                name
              }
            }
          `,
        variables: {
          email,
          password,
        },
      });

      const result = await response.json();

      if (result.errors) {
        Alert.alert(
          "Login gagal",
          result.errors[0]?.message || "Email atau password salah",
        );
        return;
      }

      const loginData = result.data?.login;
      await AsyncStorage.setItem("token", loginData.accessToken);
      Alert.alert("Sukses", `Selamat datang, ${loginData.name}`);
      navigation.replace("Dashboard");
    } catch (error) {
      Alert.alert("Error", "Gagal terhubung ke server");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Login to your account</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="********"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity>
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? "Loading..." : "Login"}
          </Text>
        </TouchableOpacity>

        <View style={styles.orRow}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleButton}>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.linkText}>Register here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 28,
  },
  label: {
    fontSize: 15,
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  forgot: {
    textAlign: "right",
    color: "#6B7280",
    marginTop: 10,
    marginBottom: 22,
  },
  loginButton: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 22,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D5DB",
  },
  orText: {
    marginHorizontal: 12,
    color: "#9CA3AF",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  googleButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "500",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  bottomText: {
    color: "#6B7280",
  },
  linkText: {
    color: "#2563EB",
    fontWeight: "600",
  },
});
