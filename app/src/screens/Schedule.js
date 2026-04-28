import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "@react-navigation/native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import Toggle from "../components/Toggle";
import { postGraphQL } from "../../utils/api";

const ACTIVE_KEY = "schedule.active.map";

const parseAutomationJson = (value) => {
  if (!value) return null;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

const formatTime = (trigger) => {
  const parsed = parseAutomationJson(trigger);
  if (parsed?.type === "schedule" && parsed.runAt) {
    const date = new Date(parsed.runAt);
    if (!Number.isNaN(date.getTime())) {
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    }
  }

  if (parsed?.type === "delay" && typeof parsed.delayMs === "number") {
    const minutes = Math.max(1, Math.round(parsed.delayMs / 60000));
    return `+${minutes}m`;
  }

  return "--:--";
};

const formatRepeat = (trigger) => {
  const parsed = parseAutomationJson(trigger);
  if (parsed?.type === "schedule") return "daily";
  if (parsed?.type === "delay") return "once";
  return "manual";
};

const formatActionLabel = (action) => {
  const parsed = parseAutomationJson(action);
  if (!parsed) return "Action not available";

  const labels = {
    allDevicesOff: "All devices off",
    allDevicesOn: "All devices on",
    setAwayMode: `Away mode ${parsed.enabled === false ? "off" : "on"}`,
  };

  return labels[parsed.command] || parsed.command || "Action not available";
};

const getQueueDelayMs = (trigger) => {
  const parsed = parseAutomationJson(trigger);
  if (parsed?.type === "delay" && typeof parsed.delayMs === "number") {
    return Math.max(0, Math.floor(parsed.delayMs));
  }

  if (parsed?.type === "schedule" && parsed.runAt) {
    const scheduledTime = new Date(parsed.runAt).getTime();
    const delta = scheduledTime - Date.now();
    return Number.isFinite(delta) && delta > 0 ? Math.floor(delta) : 0;
  }

  return 0;
};

const Schedule = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("token");
      const activeMapRaw = await SecureStore.getItemAsync(ACTIVE_KEY);
      const activeMap = activeMapRaw ? JSON.parse(activeMapRaw) : {};

      if (!token) {
        setItems([]);
        return;
      }

      const response = await postGraphQL(
        {
          query: `
            query {
              automations {
                _id
                name
                trigger
                action
              }
            }
          `,
        },
        {
          Authorization: `Bearer ${token}`,
        },
      );

      const result = await response.json();
      if (result.errors?.length) {
        throw new Error(result.errors[0]?.message || "Gagal memuat schedules");
      }

      const mapped = (result.data?.automations || []).map((automation) => ({
        id: automation._id,
        name: automation.name,
        trigger: automation.trigger,
        time: formatTime(automation.trigger),
        repeat: formatRepeat(automation.trigger),
        actionLabel: formatActionLabel(automation.action),
        active:
          typeof activeMap?.[automation._id] === "boolean"
            ? activeMap[automation._id]
            : true,
      }));

      setItems(mapped);
    } catch (error) {
      console.error("Gagal memuat jadwal", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSchedules();
    }, [fetchSchedules]),
  );

  const updateLocalActiveMap = async (nextMap) => {
    await SecureStore.setItemAsync(ACTIVE_KEY, JSON.stringify(nextMap));
  };

  const toggleSchedule = async (item) => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        throw new Error("Token tidak ditemukan.");
      }

      const nextActive = !item.active;
      const mutation = nextActive
        ? `mutation QueueAutomation($id: String!, $delayMs: Float) {
            queueAutomation(id: $id, delayMs: $delayMs) {
              queued
              jobId
              message
            }
          }`
        : `mutation CancelAutomation($id: String!) {
            cancelAutomation(id: $id)
          }`;

      const variables = nextActive
        ? { id: item.id, delayMs: getQueueDelayMs(item.trigger) }
        : { id: item.id };

      const response = await postGraphQL(
        { query: mutation, variables },
        { Authorization: `Bearer ${token}` },
      );
      const result = await response.json();

      if (result.errors?.length) {
        throw new Error(result.errors[0]?.message || "Gagal mengubah status schedule");
      }

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? { ...currentItem, active: nextActive } : currentItem,
        ),
      );

      const nextMap = Object.fromEntries(
        items.map((currentItem) => [
          currentItem.id,
          currentItem.id === item.id ? nextActive : currentItem.active,
        ]),
      );
      await updateLocalActiveMap(nextMap);
    } catch (error) {
      console.error("Gagal mengubah status jadwal", error);
    }
  };

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Home automation</Text>
            <Text style={styles.title}>Schedules</Text>
          </View>
          <AnimatedPressable
            style={styles.newButton}
            onPress={() => navigation.navigate("CreateSchedule")}
          >
            <Text style={styles.newButtonText}>+ New</Text>
          </AnimatedPressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroBar} />
          <Text style={styles.heroTitle}>Manage your daily routines</Text>
          <Text style={styles.heroText}>
            Turn schedules on or off, and the backend will queue or cancel the automation for you.
          </Text>
        </View>

        {loading && (
          <ActivityIndicator size="small" color="#7B61FF" style={{ marginTop: 20 }} />
        )}

        {!loading && items.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Belum ada schedules</Text>
            <Text style={styles.emptyText}>
              Buat schedule baru lewat tombol + New, lalu data akan muncul di sini.
            </Text>
          </View>
        )}

        {!loading &&
          items.map((item) => (
            <View key={item.id} style={[styles.card, item.active && styles.cardActive]}>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.meta}>
                  Turn on - {item.time} - {item.repeat}
                </Text>
                <Text style={styles.actionLabel} numberOfLines={1}>
                  {item.actionLabel}
                </Text>
              </View>
              <Toggle active={item.active} onPress={() => toggleSchedule(item)} />
            </View>
          ))}

        {!loading && items.length > 0 && (
          <Text style={styles.hint}>Swipe left to edit or delete</Text>
        )}
      </ScrollView>
      <BottomNav active="schedule" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 26 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  kicker: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#0A0F2C",
  },
  newButton: {
    backgroundColor: "#0A0F2C",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  hero: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  heroBar: {
    width: 48,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#0A0F2C",
    opacity: 0.12,
    marginBottom: 12,
  },
  heroTitle: {
    color: "#0A0F2C",
    fontSize: 18,
    fontWeight: "900",
  },
  heroText: {
    color: "#64748B",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  emptyTitle: {
    color: "#0A0F2C",
    fontSize: 15,
    fontWeight: "900",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardActive: {
    borderColor: "#C9F0D6",
    backgroundColor: "#F7FFF9",
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
    fontWeight: "700",
  },
  actionLabel: {
    color: "#0F766E",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },
  hint: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 8,
  },
});

export default Schedule;
