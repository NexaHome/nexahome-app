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
        const deviceMap = {};
        const categoryMap = {};
        dbDevices.forEach((d) => {
          deviceMap[d._id] = d.name;
          categoryMap[d._id] = (d.category || "").toLowerCase();
        });

        const logs = result.data.logsByHome || [];

        const formattedAlerts = logs.map((log) => {
          let parsedValue = {};
          try {
            if (typeof log.value === "string") {
              parsedValue = JSON.parse(log.value);
            } else {
              parsedValue = log.value || {};
            }
          } catch (e) {}

          const level = getStatusLevel(parsedValue.status);
          const category = categoryMap[log.device_id] || "";
          const icon = ICON_MAP[category] || "📡";

          let detail = "";
          if (parsedValue.formatted) {
            detail = `Nilai: ${parsedValue.formatted}`;
          } else if (parsedValue.value !== undefined) {
            detail = `Raw: ${parsedValue.value}`;
          }
          if (parsedValue.status) {
            detail = `Status: ${parsedValue.status}${detail ? " · " + detail : ""}`;
          }

          return {
            id: log._id,
            title: deviceMap[log.device_id] || "Perangkat",
            level,
            icon,
            category,
            detail: detail || "Tidak ada detail",
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

        {/* Summary Counters */}
        {!loading && alerts.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderColor: "#FF5C7A", backgroundColor: "#FFF0F3" }]}>
              <Text style={[styles.summaryNumber, { color: "#FF5C7A" }]}>
                {criticalCount}
              </Text>
              <Text style={styles.summaryLabel}>Critical</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: "#7B61FF", backgroundColor: "#F0ECFF" }]}>
              <Text style={[styles.summaryNumber, { color: "#7B61FF" }]}>
                {warningCount}
              </Text>
              <Text style={styles.summaryLabel}>Warning</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: "#D8DEE9", backgroundColor: "#FFFFFF" }]}>
              <Text style={[styles.summaryNumber, { color: "#64748B" }]}>
                {alerts.length - criticalCount - warningCount}
              </Text>
              <Text style={styles.summaryLabel}>Normal</Text>
            </View>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filters}>
          {["All", "Critical", "Warning"].map((filter) => {
            const active = filterMode === filter;
            return (
              <AnimatedPressable
                key={filter}
                style={[styles.filter, active && styles.filterActive]}
                onPress={() => { setFilterMode(filter); setVisibleCount(PAGE_SIZE); }}
              >
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
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
            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  { backgroundColor: tone.card, borderColor: tone.border },
                ]}
              >
                <View style={styles.cardIconRow}>
                  <Text style={styles.cardIcon}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardTime}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: tone.badge },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: tone.badgeText },
                      ]}
                    >
                      {item.level}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.detail, { color: tone.text }]}>
                  {item.detail}
                </Text>
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: "900",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    marginTop: 2,
  },
  filters: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  filter: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  filterActive: {
    backgroundColor: "#0A0F2C",
    borderColor: "#0A0F2C",
  },
  filterText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  filterTextActive: { color: "#FFFFFF" },
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
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0A0F2C",
  },
  cardTime: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  detail: {
    fontSize: 12,
    marginTop: 2,
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
