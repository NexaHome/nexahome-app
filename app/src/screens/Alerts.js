import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { postGraphQL } from "../../utils/api";

const ICON_MAP = {
  fire: "🔥",
  gas: "💨",
  water: "💧",
  rain: "🌧️",
  light: "💡",
};

const LEVEL_STYLE = {
  Critical: {
    card: "#FFF0F3",
    border: "#FF5C7A",
    text: "#FF5C7A",
    badge: "#FF5C7A",
    badgeText: "#FFFFFF",
  },
  Warning: {
    card: "#F0ECFF",
    border: "#7B61FF",
    text: "#6D4DFF",
    badge: "#7B61FF",
    badgeText: "#FFFFFF",
  },
  Info: {
    card: "#FFFFFF",
    border: "#D8DEE9",
    text: "#64748B",
    badge: "#EEF2F7",
    badgeText: "#64748B",
  },
};

function formatTime(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Baru saja";
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} jam lalu`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} hari lalu`;
  } catch {
    return "";
  }
}

function getStatusLevel(status) {
  if (!status) return "Info";
  const st = status.toLowerCase();
  if (["danger", "high", "abnormal", "detected"].includes(st)) return "Critical";
  if (["warning", "medium", "rainy", "low"].includes(st)) return "Warning";
  return "Info";
}

const PAGE_SIZE = 10;

