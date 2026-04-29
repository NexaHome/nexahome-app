import React, { useState, useEffect, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { postGraphQL } from "../../utils/api";

const SensorMonitor = ({ navigation }) => {
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
          home {
            name
          }
          devicesByHome {
            _id
            name
            type
            status
            category
            last_value
            room_id
          }
          roomsByHomeBasic {
            _id
            name
          }
          logsByHome {
            _id
            device_id
            value
            createdAt
          }
          automations {
            _id
            name
            trigger
            action
            is_active
          }
        }
      `;

      const response = await postGraphQL(
        { query },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": activeHomeId,
        }
      );

      const result = await response.json();
      if (result.data) {
        const dbDevices = result.data.devicesByHome || [];
        const dbRooms = result.data.roomsByHomeBasic || [];
        const roomMap = Object.fromEntries(dbRooms.map(r => [r._id, r.name]));

        // Only show devices marked as type 'sensor'
        const sensorDevices = dbDevices.filter(d => d.type === 'sensor');
        
        const mappedSensors = sensorDevices.map((d) => {
          let valObj = {};
          if (d.last_value) {
            try {
              valObj = JSON.parse(d.last_value);
            } catch (e) {}
          }
          
          let displayValue = "-";
          const isDigital = d.category === 'fire' || d.category === 'rain' || d.name.toLowerCase().includes('fire') || d.name.toLowerCase().includes('rain');

          if (valObj.formatted) {
            displayValue = valObj.formatted;
            // If digital, hide the "0 %" part if it's just showing percentage
            if (isDigital && displayValue.includes('%')) {
              displayValue = ""; // Don't show numeric value for digital
            }
          } else if (valObj.value !== undefined) {
            displayValue = isDigital ? "" : String(valObj.value);
          }

          // Improved tone and icon logic
          let tone = 'neutral';
          let icon = '📊';
          const statusLower = (d.status || '').toLowerCase();
          const category = d.category || '';

          if (category === 'fire' || d.name.toLowerCase().includes('fire')) {
            icon = '🔥';
            tone = statusLower === 'safe' ? 'green' : 'red';
          } else if (category === 'rain' || d.name.toLowerCase().includes('rain')) {
            icon = '🌧️';
            tone = statusLower === 'clear' ? 'green' : 'blue';
          } else if (category === 'gas' || d.name.toLowerCase().includes('gas')) {
            icon = '💨';
            tone = (statusLower === 'safe' || statusLower === 'normal') ? 'green' : 'red';
          } else if (category === 'water' || d.name.toLowerCase().includes('water')) {
            icon = '💧';
            tone = 'blue';
          } else if (category === 'light' || d.name.toLowerCase().includes('light')) {
            icon = '💡';
            tone = 'amber';
          }

          return {
            id: d._id,
            label: d.name,
            roomName: roomMap[d.room_id] || "No Room",
            value: displayValue,
            state: d.status || 'Unknown',
            tone,
            icon,
            isDigital,
            category: d.category
          };
        });
        
        setSensors(mappedSensors);
        if (!selectedSensorId && mappedSensors.length > 0) {
          // Default to the first analog sensor if possible
          const firstAnalog = mappedSensors.find(s => !s.isDigital);
          setSelectedSensorId(firstAnalog ? firstAnalog.id : mappedSensors[0].id);
        }
        setLogs(result.data.logsByHome || []);
        set_automations(result.data.automations || []);
        if (result.data.home?.name) {
          setHomeName(result.data.home.name);
        }
      }
    } catch (error) {
      console.log("Fetch failed:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Process trend data for the selected sensor
  const trendData = useMemo(() => {
    if (!selectedSensorId) return [];
    const sensorLogs = logs
      .filter(l => l.device_id === selectedSensorId)
      .slice(0, 15)
      .reverse();

    return sensorLogs.map(log => {
      let val = 0;
      try {
        const p = typeof log.value === 'string' ? JSON.parse(log.value) : log.value;
        val = Number(p.value) || 0;
      } catch (e) {}
      // Normalize based on 4095 max
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
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Sensor Monitor</Text>
            <View style={styles.liveContainer}>
              <View style={styles.liveDot} />
              <Text style={styles.subtitle}>{homeName} • Live Data</Text>
            </View>
          </View>
          {loading && <ActivityIndicator color="#7B61FF" />}
        </View>

        <View style={styles.sensorGrid}>
          {sensors.map((sensor) => {
            const isRed = sensor.tone === "red";
            const isGreen = sensor.tone === "green";
            const isBlue = sensor.tone === "blue";
            const isAmber = sensor.tone === "amber";

            return (
              <View
                key={sensor.id}
                style={[
                  styles.sensorCard,
                  isRed && styles.sensorCardRed,
                  isGreen && styles.sensorCardGreen,
                  isBlue && styles.sensorCardBlue,
                  isAmber && styles.sensorCardAmber,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfoLeft}>
                    <Text style={styles.sensorRoom}>{sensor.roomName}</Text>
                    <Text style={styles.sensorLabel} numberOfLines={1}>{sensor.label}</Text>
                  </View>
                  <Text style={styles.cardIcon}>{sensor.icon}</Text>
                </View>
                
                {sensor.isDigital ? (
                  <View style={styles.digitalContent}>
                    <Text style={[styles.digitalStatus, isRed && { color: "#E11D48" }, isGreen && { color: "#10B981" }]}>
                      {sensor.state}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.analogContent}>
                    <Text style={styles.sensorValue}>{sensor.value}</Text>
                    <View
                      style={[styles.statusPill, isAmber && styles.statusPillAmber, isBlue && styles.statusPillBlue]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isAmber && styles.statusTextAmber,
                          isBlue && styles.statusTextBlue,
                        ]}
                      >
                        {sensor.state}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trend Analysis</Text>
          <View style={styles.chartLegend}>
            <View style={[styles.dot, { backgroundColor: "#7B61FF" }]} />
            <Text style={styles.legendText}>Live Trend</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {sensors.map(s => (
            <AnimatedPressable 
              key={s.id} 
              onPress={() => setSelectedSensorId(s.id)}
              style={[styles.chip, selectedSensorId === s.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedSensorId === s.id && styles.chipTextActive]}>
                {s.icon} {s.label}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>

        <View style={styles.chartContainer}>
          <View style={styles.yAxis}>
            <Text style={styles.axisText}>High</Text>
            <Text style={styles.axisText}>Mid</Text>
            <Text style={styles.axisText}>Low</Text>
          </View>
          <View style={styles.chartFrame}>
            {trendData.length === 0 ? (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>No history data for this sensor</Text>
              </View>
            ) : (
              <View style={styles.barsContainer}>
                {trendData.map((h, i) => (
                  <View key={i} style={styles.barBox}>
                    <View style={[styles.trendBar, { height: `${h}%` }]} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Linked automations</Text>
        </View>

        {automations.length === 0 ? (
          <View style={styles.emptyAutomation}>
            <Text style={styles.emptyAutomationText}>No rules linked to these sensors yet.</Text>
          </View>
        ) : (
          automations.slice(0, 3).map((auto) => {
            const formatTrigger = (t) => {
              try {
                const p = typeof t === 'string' ? JSON.parse(t) : t;
                if (p.type === 'delay') return `Wait ${p.delayMs / 1000}s`;
                return p.type || t;
              } catch { return t; }
            };
            const formatAction = (a) => {
              try {
                const p = typeof a === 'string' ? JSON.parse(a) : a;
                if (p.command === 'allDevicesOff') return "All Off";
                if (p.command === 'allDevicesOn') return "All On";
                return p.command || a;
              } catch { return a; }
            };

            return (
              <View key={auto._id} style={styles.automationCard}>
                <View style={styles.automationHeader}>
                  <View style={[styles.automationDot, !auto.is_active && { backgroundColor: "#CBD5E1" }]} />
                  <Text style={styles.automationName}>{auto.name}</Text>
                </View>
                <View style={styles.automationBody}>
                  <View style={styles.recipeTag}>
                    <Text style={styles.recipeText}>{formatTrigger(auto.trigger)}</Text>
                  </View>
                  <Text style={{ color: "#94A3B8" }}>→</Text>
                  <View style={[styles.recipeTag, { backgroundColor: "#F0FDF4" }]}>
                    <Text style={[styles.recipeText, { color: "#166534" }]}>{formatAction(auto.action)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      <BottomNav active="sensors" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#0A0F2C",
    letterSpacing: 0,
    marginTop: 4,
  },
  liveContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    marginBottom: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  sensorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  sensorCard: {
    width: "48.5%",
    minHeight: 130,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  sensorCardRed: { borderColor: "#FECACA", backgroundColor: "#FFF1F2" },
  sensorCardGreen: { borderColor: "#DCFCE7", backgroundColor: "#F0FDF4" },
  sensorCardBlue: { borderColor: "#DBEAFE", backgroundColor: "#EFF6FF" },
  sensorCardAmber: { borderColor: "#FEF3C7", backgroundColor: "#FFFBEB" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardInfoLeft: { flex: 1, paddingRight: 4 },
  cardIcon: { fontSize: 22 },
  sensorRoom: {
    color: "#7B61FF",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  sensorLabel: {
    color: "#0A0F2C",
    fontSize: 13,
    fontWeight: "800",
  },
  analogContent: {
    marginTop: 8,
  },
  sensorValue: {
    color: "#0A0F2C",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  digitalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  digitalStatus: {
    fontSize: 18,
    fontWeight: "900",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  statusPillAmber: { backgroundColor: "#FEF3C7" },
  statusPillBlue: { backgroundColor: "#DBEAFE" },
  statusText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
  },
  statusTextAmber: { color: "#D97706" },
  statusTextBlue: { color: "#2563EB" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0A0F2C",
  },
  filterButton: {
    paddingHorizontal: 4,
  },
  filterText: {
    color: "#7B61FF",
    fontSize: 13,
    fontWeight: "800",
  },
  chipScroll: {
    marginBottom: 16,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#0A0F2C",
    borderColor: "#0A0F2C",
  },
  chipText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    padding: 20,
    flexDirection: "row",
    height: 180,
    marginBottom: 10,
  },
  yAxis: {
    justifyContent: "space-between",
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  axisText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  chartFrame: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: "flex-end",
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: "100%",
  },
  barBox: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  trendBar: {
    width: "100%",
    backgroundColor: "#7B61FF",
    borderRadius: 100,
    opacity: 0.8,
  },
  emptyChart: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChartText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  automationCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 12,
  },
  automationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  automationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00D4FF",
  },
  automationName: {
    color: "#0A0F2C",
    fontSize: 14,
    fontWeight: "800",
  },
  automationBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recipeTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  recipeText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyAutomation: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderStyle: "dashed",
  },
  emptyAutomationText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "500",
  },
});

export default SensorMonitor;
