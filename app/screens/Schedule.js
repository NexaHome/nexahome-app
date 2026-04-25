import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import Toggle from "../components/Toggle";
import { schedules } from "../data/homeData";

const Schedule = ({ navigation }) => {
  const [items, setItems] = useState(schedules);

  const toggleSchedule = (id) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item
      )
    );
  };

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Schedules</Text>
          <AnimatedPressable style={styles.darkButton} onPress={() => navigation.navigate("Automation")}>
            <Text style={styles.darkText}>Rules</Text>
          </AnimatedPressable>
        </View>

        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.meta}>Turn on - {item.time} - {item.repeat}</Text>
              <Text style={styles.device} numberOfLines={1}>{item.device}</Text>
            </View>
            <Toggle active={item.active} onPress={() => toggleSchedule(item.id)} />
          </View>
        ))}
        <Text style={styles.hint}>Swipe left to edit or delete</Text>
      </ScrollView>
      <BottomNav active="schedule" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 26 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#0A0F2C",
    letterSpacing: 0,
  },
  darkButton: {
    backgroundColor: "#0A0F2C",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  darkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  card: {
    minHeight: 76,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 13,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardCopy: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    color: "#0A0F2C",
    fontSize: 16,
    fontWeight: "900",
  },
  meta: {
    color: "#64748B",
    fontSize: 12.5,
    marginTop: 4,
  },
  device: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 3,
  },
  hint: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 8,
  },
});

export default Schedule;
