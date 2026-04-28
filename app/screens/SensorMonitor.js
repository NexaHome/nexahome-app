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
import { getAntaresData, getAntaresLogs, getSensorsByHome } from "../utils/antares";

const SensorMonitor = ({ navigation }) => {
  const [sensors, setSensors] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAntaresData = async () => {
    try {
      const dbSensors = await getSensorsByHome();
      const validSensors = dbSensors.filter(d => d.category);

      const liveData = await getAntaresData(); 
      
      const updatedSensors = validSensors.map(s => {
        const category = s.category.toLowerCase();
        const antares = liveData?.sensors?.[category] || s.last_value;

        if (antares && typeof antares === 'object') {
          let unit = "";
          if (category === "fire") unit = "";
          if (category === "gas") unit = " ppm";
          if (category === "water") unit = " cm";
          if (category === "light") unit = " lux";

          const safeStatuses = ["normal", "safe", "low", "clear", "dry"];
          const currentStatus = antares.status ? antares.status.toLowerCase() : "unknown";

          return { 
            id: s._id,
            category: category,
            label: s.name, 
            value: `${antares.value !== undefined ? antares.value : '--'}${unit}`,
            state: antares.status ? antares.status.charAt(0).toUpperCase() + antares.status.slice(1) : "Unknown",
            tone: safeStatuses.includes(currentStatus) ? "green" : "amber"
          };
        }

        return {
          id: s._id,
          category: category,
          label: s.name,
          value: "--",
          state: "Offline",
          tone: "amber"
        };
      });
      setSensors(updatedSensors);

      // Only fetch logs if we have activeHomeId
      const activeHomeId = await SecureStore.getItemAsync("activeHomeId");
      if (activeHomeId) {
        const historyLogs = await getAntaresLogs();
        if (historyLogs) {
          setLogs(historyLogs);
        }
      }
    } catch (error) {
      if (error.message !== "Home not found") {
        console.log("Antares fetch failed:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAntaresData();
    const interval = setInterval(fetchAntaresData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Map logs to chart bars (example: gas sensor values)
  const gasLogs = logs.filter(log => log.device_info?.category?.toLowerCase() === "gas");
  const chartData = gasLogs.slice(-10).map(log => {
    const gasVal = log.value?.value || 0;
    // Scale gasVal (0-4095) to chart height (0-100)
    return Math.min(100, Math.floor((gasVal / 4095) * 100));
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