const Alerts = ({ navigation }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMode, setFilterMode] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchAlerts = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const token = await SecureStore.getItemAsync("token");
      const activeHomeId = await SecureStore.getItemAsync("activeHomeId");

      if (!token || !activeHomeId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const query = `
        query DevicesAndLogs {
          devicesByHome {
            _id
            name
            category
            room_id
          }
          roomsByHomeBasic {
            _id
            name
          }
          alertsByHome(limit: 50) {
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
        const dbRooms = result.data.roomsByHomeBasic || [];
        const roomMap = Object.fromEntries(dbRooms.map(r => [r._id, r.name]));
        
        const deviceMap = {};
        const deviceMeta = {};
        dbDevices.forEach((d) => {
          deviceMap[d._id] = d.name;
          deviceMeta[d._id] = {
            category: (d.category || "").toLowerCase(),
            room: roomMap[d.room_id] || "No Room"
          };
        });

        const logs = result.data.alertsByHome || [];

        const formattedAlerts = logs.map((log) => {
          let parsedValue = {};
          try {
            parsedValue = typeof log.value === "string" ? JSON.parse(log.value) : (log.value || {});
          } catch (e) {}

          const level = getStatusLevel(parsedValue.status);
          const meta = deviceMeta[log.device_id] || { category: "", room: "Unknown" };
          const icon = ICON_MAP[meta.category] || "📡";

          let detail = "";
          if (parsedValue.formatted) {
            detail = parsedValue.formatted;
          } else if (parsedValue.value !== undefined) {
            detail = `Value: ${parsedValue.value}`;
          }

          return {
            id: log._id,
            title: deviceMap[log.device_id] || "Unknown Device",
            room: meta.room,
            level,
            icon,
            status: parsedValue.status || 'Active',
            detail,
            createdAt: log.createdAt,
          };
        });

        // Sort newest first
        formattedAlerts.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setAlerts(formattedAlerts);
      }
    } catch (err) {
      console.error("Gagal mengambil alerts", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts(true);
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterMode === "Critical") return a.level === "Critical";
    if (filterMode === "Warning") return a.level === "Warning";
    return true;
  });

  const visibleAlerts = filteredAlerts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAlerts.length;

  const criticalCount = alerts.filter((a) => a.level === "Critical").length;
  const warningCount = alerts.filter((a) => a.level === "Warning").length;

  return (
    <ScreenShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7B61FF"
            colors={["#7B61FF"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Alerts</Text>
            <Text style={styles.subtitle}>
              {alerts.length > 0
                ? `${alerts.length} log terbaru`
                : "Belum ada data"}
            </Text>
          </View>
        </View>
        {!loading && alerts.length > 0 && (
          <View style={styles.summaryRow}>
            <AnimatedPressable 
              onPress={() => { setFilterMode("Critical"); setVisibleCount(PAGE_SIZE); }}
              style={[styles.summaryCard, { borderColor: "#FF5C7A", backgroundColor: "#FFF1F2" }]}
            >
              <Text style={styles.summaryIcon}>🔴</Text>
              <Text style={[styles.summaryNumber, { color: "#E11D48" }]}>{criticalCount}</Text>
              <Text style={styles.summaryLabel}>Critical</Text>
            </AnimatedPressable>
            
            <AnimatedPressable 
              onPress={() => { setFilterMode("Warning"); setVisibleCount(PAGE_SIZE); }}
              style={[styles.summaryCard, { borderColor: "#7B61FF", backgroundColor: "#F5F3FF" }]}
            >
              <Text style={styles.summaryIcon}>🟡</Text>
              <Text style={[styles.summaryNumber, { color: "#7B61FF" }]}>{warningCount}</Text>
              <Text style={styles.summaryLabel}>Warning</Text>
            </AnimatedPressable>

            <AnimatedPressable 
              onPress={() => { setFilterMode("All"); setVisibleCount(PAGE_SIZE); }}
              style={[styles.summaryCard, { borderColor: "#F1F5F9", backgroundColor: "#F8FAFC" }]}
            >
              <Text style={styles.summaryIcon}>🟢</Text>
              <Text style={[styles.summaryNumber, { color: "#475569" }]}>{alerts.length - criticalCount - warningCount}</Text>
              <Text style={styles.summaryLabel}>Normal</Text>
            </AnimatedPressable>
          </View>
        )}

        {/* Filters Title */}
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filter by Severity</Text>
          {filterMode !== "All" && (
            <AnimatedPressable onPress={() => setFilterMode("All")}>
              <Text style={styles.resetText}>Clear</Text>
            </AnimatedPressable>
          )}
        </View>

        {/* Filter Chips */}
        <View style={styles.filters}>
          {["All", "Critical", "Warning"].map((filter) => {
            const active = filterMode === filter;
            return (
              <AnimatedPressable
                key={filter}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => { setFilterMode(filter); setVisibleCount(PAGE_SIZE); }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#7B61FF" />
            <Text style={styles.loadingText}>Memuat alert...</Text>
          </View>
        )}

        {/* Empty */}
        {!loading && filteredAlerts.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>Tidak ada alert</Text>
            <Text style={styles.emptySubtitle}>
              {filterMode !== "All"
                ? `Tidak ada alert ${filterMode.toLowerCase()} saat ini.`
                : "Semua sensor dalam kondisi normal."}
            </Text>
          </View>
        )}

        {/* Alert Cards */}
        {!loading &&
          visibleAlerts.map((item) => {
            const tone = LEVEL_STYLE[item.level] || LEVEL_STYLE.Info;
            const isCritical = item.level === "Critical";

            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  { backgroundColor: tone.card, borderColor: tone.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: isCritical ? "#FFE4E8" : "#F1F5F9" }]}>
                    <Text style={styles.cardIcon}>{item.icon}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardRoom}>{item.room}</Text>
                      <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={[styles.cardStatus, { color: tone.text }]}>
                        {item.status} • {item.detail}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: tone.badge }]}>
                        <Text style={[styles.badgeText, { color: tone.badgeText }]}>
                          {item.level}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

        {/* Show More Button */}
        {!loading && hasMore && (
          <AnimatedPressable
            style={styles.showMoreBtn}
            onPress={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          >
            <Text style={styles.showMoreText}>
              Tampilkan lebih banyak ({filteredAlerts.length - visibleCount} sisa)
            </Text>
          </AnimatedPressable>
        )}

        {/* Counter info */}
        {!loading && filteredAlerts.length > 0 && (
          <Text style={styles.counterInfo}>
            Menampilkan {Math.min(visibleCount, filteredAlerts.length)} dari {filteredAlerts.length} alert
          </Text>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
      <BottomNav active="alerts" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 26 },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#0A0F2C",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryIcon: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "900",
  },
  summaryLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0A0F2C",
  },
  resetText: {
    color: "#7B61FF",
    fontSize: 13,
    fontWeight: "700",
  },
  filters: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
    minWidth: 70,
    alignItems: "center",
  },
  filterChipActive: {
    backgroundColor: "#0A0F2C",
    borderColor: "#0A0F2C",
  },
  filterChipText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  filterChipTextActive: { color: "#FFFFFF" },
  loadingBox: {
    alignItems: "center",
    marginTop: 40,
  },
  loadingText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 10,
  },
  emptyBox: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#0A0F2C",
    fontSize: 16,
    fontWeight: "800",
  },
  emptySubtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  cardRoom: {
    color: "#7B61FF",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0A0F2C",
    marginBottom: 6,
  },
  cardTime: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
    paddingRight: 8,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  showMoreBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  showMoreText: {
    color: "#7B61FF",
    fontSize: 13,
    fontWeight: "800",
  },
  counterInfo: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 4,
  },
});

export default Alerts;
