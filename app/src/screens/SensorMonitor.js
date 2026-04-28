import React, { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(true);

  const fetchSensorData = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const activeHomeId = await SecureStore.getItemAsync("activeHomeId");

      if (!token || !activeHomeId) {
        setLoading(false);
        return;
      }

      const query = `
        query DevicesAndLogs {
          devicesByHome {
            _id
            name
            type
            status
            category
            last_value
          }
          logsByHome {
            _id
            device_id
            value
            createdAt
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
          if (valObj.formatted) {
            displayValue = valObj.formatted;
          } else if (valObj.value !== undefined) {
            displayValue = String(valObj.value);
          }

          // Define warning states
          const isAmber = d.status && d.status !== 'Safe' && d.status !== 'Normal' && d.status !== 'Clear';

          return {
            id: d._id,
            label: d.name,
            value: displayValue,
            state: d.status || 'Unknown',
            tone: isAmber ? 'amber' : 'green',
            category: d.category
          };
        });
        
        setSensors(mappedSensors);
        
        const dbLogs = result.data.logsByHome || [];
        setLogs(dbLogs);
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

  // Map logs to chart bars (example: fire/gas sensor values)
  const chartData = logs.slice(-10).map((log) => {
    let valObj = {};
    if (log.value) {
      try { valObj = JSON.parse(log.value); } catch (e) {}
    }
    const val = Number(valObj.value) || 0;
    // Scale value (0-4095) to chart height (0-100)
    return Math.min(100, Math.floor((val / 4095) * 100));
  });

  const displayBars =
    chartData.length > 0 ? chartData : [34, 52, 41, 72, 58, 86, 62, 46, 68, 78];

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
            <Text style={styles.subtitle}>Rumah Utama - live data</Text>
          </View>
          {loading && <ActivityIndicator color="#7B61FF" />}
        </View>

        <View style={styles.sensorGrid}>
          {sensors.map((sensor) => {
            const isAmber = sensor.tone === "amber";
            return (
              <View
                key={sensor.id}
                style={[styles.sensorCard, isAmber && styles.sensorCardAmber]}
              >
                <Text style={styles.sensorLabel}>{sensor.label}</Text>
                <Text style={styles.sensorValue}>{sensor.value}</Text>
                <View
                  style={[styles.statusPill, isAmber && styles.statusPillAmber]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isAmber && styles.statusTextAmber,
                    ]}
                  >
                    {sensor.state}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reading history</Text>
          <AnimatedPressable style={styles.filterButton}>
            <Text style={styles.filterText}>Filter</Text>
          </AnimatedPressable>
        </View>
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            {displayBars.map((height, index) => (
              <View key={`${height}-${index}`} style={styles.barWrap}>
                <View style={[styles.bar, { height: `${height}%` }]} />
              </View>
            ))}
          </View>
          <Text style={styles.chartCaption}>last 24 hours</Text>
        </View>

        <Text style={styles.sectionTitle}>Linked automations</Text>
        <View style={styles.automationCard}>
          <View style={styles.automationDot} />
          <Text style={styles.automationText}>
            Gas above 300 ppm turns exhaust fan on
          </Text>
        </View>
        <View style={styles.automationCard}>
          <View style={styles.automationDotAmber} />
          <Text style={styles.automationText}>
            Bright light lowers living room lamp
          </Text>
        </View>
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
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  sensorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sensorCard: {
    width: "48%",
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    padding: 14,
    justifyContent: "space-between",
  },
  sensorCardAmber: {
    borderColor: "#7B61FF",
    backgroundColor: "#F0ECFF",
  },
  sensorLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  sensorValue: {
    color: "#0A0F2C",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#00D4FF",
    backgroundColor: "#E6FAFF",
  },
  statusPillAmber: {
    borderColor: "#7B61FF",
    backgroundColor: "#F0ECFF",
  },
  statusText: {
    color: "#036B82",
    fontSize: 12,
    fontWeight: "800",
  },
  statusTextAmber: {
    color: "#6D4DFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0A0F2C",
  },
  filterButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  filterText: {
    color: "#7B61FF",
    fontSize: 13,
    fontWeight: "800",
  },
  chartCard: {
    minHeight: 170,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    padding: 18,
    justifyContent: "flex-end",
  },
  chart: {
    height: 102,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  barWrap: {
    width: "8%",
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    borderRadius: 8,
    backgroundColor: "#00D4FF",
  },
  chartCaption: {
    color: "#94A3B8",
    textAlign: "center",
    fontSize: 12,
    marginTop: 13,
  },
  automationCard: {
    minHeight: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 9,
  },
  automationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00D4FF",
  },
  automationDotAmber: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7B61FF",
  },
  automationText: {
    flex: 1,
    color: "#0A0F2C",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default SensorMonitor;
