import React, { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import * as SecureStore from "expo-secure-store";
import { postGraphQL } from "../../utils/api";

const DeviceControl = ({ route, navigation }) => {
  const deviceId = route.params?.deviceId;
  const roomId = route.params?.roomId;
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [power, setPower] = useState(false);
  const [brightness, setBrightness] = useState(50);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchDevice = async () => {
      if (!deviceId) {
        setError("Device ID not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          throw new Error("Token not found, please log in again.");
        }

        const homeId = await SecureStore.getItemAsync("activeHomeId");
        if (!homeId) {
          throw new Error("Active home not found.");
        }

        const query = `
          query Device($deviceId: String!) {
            device(id: $deviceId) {
              _id
              room_id
              name
              type
              status
              is_active
              category
              antares_device_name
              last_value
              createdAt
            }
          }
        `;

        const response = await postGraphQL(
          {
            query,
            variables: { deviceId },
          },
          {
            Authorization: `Bearer ${token}`,
            "x-home-id": homeId,
            ...(roomId ? { "x-room-id": roomId } : {}),
          },
        );

        const result = await response.json();
        if (!response.ok || result.errors?.length) {
          throw new Error(
            result.errors?.[0]?.message || "Failed to fetch device",
          );
        }

        const deviceData = result.data?.device || null;
        setDevice(deviceData);
        setPower(!!deviceData?.is_active);

        const numericValue = Number(deviceData?.last_value);
        setBrightness(Number.isFinite(numericValue) ? numericValue : 50);
      } catch (fetchError) {
        setError(fetchError.message || "An error occurred");
        setDevice(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDevice();
  }, [deviceId, roomId]);

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: power ? 1 : 0,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [heroAnim, power]);

  const heroColor = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#EEF2F7", "#FFF1A8"],
  });

  const knobX = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 25],
  });

  const brightnessWidth = `${brightness}%`;
  const deviceName = device?.name || "Device";
  const deviceType = device?.category || device?.type || "-";
  const deviceStatus = device?.status || (power ? "ON" : "OFF");
  const onlineText = power ? "Online" : "Offline";

  const fetchLogs = async () => {
    if (!deviceId) {
      setLogsError("Device ID not found.");
      return;
    }

    try {
      setLogsLoading(true);
      setLogsError("");

      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        throw new Error("Token not found, please log in again.");
      }

      const homeId = await SecureStore.getItemAsync("activeHomeId");
      if (!homeId) {
        throw new Error("Active home not found.");
      }

      const query = `
        query LogsByDevice($deviceId: String!) {
          logsByDevice(deviceId: $deviceId) {
            _id
            device_id
            value
            createdAt
          }
        }
      `;

      const response = await postGraphQL(
        {
          query,
          variables: { deviceId },
        },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": homeId,
          ...(roomId ? { "x-room-id": roomId } : {}),
        },
      );

      const result = await response.json();
      if (!response.ok || result.errors?.length) {
        throw new Error(result.errors?.[0]?.message || "Failed to load logs");
      }

      setLogs(result.data?.logsByDevice || []);
    } catch (logError) {
      setLogsError(logError.message || "An error occurred");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTogglePower = async () => {
    const nextPower = !power;
    try {
      setActionError("");
      const token = await SecureStore.getItemAsync("token");
      if (!token) throw new Error("Token not found, please log in again.");

      const homeId = await SecureStore.getItemAsync("activeHomeId");
      if (!homeId) throw new Error("Active home not found.");

      const mutation = `
        mutation UpdateDevice($id: String!, $input: UpdateDeviceInput!) {
          updateDevice(id: $id, updateDeviceInput: $input) {
            _id
            status
            is_active
          }
        }
      `;
      
      const response = await postGraphQL(
        {
          query: mutation,
          variables: {
            id: deviceId,
            input: {
              status: nextPower ? "ON" : "OFF",
              is_active: nextPower,
            },
          },
        },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": homeId,
          ...(roomId ? { "x-room-id": roomId } : {}),
        },
      );

      const result = await response.json();
      if (!response.ok || result.errors?.length) {
        throw new Error(result.errors?.[0]?.message || "Failed to update status");
      }

      setPower(nextPower);
      if (showLogs) fetchLogs();
    } catch (toggleError) {
      setActionError(toggleError.message || "An error occurred");
    }
  };

  const handleToggleLogs = async () => {
    const next = !showLogs;
    setShowLogs(next);
    if (next) {
      fetchLogs();
    }
  };

  const handleDeleteDevice = async () => {
    if (!deviceId) {
      setActionError("Device ID not found.");
      return;
    }

    try {
      setDeleting(true);
      setActionError("");

      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        throw new Error("Token not found, please log in again.");
      }

      const homeId = await SecureStore.getItemAsync("activeHomeId");
      if (!homeId) {
        throw new Error("Active home not found.");
      }

      const mutation = `
        mutation DeleteDevice($deleteDeviceId: String!) {
          deleteDevice(id: $deleteDeviceId)
        }
      `;

      const response = await postGraphQL(
        {
          query: mutation,
          variables: { deleteDeviceId: deviceId },
        },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": homeId,
          ...(roomId ? { "x-room-id": roomId } : {}),
        },
      );

      const result = await response.json();
      if (!response.ok || result.errors?.length) {
        throw new Error(
          result.errors?.[0]?.message || "Failed to remove device",
        );
      }

      navigation.goBack();
    } catch (deleteError) {
      setActionError(deleteError.message || "An error occurred");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScreenShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedPressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>Back</Text>
        </AnimatedPressable>

        <Animated.View style={[styles.hero, { backgroundColor: heroColor }]}>
          <View style={styles.deviceGlow} />
          <View style={styles.devicePlate}>
            <View style={styles.deviceCore} />
          </View>
        </Animated.View>

        <View style={styles.sheet}>
          <View style={styles.handle} />
          {loading && <Text style={styles.infoText}>Loading device...</Text>}
          {!loading && !!error && <Text style={styles.errorText}>{error}</Text>}
          {!!actionError && <Text style={styles.errorText}>{actionError}</Text>}
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{deviceName}</Text>
            </View>
            <View style={styles.onlinePill}>
              <Text style={styles.onlineText}>{onlineText}</Text>
            </View>
          </View>
        

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Power</Text>
            <AnimatedPressable
              style={[styles.switch, power && styles.switchOn]}
              onPress={handleTogglePower}
            >
              <Animated.View
                style={[styles.knob, { transform: [{ translateX: knobX }] }]}
              />
            </AnimatedPressable>
          </View>

          <Text style={styles.controlLabel}>Status - {deviceStatus}</Text>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: brightnessWidth }]} />
          </View>
          <View style={styles.stepperRow}>
            {[30, 55, 80, 100].map((level) => (
              <AnimatedPressable
                key={level}
                style={[
                  styles.stepButton,
                  brightness === level && styles.stepButtonActive,
                ]}
                onPress={() => setBrightness(level)}
              >
                <Text
                  style={[
                    styles.stepText,
                    brightness === level && styles.stepTextActive,
                  ]}
                >
                  {level}%
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          <View style={styles.buttonGrid}>
            <AnimatedPressable
              style={styles.secondaryButton}
              onPress={() =>
                navigation.navigate("CreateSchedule", {
                  deviceId: device?._id,
                  deviceName: device?.name,
                })
              }
            >
              <Text style={styles.secondaryText}>Add schedule</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Add automation</Text>
            </AnimatedPressable>
          </View>
          {showLogs && (
            <View style={styles.logCard}>
              <Text style={styles.logTitle}>Device log</Text>
              {logsLoading && (
                <Text style={styles.infoText}>Loading logs...</Text>
              )}
              {!logsLoading && !!logsError && (
                <Text style={styles.errorText}>{logsError}</Text>
              )}
              {!logsLoading && !logsError && !logs.length && (
                <Text style={styles.infoText}>No logs available.</Text>
              )}
              {!!logs.length &&
                logs.map((log) => (
                  <View key={log._id} style={styles.logItem}>
                    <Text style={styles.logValue}>{log.value}</Text>
                    <Text style={styles.logTime}>{log.createdAt}</Text>
                  </View>
                ))}
            </View>
          )}
          <AnimatedPressable
            style={styles.wideButton}
            onPress={handleToggleLogs}
          >
            <Text style={styles.secondaryText}>
              {showLogs ? "Hide device log" : "View device log"}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[
              styles.removeButton,
              deleting && styles.removeButtonDisabled,
            ]}
            onPress={handleDeleteDevice}
            disabled={deleting}
          >
            <Text style={styles.removeText}>
              {deleting ? "Removing..." : "Remove device"}
            </Text>
          </AnimatedPressable>
        </View>
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
    minHeight: "100%",
  },
  backButton: {
    position: "absolute",
    top: 18,
    left: 20,
    zIndex: 2,
    paddingVertical: 8,
    paddingRight: 16,
  },
  backText: {
    color: "#7B61FF",
    fontSize: 15,
    fontWeight: "800",
  },
  hero: {
    height: 330,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#FFFFFF",
    opacity: 0.55,
  },
  devicePlate: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0A0F2C",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  deviceCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#00D4FF",
  },
  sheet: {
    marginTop: -26,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: "#D8DEE9",
  },
  handle: {
    alignSelf: "center",
    width: 58,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#D8DEE9",
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0A0F2C",
    letterSpacing: 0,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 3,
  },
  infoText: {
    color: "#64748B",
    fontSize: 13,
    marginBottom: 8,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    marginBottom: 8,
  },
  onlinePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#00D4FF",
    backgroundColor: "#E6FAFF",
  },
  onlineText: {
    color: "#036B82",
    fontSize: 12,
    fontWeight: "800",
  },
  controlRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  controlLabel: {
    color: "#0A0F2C",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  switch: {
    width: 54,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D8DEE9",
    padding: 3,
  },
  switchOn: {
    backgroundColor: "#00D4FF",
  },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  sliderTrack: {
    height: 10,
    borderRadius: 8,
    backgroundColor: "#EEF2F7",
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
    backgroundColor: "#0A0F2C",
    borderRadius: 8,
  },
  stepperRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 18,
  },
  stepButton: {
    flex: 1,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
  },
  stepButtonActive: {
    backgroundColor: "#0A0F2C",
    borderColor: "#0A0F2C",
  },
  stepText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
  },
  stepTextActive: {
    color: "#FFFFFF",
  },
  buttonGrid: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#0A0F2C",
    fontSize: 13,
    fontWeight: "700",
  },
  wideButton: {
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  logCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  logTitle: {
    color: "#0A0F2C",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  logItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#EEF2F7",
  },
  logValue: {
    color: "#0A0F2C",
    fontSize: 13,
    fontWeight: "700",
  },
  logTime: {
    color: "#94A3B8",
    fontSize: 12,
  },
  removeButton: {
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#FF5C7A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  removeButtonDisabled: {
    opacity: 0.6,
  },
  removeText: {
    color: "#FF5C7A",
    fontSize: 13,
    fontWeight: "800",
  },
});

export default DeviceControl;
