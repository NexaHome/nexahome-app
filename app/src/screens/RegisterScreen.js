import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { gql } from "@apollo/client/core";
import { useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";

const REGISTER_MUTATION = gql`
  mutation Register($name: String!, $email: String!, $password: String!) {
    register(
      createUserInput: { name: $name, email: $email, password: $password }
    ) {
      userId
      email
      name
      message
    }
  }
`;

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [register, { loading }] = useMutation(REGISTER_MUTATION);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Semua field wajib diisi");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Password dan confirm password tidak sama");
      return;
    }

    try {
      const { data } = await register({
        variables: {
          name,
          email,
          password,
        },
      });

      if (!data?.register) {
        Alert.alert("Register gagal", "Terjadi kesalahan");
        return;
      }

      Alert.alert("Sukses", "Akun berhasil dibuat, silakan login");
      navigation.navigate("Login");
    } catch (error) {
      const msg = error?.message || "Gagal terhubung ke server";
      Alert.alert("Error", msg);
      console.log(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            Fill in your details below to{"\n"}
            <Text style={styles.subtitleAccent}>get started</Text>
          </Text>

          {/* Full Name Input */}
          <Text style={styles.label}>Full name</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#FF7A1A"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#D1D5DB"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email Input */}
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#FF7A1A"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor="#D1D5DB"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password Input */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#FF7A1A"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Create password"
              placeholderTextColor="#D1D5DB"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <Text style={styles.label}>Confirm password</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#FF7A1A"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Repeat password"
              placeholderTextColor="#D1D5DB"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? "Loading..." : "Create account"}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color="#FFFFFF"
              style={styles.createButtonIcon}
            />
          </TouchableOpacity>

          {/* Security Info Box */}
          <View style={styles.securityBox}>
            <View style={styles.securityContent}>
              <Ionicons
                name="shield-checkmark"
                size={32}
                color="#FF7A1A"
                style={styles.securityIcon}
              />
              <View style={styles.securityText}>
                <Text style={styles.securityTitle}>
                  Your data is safe with us
                </Text>
                <Text style={styles.securityDesc}>
                  We use industry-standard encryption{"\n"}to keep your
                  information secure.
                </Text>
              </View>
              <Ionicons
                name="lock-closed"
                size={24}
                color="#FF7A1A"
                style={styles.lockIcon}
              />
            </View>
          </View>

          {/* Login Link */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.linkText}>Login here</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 32,
    lineHeight: 24,
  },
  subtitleAccent: {
    color: "#FF6B00",
    fontWeight: "600",
  },
  label: {
    fontSize: 15,
    color: "#111827",
    marginBottom: 8,
    fontWeight: "600",
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 8,
  },
  createButton: {
    backgroundColor: "#FF6B00",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 28,
    marginBottom: 28,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  createButtonIcon: {
    marginLeft: 10,
  },
  securityBox: {
    backgroundColor: "#FFF7F2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  securityContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  securityIcon: {
    marginRight: 12,
  },
  securityText: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  securityDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  lockIcon: {
    marginLeft: 8,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  bottomText: {
    color: "#6B7280",
    fontSize: 14,
  },
  linkText: {
    color: "#FF6B00",
    fontWeight: "700",
    fontSize: 14,
  },
});
