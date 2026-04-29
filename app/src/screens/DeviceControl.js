import React, { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import * as SecureStore from "expo-secure-store";
import { postGraphQL } from "../../utils/api";
import { useTheme } from "../../theme";

const DeviceControl = ({ route, navigation }) => {
  const { theme, mode } = useTheme();
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
        const homeId = await SecureStore.getItemAsync("activeHomeId");
        if (!token || !homeId) throw new Error("Authentication failed. Please login again.");

        const query = `
          query Device($deviceId: String!) {
            device(id: $deviceId) {
              _id room_id name type status is_active category last_value
            }
          }
        `;

        const response = await postGraphQL(
          { query, variables: { deviceId } },
          { Authorization: `Bearer ${token}`, "x-home-id": homeId }
        );

        const result = await response.json();
        if (!response.ok || result.errors?.length) {
          throw new Error(result.errors?.[0]?.message || "Failed to fetch device");
        }

        const deviceData = result.data?.device || null;
        setDevice(deviceData);
        setPower(!!deviceData?.is_active);

        const numericValue = Number(deviceData?.last_value);
        setBrightness(Number.isFinite(numericValue) ? numericValue : 50);
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDevice();
  }, [deviceId, roomId]);

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: power ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [heroAnim, power]);

  const heroBg = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [mode === 'dark' ? "#1E293B" : "#F1F5F9", mode === 'dark' ? "#4338CA" : "#7B61FF"],
  });

  const knobX = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 26],
  });

  const deviceName = device?.name || "Device";
  const category = (device?.category || "").toLowerCase();
  const isDimmable = category === "lamp" || category === "light";
  const onlineText = power ? "Active" : "Inactive";

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const token = await SecureStore.getItemAsync("token");
      const homeId = await SecureStore.getItemAsync("activeHomeId");
      
      const query = `
        query LogsByDevice($deviceId: String!) {
          logsByDevice(deviceId: $deviceId) { _id value createdAt }
        }
      `;

      const response = await postGraphQL(
        { query, variables: { deviceId } },
        { Authorization: `Bearer ${token}`, "x-home-id": homeId }
      );

      const result = await response.json();
      setLogs(result.data?.logsByDevice || []);
    } catch (err) {
      setLogsError("Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTogglePower = async () => {
    const nextPower = !power;
    try {
      const token = await SecureStore.getItemAsync("token");
      const homeId = await SecureStore.getItemAsync("activeHomeId");
      
      const mutation = `
        mutation UpdateDevice($id: String!, $input: UpdateDeviceInput!) {
          updateDevice(id: $id, updateDeviceInput: $input) { _id is_active }
        }
      `;
      
      await postGraphQL(
        { query: mutation, variables: { id: deviceId, input: { is_active: nextPower, status: nextPower ? "ON" : "OFF" } } },
        { Authorization: `Bearer ${token}`, "x-home-id": homeId }
      );

      setPower(nextPower);
      if (showLogs) fetchLogs();
    } catch (err) {
      setActionError("Failed to update device");
    }
  };

  const handleDeleteDevice = async () => {
    try {
      setDeleting(true);
      const token = await SecureStore.getItemAsync("token");
      const homeId = await SecureStore.getItemAsync("activeHomeId");
      
      const mutation = `mutation DeleteDevice($id: String!) { deleteDevice(id: $id) }`;
      await postGraphQL(
        { query: mutation, variables: { id: deviceId } },
        { Authorization: `Bearer ${token}`, "x-home-id": homeId }
      );
      navigation.goBack();
    } catch (err) {
      setActionError("Failed to remove device");
    } finally {
      setDeleting(false);
    }
  };

  const formatLogValue = (val) => {
    if (!val) return "No data";
    try {
      // Handle potential double stringification
      let parsed = typeof val === "string" ? JSON.parse(val) : val;
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      
      // Handle sensor specific JSON
      if (parsed.status) {
        // Special case for binary/digital sensors (Fire, Water, etc.)
        const sensorType = (parsed.sensor || "").toLowerCase();
        if (sensorType === "fire" || sensorType === "water" || sensorType === "gas" || sensorType === "rain") {
          return `Status: ${parsed.status.toUpperCase()}`;
        }
        
        // General formatted status
        if (parsed.formatted && parsed.formatted !== "0 %") {
          return `${parsed.status.toUpperCase()} (${parsed.formatted})`;
        }
        return `Status: ${parsed.status.toUpperCase()}`;
      }

      // Handle simple numeric/boolean
      if (typeof parsed !== 'object') {
        const s = String(parsed).toUpperCase();
        if (s === "1" || s === "ON" || s === "TRUE") return "Turned ON";
        if (s === "0" || s === "OFF" || s === "FALSE") return "Turned OFF";
        return s;
      }

      return "Device Updated";
    } catch {
      const s = String(val).toUpperCase();
      if (s === "1" || s === "ON") return "Turned ON";
      if (s === "0" || s === "OFF") return "Turned OFF";
      return s;
    }
  };

  const getEmoji = () => {
    if (category === 'lamp') return "💡";
    if (category === 'fan') return "🌬️";
    if (category === 'ac') return "❄️";
    if (category === 'security') return "🛡️";
    return "📱";
  };

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.navHeader}>
          <AnimatedPressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
          </AnimatedPressable>
        </View>

        <Animated.View style={[styles.hero, { backgroundColor: heroBg }]}>
          <View style={styles.devicePlate}>
            <Text style={{ fontSize: 42 }}>{getEmoji()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: power ? "#22C55E" : "#94A3B8" }]}>
            <Text style={styles.statusBadgeText}>{onlineText}</Text>
          </View>
        </Animated.View>

        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.handle} />
          
          <View style={styles.infoSection}>
            <Text style={[styles.title, { color: theme.text }]}>{deviceName}</Text>
            <Text style={styles.subtitle}>{category.toUpperCase()} • Connected</Text>
          </View>

          <View style={[styles.controlBox, { backgroundColor: mode === 'dark' ? "rgba(255,255,255,0.03)" : "#F8FAFC" }]}>
            <View style={styles.controlRow}>
              <View>
                <Text style={[styles.controlTitle, { color: theme.text }]}>Main Power</Text>
                <Text style={styles.controlSub}>{power ? "Device is currently running" : "Device is stopped"}</Text>
              </View>
              <AnimatedPressable style={[styles.switch, power && styles.switchOn]} onPress={handleTogglePower}>
                <Animated.View style={[styles.knob, { transform: [{ translateX: knobX }] }]} />
              </AnimatedPressable>
            </View>
          </View>

          {isDimmable && (
            <View style={styles.dimmerSection}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Intensity - {brightness}%</Text>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${brightness}%` }]} />
              </View>
              <View style={styles.stepperRow}>
                {[25, 50, 75, 100].map((level) => (
                  <AnimatedPressable
                    key={level}
                    style={[styles.stepBtn, brightness === level && styles.stepBtnActive, { borderColor: theme.border }]}
                    onPress={() => setBrightness(level)}
                  >
                    <Text style={[styles.stepText, brightness === level && styles.stepTextActive]}>{level}%</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actionGrid}>
            <AnimatedPressable 
              style={[styles.primaryActionBtn, { backgroundColor: mode === 'dark' ? "rgba(123, 97, 255, 0.15)" : "#F1EEFF" }]}
              onPress={() => navigation.navigate("CreateSchedule", { deviceId, deviceName })}
            >
              <Text style={styles.primaryActionEmoji}>⏰</Text>
              <Text style={styles.primaryActionText}>Manage Schedule</Text>
            </AnimatedPressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.historyHeader}>
            <Text style={[styles.sectionLabel, { color: theme.text, marginBottom: 0 }]}>Recent Activity</Text>
            <AnimatedPressable onPress={() => { setShowLogs(!showLogs); if(!showLogs) fetchLogs(); }}>
              <Text style={styles.logToggleText}>{showLogs ? "Hide" : "Show"}</Text>
            </AnimatedPressable>
          </View>

          {showLogs && (
            <View style={styles.logContent}>
              {logsLoading ? (
                <ActivityIndicator size="small" color="#7B61FF" style={{ marginVertical: 20 }} />
              ) : logs.length === 0 ? (
                <View style={styles.emptyLogsContainer}>
                  <Text style={styles.emptyLogs}>No recent activity detected.</Text>
                </View>
              ) : (
                <View style={styles.timelineContainer}>
                  {logs.slice(0, 5).map((log, index) => {
                    const isLast = index === Math.min(logs.length, 5) - 1;
                    const val = String(log.value).toUpperCase();
                    const isOff = val.includes("OFF") || val === "0";
                    const isOn = val.includes("ON") || val === "1";
                    
                    let dotColor = "#7B61FF";
                    if (isOn) dotColor = "#22C55E";
                    if (isOff) dotColor = "#EF4444";

                    return (
                      <View key={log._id} style={styles.timelineItem}>
                        <View style={styles.timelineLeft}>
                          <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
                          {!isLast && <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />}
                        </View>
                        <View style={styles.timelineRight}>
                          <View style={styles.logMainRow}>
                            <Text style={[styles.logVal, { color: theme.text }]}>
                              {formatLogValue(log.value)}
                            </Text>
                            <Text style={styles.logTime}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          </View>
                          <Text style={styles.logDate}>{new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <AnimatedPressable 
            style={[styles.removeBtn, deleting && { opacity: 0.5 }]} 
            onPress={handleDeleteDevice}
            disabled={deleting}
          >
            <Text style={styles.removeText}>{deleting ? "Removing..." : "Remove Device"}</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
      <BottomNav active="home" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { minHeight: "100%" },
  navHeader: { position: "absolute", top: 20, left: 20, zIndex: 10 },
  backBtn: { padding: 8 },
  backText: { fontSize: 16, fontWeight: "800" },
  hero: { height: 300, alignItems: "center", justifyContent: "center", paddingTop: 40 },
  devicePlate: { width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  statusBadge: { marginTop: 20, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  sheet: { marginTop: -30, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 100, borderTopWidth: 1 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 24 },
  infoSection: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: "#64748B", fontWeight: "700", marginTop: 4 },
  controlBox: { borderRadius: 24, padding: 20, marginBottom: 24 },
  controlRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  controlTitle: { fontSize: 17, fontWeight: "800" },
  controlSub: { fontSize: 13, color: "#64748B", marginTop: 2 },
  switch: { width: 56, height: 32, borderRadius: 16, backgroundColor: "#E2E8F0", padding: 3 },
  switchOn: { backgroundColor: "#22C55E" },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4 },
  dimmerSection: { marginBottom: 24 },
  sectionLabel: { fontSize: 15, fontWeight: "800", marginBottom: 12 },
  sliderTrack: { height: 8, borderRadius: 4, backgroundColor: "#E2E8F0", overflow: "hidden" },
  sliderFill: { height: "100%", backgroundColor: "#7B61FF" },
  stepperRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  stepBtn: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepBtnActive: { backgroundColor: "#0A0F2C", borderColor: "#0A0F2C" },
  stepText: { fontSize: 13, fontWeight: "800", color: "#64748B" },
  stepTextActive: { color: "#FFFFFF" },
  actionGrid: { marginBottom: 24 },
  primaryActionBtn: { 
    height: 56, 
    borderRadius: 18, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center",
    gap: 10
  },
  primaryActionEmoji: { fontSize: 18 },
  primaryActionText: { fontSize: 15, fontWeight: "800", color: "#7B61FF" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 24 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logToggleText: { color: "#7B61FF", fontSize: 14, fontWeight: "800" },
  logContent: { marginBottom: 10 },
  timelineContainer: { paddingLeft: 4 },
  timelineItem: { flexDirection: "row", minHeight: 60 },
  timelineLeft: { alignItems: "center", width: 20, marginRight: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, zIndex: 1 },
  timelineLine: { width: 2, flex: 1, marginTop: -2, marginBottom: -4 },
  timelineRight: { flex: 1, paddingBottom: 20 },
  logMainRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logVal: { fontSize: 14, fontWeight: "700" },
  logTime: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  logDate: { fontSize: 11, color: "#94A3B8", marginTop: 2, fontWeight: "600" },
  emptyLogsContainer: { paddingVertical: 20, alignItems: "center", backgroundColor: "rgba(0,0,0,0.02)", borderRadius: 16 },
  emptyLogs: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },
  removeBtn: { marginTop: 20, height: 54, borderRadius: 18, backgroundColor: "#FFF1F2", alignItems: "center", justifyContent: "center" },
  removeText: { color: "#E11D48", fontSize: 15, fontWeight: "800" },
});

export default DeviceControl;
