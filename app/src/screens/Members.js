import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import Toggle from "../components/Toggle";
import { members } from "../data/homeData";

const Members = ({ navigation }) => {
  const [control, setControl] = useState(true);
  const [schedule, setSchedule] = useState(false);
  const [invite, setInvite] = useState(false);

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Members</Text>
          <AnimatedPressable style={styles.darkButton}>
            <Text style={styles.darkText}>+ Invite</Text>
          </AnimatedPressable>
        </View>

        {members.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.initials}>{member.initials}</Text>
            </View>
            <View style={styles.memberCopy}>
              <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
              <Text style={styles.role} numberOfLines={1}>{member.role}</Text>
            </View>
            <View style={[styles.badge, member.status === "Remove" && styles.badgeDanger, member.status === "Pending" && styles.badgeWarn]}>
              <Text style={[styles.badgeText, member.status === "Remove" && styles.badgeDangerText, member.status === "Pending" && styles.badgeWarnText]}>
                {member.status}
              </Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Permissions</Text>
        <View style={styles.permissionCard}>
          <View style={styles.permissionRow}>
            <Text style={styles.permissionText}>Control devices</Text>
            <Toggle active={control} onPress={() => setControl((value) => !value)} />
          </View>
          <View style={styles.permissionRow}>
            <Text style={styles.permissionText}>Manage schedules</Text>
            <Toggle active={schedule} onPress={() => setSchedule((value) => !value)} />
          </View>
          <View style={styles.permissionRowLast}>
            <Text style={styles.permissionText}>Invite members</Text>
            <Toggle active={invite} onPress={() => setInvite((value) => !value)} />
          </View>
        </View>
      </ScrollView>
      <BottomNav active="members" navigation={navigation} />
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
  title: { fontSize: 25, fontWeight: "900", color: "#0A0F2C", letterSpacing: 0 },
  darkButton: {
    backgroundColor: "#0A0F2C",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  darkText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  memberCard: {
    minHeight: 76,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 13,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E6FAFF",
    borderWidth: 1,
    borderColor: "#00D4FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  initials: { color: "#7B61FF", fontSize: 12, fontWeight: "900" },
  memberCopy: { flex: 1, paddingRight: 8 },
  memberName: { color: "#0A0F2C", fontSize: 14.5, fontWeight: "900" },
  role: { color: "#64748B", fontSize: 12, marginTop: 4 },
  badge: {
    minWidth: 58,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#00D4FF",
    backgroundColor: "#E6FAFF",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#036B82", fontSize: 11, fontWeight: "900" },
  badgeDanger: { borderColor: "#FF5C7A", backgroundColor: "#FFF0F3" },
  badgeDangerText: { color: "#FF5C7A" },
  badgeWarn: { borderColor: "#7B61FF", backgroundColor: "#F0ECFF" },
  badgeWarnText: { color: "#6D4DFF" },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "900",
    color: "#0A0F2C",
  },
  permissionCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 13,
  },
  permissionRow: {
    minHeight: 54,
    paddingHorizontal: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  permissionRowLast: {
    minHeight: 54,
    paddingHorizontal: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  permissionText: { color: "#0A0F2C", fontSize: 14, fontWeight: "700" },
});

export default Members;
