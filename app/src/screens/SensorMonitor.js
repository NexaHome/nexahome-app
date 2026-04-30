import React, { useState, useEffect, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { postGraphQL } from "../../utils/api";
import { useTheme } from "../../theme";

const { width } = Dimensions.get("window");

const SensorMonitor = ({ navigation }) => {
  const { theme, mode } = useTheme();
  const [sensors, setSensors] = useState([]);
  const [logs, setLogs] = useState([]);
  const [automations, set_automations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSensorId, setSelectedSensorId] = useState(null);
  const [homeName, setHomeName] = useState("Main Home");

  const fetchSensorData = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const activeHomeId = await SecureStore.getItemAsync("activeHomeId");
      if (!token || !activeHomeId) {
        setLoading(false);
        return;
      }

      const query = `
        query DevicesLogsAndAutomations {
          home { name }
          devicesByHome { _id name type status category last_value room_id }
          roomsByHomeBasic { _id name }
          logsByHome { _id device_id value createdAt }
          automations { _id name trigger action is_active }
        }
      `;

      const response = await postGraphQL(
        { query },
        { Authorization: `Bearer ${token}`, "x-home-id": activeHomeId },
      );
      const result = await response.json();
      if (result.data) {
        const dbDevices = result.data.devicesByHome || [];
        const dbRooms = result.data.roomsByHomeBasic || [];
        const roomMap = Object.fromEntries(dbRooms.map((r) => [r._id, r.name]));

        const mappedSensors = dbDevices
          .filter((d) => d.type === "sensor")
          .map((d) => {
            let valObj = {};
            if (d.last_value) {
              try {
                valObj = JSON.parse(d.last_value);
              } catch (e) {}
            }

            let displayValue = "-";
            const isDigital =
              d.category === "fire" ||
              d.category === "rain" ||
              d.name.toLowerCase().includes("fire") ||
              d.name.toLowerCase().includes("rain") ||
              d.name.toLowerCase().includes("api") ||
              d.name.toLowerCase().includes("hujan");
            if (valObj.formatted) {
              displayValue =
                isDigital && valObj.formatted.includes("%")
                  ? ""
                  : valObj.formatted;
            } else if (valObj.value !== undefined) {
              displayValue = isDigital ? "" : String(valObj.value);
            }

            let tone = "neutral";
            let icon = "📊";
            const statusLower = (d.status || "").toLowerCase().trim();
            const category = d.category || "";

            const nameLower = d.name.toLowerCase();
            if (
              category === "fire" ||
              nameLower.includes("fire") ||
              nameLower.includes("api")
            ) {
              icon = "🔥";
              tone =
                statusLower.includes("safe") ||
                statusLower.includes("normal") ||
                statusLower.includes("aman")
                  ? "green"
                  : "red";
            } else if (
              category === "rain" ||
              nameLower.includes("rain") ||
              nameLower.includes("hujan")
            ) {
              icon = "🌧️";
              tone =
                statusLower.includes("clear") ||
                statusLower.includes("safe") ||
                statusLower.includes("aman")
                  ? "green"
                  : "red";
            } else if (category === "gas" || nameLower.includes("gas")) {
              icon = "💨";
              tone =
                statusLower.includes("safe") ||
                statusLower.includes("normal") ||
                statusLower.includes("aman")
                  ? "green"
                  : "red";
            } else if (
              category === "water" ||
              nameLower.includes("water") ||
              nameLower.includes("air") ||
              nameLower.includes("banjir")
            ) {
              icon = "💧";
              tone =
                statusLower.includes("low") ||
                statusLower.includes("safe") ||
                statusLower.includes("normal") ||
                statusLower.includes("aman")
                  ? "green"
                  : "red";
            } else if (
              category === "light" ||
              nameLower.includes("light") ||
              nameLower.includes("cahaya") ||
              nameLower.includes("lux")
            ) {
              icon = "💡";
              tone = "green";
            }

            return {
              id: d._id,
              label: d.name,
              roomName: roomMap[d.room_id] || "No Room",
              value: displayValue,
              state: d.status || "Unknown",
              tone,
              icon,
              isDigital,
            };
          });

        setSensors(mappedSensors);
        if (!selectedSensorId && mappedSensors.length > 0) {
          const firstAnalog = mappedSensors.find((s) => !s.isDigital);
          setSelectedSensorId(
            firstAnalog ? firstAnalog.id : mappedSensors[0].id,
          );
        }
        setLogs(result.data.logsByHome || []);
        set_automations(result.data.automations || []);
        if (result.data.home?.name) setHomeName(result.data.home.name);
      }
    } catch (error) {
      console.log("Fetch failed:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 10000);
    return () => clearInterval(interval);
  }, []);

  const trendData = useMemo(() => {
    if (!selectedSensorId) return [];
    return logs
      .filter((l) => l.device_id === selectedSensorId)
      .slice(0, 15)
      .reverse()
      .map((log) => {
        let val = 0;
        try {
          const p =
            typeof log.value === "string" ? JSON.parse(log.value) : log.value;
          val = Number(p.value) || 0;
        } catch (e) {}
        return Math.min(100, Math.max(15, (val / 4095) * 100));
      });
  }, [logs, selectedSensorId]);

  return (
    <ScreenShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Sensor Center</Text>
            <View style={styles.liveRow}>
              <View style={styles.pulse} />
              <Text style={styles.subtitle}>
                {homeName} • Real-time Monitoring
              </Text>
            </View>
          </View>
          {loading && <ActivityIndicator color="#FF6B00" />}
        </View>

        <View style={styles.grid}>
          {sensors.map((s) => (
            <View
              key={s.id}
              style={[
                styles.card,
                s.tone === "red" && styles.cardRed,
                s.tone === "green" && styles.cardGreen,
                s.tone === "blue" && styles.cardBlue,
                s.tone === "amber" && styles.cardAmber,
              ]}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardRoom}>{s.roomName}</Text>
                  <Text style={styles.cardLabel} numberOfLines={1}>
                    {s.label}
                  </Text>
                </View>
                <Text style={styles.cardIcon}>{s.icon}</Text>
              </View>
              {s.isDigital ? (
                <Text
                  style={[
                    styles.digitalText,
                    s.tone === "red" && { color: "#E11D48" },
                    s.tone === "green" && { color: "#10B981" },
                  ]}
                >
                  {s.state}
                </Text>
              ) : (
                <View>
                  <Text style={styles.analogVal}>{s.value}</Text>
                  <View
                    style={[
                      styles.pill,
                      s.tone === "amber" && styles.pillAmber,
                      s.tone === "blue" && styles.pillBlue,
                      s.tone === "green" && styles.pillGreen,
                      s.tone === "red" && styles.pillRed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        s.tone === "amber" && styles.pillTextAmber,
                        s.tone === "blue" && styles.pillTextBlue,
                        s.tone === "green" && styles.pillTextGreen,
                        s.tone === "red" && styles.pillTextRed,
                      ]}
                    >
                      {s.state}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Trend Analysis</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipBar}
        >
          {sensors.map((s) => (
            <AnimatedPressable
              key={s.id}
              onPress={() => setSelectedSensorId(s.id)}
              style={[
                styles.chip,
                selectedSensorId === s.id && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedSensorId === s.id && styles.chipTextActive,
                ]}
              >
                {s.icon} {s.label}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>

        <View style={styles.chartBox}>
          <View style={styles.yLabels}>
            <Text style={styles.yText}>HIGH</Text>
            <Text style={styles.yText}>LOW</Text>
          </View>
          <View style={styles.chartArea}>
            {trendData.length === 0 ? (
              <Text style={styles.emptyChart}>No history available</Text>
            ) : (
              <View style={styles.bars}>
                {trendData.map((h, i) => (
                  <View key={i} style={styles.barWrap}>
                    <View style={[styles.bar, { height: `${h}%` }]} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Smart Automations</Text>
        {automations.length === 0 ? (
          <View style={styles.emptyAuto}>
            <Text style={styles.emptyAutoText}>
              No active rules linked to sensors.
            </Text>
          </View>
        ) : (
          automations.slice(0, 3).map((auto) => (
            <View key={auto._id} style={styles.autoCard}>
              <View style={styles.autoTop}>
                <View
                  style={[
                    styles.autoIndicator,
                    !auto.is_active && { backgroundColor: "#CBD5E1" },
                  ]}
                />
                <Text style={styles.autoName}>{auto.name}</Text>
              </View>
              <View style={styles.autoPath}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Trigger</Text>
                </View>
                <View style={styles.connector} />
                <View style={[styles.tag, { backgroundColor: "#F0FDF4" }]}>
                  <Text style={[styles.tagText, { color: "#166534" }]}>
                    Action
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <BottomNav active="sensors" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 22, paddingBottom: 100 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: "900", color: "#0A0F2C" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  subtitle: { color: "#64748B", fontSize: 13, fontWeight: "700" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "48%",
    minHeight: 140,
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    justifyContent: "space-between",
    shadowColor: "#0A0F2C",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardRed: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  cardGreen: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  cardBlue: { borderColor: "#93C5FD", backgroundColor: "#EFF6FF" },
  cardAmber: { borderColor: "#FDE68A", backgroundColor: "#FFFBEB" },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  cardRoom: {
    color: "#FF6B00",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  cardLabel: {
    color: "#0A0F2C",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  cardIcon: { fontSize: 24 },
  digitalText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#64748B",
    textAlign: "center",
    textTransform: "uppercase",
  },
  analogVal: { fontSize: 26, fontWeight: "900", color: "#0A0F2C" },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  pillAmber: { backgroundColor: "#FEF3C7", borderWidth: 0 },
  pillBlue: { backgroundColor: "#DBEAFE", borderWidth: 0 },
  pillGreen: { backgroundColor: "#D1FAE5", borderWidth: 0 },
  pillRed: { backgroundColor: "#FEE2E2", borderWidth: 0 },
  pillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.3,
  },
  pillTextAmber: { color: "#92400E" },
  pillTextBlue: { color: "#1E40AF" },
  pillTextGreen: { color: "#065F46" },
  pillTextRed: { color: "#991B1B" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0A0F2C",
    marginTop: 32,
    marginBottom: 16,
  },
  chipBar: { marginHorizontal: -22, paddingHorizontal: 22, marginBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: { backgroundColor: "#0A0F2C", borderColor: "#0A0F2C" },
  chipText: { color: "#64748B", fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: "#FFFFFF" },
  chartBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    flexDirection: "row",
    height: 180,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
  },
  yLabels: {
    justifyContent: "space-between",
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: "#F1F5F9",
  },
  yText: { color: "#94A3B8", fontSize: 9, fontWeight: "900" },
  chartArea: { flex: 1, paddingLeft: 16, justifyContent: "flex-end" },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: "100%",
  },
  barWrap: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  bar: {
    width: "100%",
    backgroundColor: "#FF6B00",
    borderRadius: 10,
    opacity: 0.8,
  },
  emptyChart: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 60,
  },
  autoCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    marginBottom: 12,
  },
  autoTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  autoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B00",
  },
  autoName: { fontSize: 15, fontWeight: "800", color: "#0A0F2C" },
  autoPath: { flexDirection: "row", alignItems: "center", gap: 10 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  tagText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  connector: { flex: 1, height: 1, backgroundColor: "#F1F5F9" },
  emptyAuto: {
    padding: 32,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    borderStyle: "dashed",
  },
  emptyAutoText: { color: "#64748B", fontSize: 14, fontWeight: "600" },
});

export default SensorMonitor;
