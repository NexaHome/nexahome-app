import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { sensors } from "../data/homeData";

const chartBars = [34, 52, 41, 72, 58, 86, 62, 46, 68, 78];

const SensorMonitor = ({ navigation }) => {
  return (
    <ScreenShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Sensor Monitor</Text>
        <Text style={styles.subtitle}>Rumah Utama - live data</Text>

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
                <View style={[styles.statusPill, isAmber && styles.statusPillAmber]}>
                  <Text style={[styles.statusText, isAmber && styles.statusTextAmber]}>
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
            {chartBars.map((height, index) => (
              <View key={`${height}-${index}`} style={styles.barWrap}>
                <View style={[styles.bar, { height }]} />
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
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#20211E",
    letterSpacing: 0,
    marginTop: 4,
  },
  subtitle: {
    color: "#8A8D86",
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
    borderColor: "#DADDD4",
    backgroundColor: "#FFFFFF",
    padding: 14,
    justifyContent: "space-between",
  },
  sensorCardAmber: {
    borderColor: "#F1BD47",
    backgroundColor: "#FFF8E4",
  },
  sensorLabel: {
    color: "#8E918A",
    fontSize: 13,
    fontWeight: "600",
  },
  sensorValue: {
    color: "#20211E",
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
    borderColor: "#8DD897",
    backgroundColor: "#F0FFF2",
  },
  statusPillAmber: {
    borderColor: "#F1BD47",
    backgroundColor: "#FFF2CB",
  },
  statusText: {
    color: "#278039",
    fontSize: 12,
    fontWeight: "800",
  },
  statusTextAmber: {
    color: "#B27700",
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
    color: "#22231F",
  },
  filterButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  filterText: {
    color: "#3478F6",
    fontSize: 13,
    fontWeight: "800",
  },
  chartCard: {
    minHeight: 170,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DADDD4",
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
    backgroundColor: "#48B75A",
  },
  chartCaption: {
    color: "#B0B3AC",
    textAlign: "center",
    fontSize: 12,
    marginTop: 13,
  },
  automationCard: {
    minHeight: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DADDD4",
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
    backgroundColor: "#48B75A",
  },
  automationDotAmber: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F1BD47",
  },
  automationText: {
    flex: 1,
    color: "#42443E",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default SensorMonitor;
