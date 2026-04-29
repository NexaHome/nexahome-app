import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Animated,
  PanResponder,
} from "react-native";
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

const formatTime = (trigger, remainingMs) => {
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
    // Use remainingMs if provided (for live countdown), otherwise use static format
    const ms = remainingMs !== undefined ? remainingMs : parsed.delayMs;
    if (ms <= 0) return "Executing...";

    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  return "--:--";
};

const formatRepeat = (trigger) => {
  const parsed = parseAutomationJson(trigger);
  if (parsed?.type === "schedule") {
    if (parsed.days && parsed.days.length > 0) {
      if (parsed.days.length === 7) return "Daily";
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return parsed.days.map(d => dayNames[d]).join(", ");
    }
    return "Once";
  }
  if (parsed?.type === "delay") return "Once";
  return "Manual";
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

const hasExecutedAfterQueue = (queuedAt, lastExecutedAt) => {
  if (!queuedAt || !lastExecutedAt) return false;
  const queuedTime = new Date(queuedAt).getTime();
  const executedTime = new Date(lastExecutedAt).getTime();

  if (!Number.isFinite(queuedTime) || !Number.isFinite(executedTime))
    return false;
  return executedTime > queuedTime;
};

const Schedule = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [revealedCardId, setRevealedCardId] = useState(null);
  const [now, setNow] = useState(Date.now());
  const panResponderRef = useRef({});
  const countdownIntervalRef = useRef(null);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("token");
      const activeHomeId = await SecureStore.getItemAsync("activeHomeId");
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
                queuedAt
                lastExecutedAt
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

      const mapped = (result.data?.automations || [])
        .filter((automation) => {
          if (!activeHomeId) return true;

          const action = parseAutomationJson(automation.action);
          return action?.homeId === activeHomeId;
        })
        .map((automation) => ({
          executedAfterQueue: hasExecutedAfterQueue(
            automation.queuedAt,
            automation.lastExecutedAt,
          ),
          queuedAt: automation.queuedAt,
          lastExecutedAt: automation.lastExecutedAt,
          id: automation._id,
          name: automation.name,
          trigger: automation.trigger,
          action: automation.action,
          time: formatTime(automation.trigger),
          repeat: formatRepeat(automation.trigger),
          actionLabel: formatActionLabel(automation.action),
          active:
            typeof activeMap?.[automation._id] === "boolean"
              ? activeMap[automation._id]
              : true,
        }));

      const normalized = mapped.map((item) =>
        item.executedAfterQueue ? { ...item, active: false } : item,
      );

      setItems(normalized);

      // items include queuedAt/lastExecutedAt — remaining is derived from queuedAt + delayMs

      const nextMap = Object.fromEntries(
        normalized.map((item) => [item.id, item.active]),
      );
      await updateLocalActiveMap(nextMap);
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

  // Ticking `now` to derive remaining times from `queuedAt + delayMs` so re-mounts don't reset countdown
  useEffect(() => {
    countdownIntervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(countdownIntervalRef.current);
  }, []);

  const getRemainingMs = (item) => {
    const trigger = parseAutomationJson(item.trigger);
    const delayMs =
      trigger?.type === "delay" && typeof trigger.delayMs === "number"
        ? Math.max(0, Math.floor(trigger.delayMs))
        : getQueueDelayMs(item.trigger);

    if (!item.queuedAt) return delayMs;
    const queuedTime = new Date(item.queuedAt).getTime();
    if (!Number.isFinite(queuedTime)) return delayMs;
    return Math.max(0, queuedTime + (delayMs || 0) - now);
  };

  const checkExecutionStatus = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) return;

      const response = await postGraphQL(
        {
          query: `
            query {
              automations {
                _id
                queuedAt
                lastExecutedAt
              }
            }
          `,
        },
        { Authorization: `Bearer ${token}` },
      );

      const result = await response.json();
      if (result.errors?.length) return;

      const executionMap = Object.fromEntries(
        (result.data?.automations || []).map((auto) => [
          auto._id,
          hasExecutedAfterQueue(auto.queuedAt, auto.lastExecutedAt),
        ]),
      );

      setItems((current) => {
        const updated = current.map((item) => {
          const justExecuted =
            executionMap[item.id] && !item.executedAfterQueue;
          if (justExecuted) {
            return { ...item, active: false, executedAfterQueue: true };
          }
          return item;
        });
        return updated;
      });
    } catch (error) {
      console.error("Gagal check execution status", error);
    }
  }, []);

  // Poll backend while there are active delay schedules to catch real execution state
  useEffect(() => {
    const hasActiveDelay = items.some((item) => {
      if (!item.active) return false;
      const trigger = parseAutomationJson(item.trigger);
      return trigger?.type === "delay";
    });

    if (!hasActiveDelay) return;

    const interval = setInterval(() => {
      checkExecutionStatus();
    }, 1500);

    return () => clearInterval(interval);
  }, [items, checkExecutionStatus]);

  // Auto-execute action when countdown reaches 0
  useEffect(() => {
    const executeCountdownActions = async () => {
      for (const item of items) {
        if (!item.active) continue;

        const remaining = getRemainingMs(item);
        if (remaining <= 0) {
          try {
            const token = await SecureStore.getItemAsync("token");
            if (!token) continue;

            const action = parseAutomationJson(item.action);
            const homeId = action?.homeId;
            if (!homeId) continue;

            // Execute allDevicesOn or allDevicesOff based on action command
            const mutation =
              action?.command === "allDevicesOn"
                ? `mutation AllDevicesOn($homeId: String!) {
                  allDevicesOn(homeId: $homeId) {
                    affectedDevices
                    message
                  }
                }`
                : `mutation AllDevicesOff($homeId: String!) {
                  allDevicesOff(homeId: $homeId) {
                    affectedDevices
                    message
                  }
                }`;

            const response = await postGraphQL(
              { query: mutation, variables: { homeId } },
              {
                Authorization: `Bearer ${token}`,
                "x-home-id": homeId,
              },
            );

            const result = await response.json();
            if (!result.errors?.length) {
              // Toggle OFF after successful execution
              setItems((current) =>
                current.map((currentItem) =>
                  currentItem.id === item.id
                    ? { ...currentItem, active: false }
                    : currentItem,
                ),
              );

              const nextMap = Object.fromEntries(
                items.map((i) => [i.id, i.id === item.id ? false : i.active]),
              );
              await updateLocalActiveMap(nextMap);
            }
          } catch (error) {
            console.error("Gagal execute countdown action", error);
          }
        }
      }
    };

    executeCountdownActions();
  }, [now, items]);

  const updateLocalActiveMap = async (nextMap) => {
    await SecureStore.setItemAsync(ACTIVE_KEY, JSON.stringify(nextMap));
  };

  const toggleSchedule = async (item) => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const activeHomeId = await SecureStore.getItemAsync("activeHomeId");
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
        {
          Authorization: `Bearer ${token}`,
          ...(activeHomeId ? { "x-home-id": activeHomeId } : {}),
        },
      );
      const result = await response.json();

      if (result.errors?.length) {
        throw new Error(
          result.errors[0]?.message || "Gagal mengubah status schedule",
        );
      }

      if (nextActive) {
        const queueResult = result?.data?.queueAutomation;
        if (!queueResult?.queued) {
          throw new Error(queueResult?.message || "Automation belum ter-queue");
        }
      }

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                active: nextActive,
                queuedAt: nextActive
                  ? new Date().toISOString()
                  : currentItem.queuedAt,
              }
            : currentItem,
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

  const deleteSchedule = async (item) => {
    Alert.alert("Delete schedule", `Hapus "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(item.id);
            const token = await SecureStore.getItemAsync("token");
            if (!token) throw new Error("Token tidak ditemukan.");

            const response = await postGraphQL(
              {
                query: `mutation DeleteAutomation($id: String!) { deleteAutomation(id: $id) }`,
                variables: { id: item.id },
              },
              { Authorization: `Bearer ${token}` },
            );
            const result = await response.json();
            if (result.errors?.length)
              throw new Error(result.errors[0]?.message || "Gagal menghapus");

            fetchSchedules();
          } catch (error) {
            console.error("Gagal menghapus jadwal", error);
            Alert.alert("Error", error.message || "Gagal menghapus jadwal");
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const createPanResponder = (cardId) => {
    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (e, { dx }) => Math.abs(dx) > 10,
      onPanResponderMove: (e, { dx }) => {
        if (dx < -30) {
          setRevealedCardId(cardId);
        }
      },
      onPanResponderRelease: (e, { dx }) => {
        if (dx > -30) {
          setRevealedCardId(null);
        }
      },
    });
    return panResponder;
  };

  const getPanResponder = (cardId) => {
    if (!panResponderRef.current[cardId]) {
      panResponderRef.current[cardId] = createPanResponder(cardId);
    }
    return panResponderRef.current[cardId];
  };

  return (
    <ScreenShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        onScroll={() => setRevealedCardId(null)}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Automation</Text>
            <Text style={styles.title}>Routines</Text>
          </View>
          <AnimatedPressable
            style={styles.newButton}
            onPress={() => navigation.navigate("CreateSchedule")}
          >
            <View style={styles.newButtonIcon}>
              <Text style={styles.newButtonIconText}>+</Text>
            </View>
            <Text style={styles.newButtonText}>Create</Text>
          </AnimatedPressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Smart Routines</Text>
            <Text style={styles.heroText}>
              Manage your automated tasks and schedules. Toggle them on to activate the trigger.
            </Text>
          </View>
          <View style={styles.heroIconBox}>
            <Text style={{ fontSize: 32 }}>⚡</Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#7B61FF" />
          </View>
        )}

        {!loading && items.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Text style={{ fontSize: 30 }}>📅</Text>
            </View>
            <Text style={styles.emptyTitle}>No routines yet</Text>
            <Text style={styles.emptyText}>
              Your automated schedules will appear here. Tap "Create" to start your first routine.
            </Text>
          </View>
        )}

        {!loading &&
          items.map((item) => {
            const trigger = parseAutomationJson(item.trigger);
            const isDelay = trigger?.type === "delay";
            
            return (
              <View
                key={item.id}
                {...getPanResponder(item.id).panHandlers}
                style={styles.cardWrapper}
              >
                <View style={[styles.card, item.active && styles.cardActive]}>
                  <View style={styles.cardMain}>
                    <View style={[styles.typeIcon, item.active && styles.typeIconActive]}>
                      <Text style={{ fontSize: 18 }}>{isDelay ? "⏱️" : "⏰"}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaTime}>
                          {formatTime(item.trigger, getRemainingMs(item))}
                        </Text>
                        <View style={styles.dot} />
                        <Text style={styles.metaRepeat}>{item.repeat}</Text>
                      </View>
                      <View style={styles.actionBadge}>
                        <Text style={styles.actionBadgeText}>{item.actionLabel}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.cardRight}>
                    <Toggle
                      active={item.active}
                      onPress={() => toggleSchedule(item)}
                    />
                    {revealedCardId === item.id && (
                      <AnimatedPressable
                        style={styles.deleteAction}
                        onPress={() => deleteSchedule(item)}
                        disabled={deleting === item.id}
                      >
                        <Text style={styles.deleteActionText}>Delete</Text>
                      </AnimatedPressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

        {!loading && items.length > 0 && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>Swipe left on a card to delete</Text>
          </View>
        )}
      </ScrollView>
      <BottomNav active="schedule" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  kicker: {
    color: "#7B61FF",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0A0F2C",
    letterSpacing: -0.5,
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A0F2C",
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    borderRadius: 100,
    shadowColor: "#0A0F2C",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  newButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  newButtonIconText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  newButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  heroContent: {
    flex: 1,
    paddingRight: 16,
  },
  heroTitle: {
    color: "#0A0F2C",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
  },
  heroText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  heroIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 10,
  },
  emptyIconBox: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    color: "#0A0F2C",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardActive: {
    borderColor: "#7B61FF",
    backgroundColor: "#F9F8FF",
    elevation: 4,
    shadowOpacity: 0.1,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  typeIconActive: {
    backgroundColor: "#EEF2FF",
  },
  cardInfo: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    color: "#0A0F2C",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metaTime: {
    color: "#7B61FF",
    fontSize: 13,
    fontWeight: "800",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 8,
  },
  metaRepeat: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  actionBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionBadgeText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  deleteAction: {
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteActionText: {
    color: "#E11D48",
    fontSize: 11,
    fontWeight: "800",
  },
  hintBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  hintText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default Schedule;
