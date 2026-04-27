import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { postGraphQL } from "../utils/api";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
      setLoading(true);

      const response = await postGraphQL({
        query: `
            mutation Register($name: String!, $email: String!, $password: String!) {
              register(createUserInput: {
                name: $name,
                email: $email,
                password: $password
              }) {
                userId
                email
                name
                message
              }
            }
          `,
        variables: {
          name,
          email,
          password,
        },
      });

      const result = await response.json();

      if (result.errors) {
        Alert.alert(
          "Register gagal",
          result.errors[0]?.message || "Terjadi kesalahan",
        );
        return;
      }

      Alert.alert("Sukses", "Akun berhasil dibuat, silakan login");
      navigation.navigate("Login");
    } catch (error) {
      Alert.alert("Error", "Gagal terhubung ke server");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.back}>{"< Back"}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Fill in your details below</Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          value={name}
          onChangeText={setName}
        />

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
          placeholder="Create password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          placeholder="Repeat password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? "Loading..." : "Create account"}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.linkText}>Login here</Text>
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
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  back: {
    color: "#2563EB",
    fontSize: 15,
    marginBottom: 14,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 22,
  },
  label: {
    fontSize: 15,
    color: "#374151",
    marginBottom: 8,
    marginTop: 10,
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
  createButton: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 24,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  bottomText: {
    color: "#6B7280",
  },
  linkText: {
    color: "#2563EB",
    fontWeight: "600",
  },
});
