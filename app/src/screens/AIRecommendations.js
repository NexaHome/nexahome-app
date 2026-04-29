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
import ScreenShell from "../components/ScreenShell";
import { postGraphQL } from "../../utils/api";

const PRIORITY_STYLE = {
  high: {
    card: "#FFF0F3",
    border: "#FF5C7A",
    text: "#FF5C7A",
    badge: "#FF5C7A",
    badgeText: "#FFFFFF",
    label: "High Priority",
  },
  medium: {
    card: "#F0ECFF",
    border: "#7B61FF",
    text: "#6D4DFF",
    badge: "#7B61FF",
    badgeText: "#FFFFFF",
    label: "Medium Priority",
  },
  low: {
    card: "#E6FAFF",
    border: "#00D4FF",
    text: "#036B82",
    badge: "#00D4FF",
    badgeText: "#FFFFFF",
    label: "Info",
  },
};

const AIRecommendations = ({ navigation }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const parseRecs = (raw) =>
    (raw || []).map((r) => {
      const priority =
        r.tags?.find((t) => ["high", "medium", "low"].includes(t)) || "low";
      const category =
        r.tags?.find((t) => !["high", "medium", "low"].includes(t)) ||
        "general";
      return {
        id: r._id,
        title: r.title,
        description: r.description,
        priority,
        category,
        source: r.source,
        confidence: r.confidence,
        createdAt: r.createdAt,
      };
    });

  // Auto-generate: call mutation on load so AI analyses current sensor data
  const loadRecommendations = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const token = await SecureStore.getItemAsync("token");
      const activeHomeId = await SecureStore.getItemAsync("activeHomeId");

      if (!token || !activeHomeId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Always generate fresh recommendations from current sensor data
      const query = `
        mutation {
          generateHomeRecommendations {
            _id
            title
            description
            confidence
            tags
            source
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
      if (result.data?.generateHomeRecommendations) {
        setRecommendations(parseRecs(result.data.generateHomeRecommendations));
      }
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRecommendations(true);
  };

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
          <AnimatedPressable onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </AnimatedPressable>
          <Text style={styles.title}>✨ AI Insights</Text>
          <Text style={styles.subtitle}>
            Automated recommendations based on current sensor conditions
          </Text>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#7B61FF" />
            <Text style={styles.loadingText}>
              Analyzing sensor data...
            </Text>
          </View>
        )}

        {/* Empty */}
        {!loading && recommendations.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyTitle}>No recommendations</Text>
            <Text style={styles.emptySubtitle}>
              Pull down to refresh sensor analysis.
            </Text>
          </View>
        )}

        {/* Recommendation Cards */}
        {!loading &&
          recommendations.map((item) => {
            const tone = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.low;
            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  { backgroundColor: tone.card, borderColor: tone.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View
                    style={[styles.badge, { backgroundColor: tone.badge }]}
                  >
                    <Text
                      style={[styles.badgeText, { color: tone.badgeText }]}
                    >
                      {tone.label}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardDesc, { color: tone.text }]}>
                  {item.description}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.sourceTag}>
                    {item.source === "ai" ? "🤖 AI" : "📊 Analysis"}
                  </Text>
                  {item.confidence != null && (
                    <Text style={styles.confidence}>
                      Confidence: {Math.round(item.confidence * 100)}%
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

        <View style={{ height: 30 }} />
      </ScrollView>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 26 },
  header: {
    marginBottom: 20,
  },
  backBtn: {
    fontSize: 14,
    color: "#7B61FF",
    fontWeight: "800",
    marginBottom: 12,
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
    marginTop: 4,
  },
  loadingBox: {
    alignItems: "center",
    marginTop: 60,
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
    paddingHorizontal: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0A0F2C",
    flex: 1,
    paddingRight: 8,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  sourceTag: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
  },
  confidence: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
  },
});

export default AIRecommendations;
