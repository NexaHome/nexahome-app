import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import Toggle from "../components/Toggle";
import { postGraphQL } from "../../utils/api";

const Schedule = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        
        const query = `
          query {
            automations {
              _id
              name
              trigger
              action
            }
          }
        `;
        
        const response = await postGraphQL(
          { query },
          { Authorization: `Bearer ${token}` }
        );
        
        const result = await response.json();
        if (result.data?.automations) {
          // Asumsi bahwa semua rules di sini bertindak sebagai jadwal
          setItems(result.data.automations.map(a => ({
            id: a._id,
            name: a.name,
            time: "00:00", // Waktu dummy karena trigger string
            repeat: "Setiap hari",
            device: a.action,
            active: true
          })));
        }
      } catch (err) {
        console.error("Gagal memuat jadwal", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchedules();
  }, []);

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

        {loading && <ActivityIndicator size="small" color="#7B61FF" style={{ marginTop: 20 }} />}
        
        {!loading && items.length === 0 && (
          <Text style={{ color: "#64748B", marginTop: 20 }}>Belum ada jadwal yang dibuat.</Text>
        )}

        {!loading && items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.meta}>Turn on - {item.time} - {item.repeat}</Text>
              <Text style={styles.device} numberOfLines={1}>{item.device}</Text>
            </View>
            <Toggle active={item.active} onPress={() => toggleSchedule(item.id)} />
          </View>
        ))}
        {!loading && items.length > 0 && <Text style={styles.hint}>Swipe left to edit or delete</Text>}
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
