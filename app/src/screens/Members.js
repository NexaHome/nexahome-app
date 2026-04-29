import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import Toggle from "../components/Toggle";
import { postGraphQL } from "../../utils/api";

const Members = ({ navigation }) => {
  const [members, setMembers] = useState([]);
  const [home, setHome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [permissions, setPermissions] = useState({
    control: true,
    schedule: false,
    invite: false,
  });
  const [saving, setSaving] = useState(false);

  const initialsFromName = useCallback((name = "") => {
    const text = String(name).trim();
    if (!text) return "M";
    return text
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("token");
      const homeId = await SecureStore.getItemAsync("activeHomeId");

      if (!token) {
        navigation.replace("Login");
        return;
      }

      if (!homeId) {
        setMembers([]);
        setHome(null);
        return;
      }

      const response = await postGraphQL(
        {
          query: `
            query MembersByHome($homeId: String!) {
              home {
                _id
                name
                owner_id
              }
              membersByHome(homeId: $homeId) {
                userId
                name
                email
              }
            }
          `,
          variables: { homeId },
        },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": homeId,
        },
      );

      const result = await response.json();

      if (result.errors?.length) {
        throw new Error(result.errors[0]?.message || "Gagal memuat members");
      }

      setHome(result.data?.home || null);
      const memberList = result.data?.membersByHome || [];
      setMembers(memberList);

      // Select first non-owner member by default if none selected
      if (!selectedMember && memberList.length > 0) {
        const ownerIdStr = String(result.data?.home?.owner_id);
        const firstMember = memberList.find(m => String(m.userId) !== ownerIdStr);
        if (firstMember) {
          handleSelectMember(firstMember);
        }
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Gagal memuat members");
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      Alert.alert("Error", "Email member tidak boleh kosong");
      return;
    }

    try {
      setInviting(true);
      const token = await SecureStore.getItemAsync("token");
      const homeId = await SecureStore.getItemAsync("activeHomeId");

      if (!token) {
        navigation.replace("Login");
        return;
      }

      if (!homeId) {
        Alert.alert("Error", "Tidak ada home aktif");
        return;
      }

      const response = await postGraphQL(
        {
          query: `
            mutation AddHomeMember($homeId: String!, $addHomeMemberInput: AddHomeMemberInput!) {
              addHomeMember(homeId: $homeId, addHomeMemberInput: $addHomeMemberInput) {
                _id
                user_id
              }
            }
          `,
          variables: {
            homeId,
            addHomeMemberInput: { email },
          },
        },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": homeId,
        },
      );

      const result = await response.json();

      if (result.errors?.length) {
        throw new Error(result.errors[0]?.message || "Gagal invite member");
      }

      setInviteEmail("");
      await loadMembers();
      Alert.alert("Sukses", "Member berhasil diinvite");
    } catch (error) {
      Alert.alert("Error", error.message || "Gagal invite member");
    } finally {
      setInviting(false);
    }
  };

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setPermissions({
      control: member.can_control_devices,
      schedule: member.can_manage_schedules,
      invite: member.can_invite_members,
    });
  };

  const updatePermission = async (key, value) => {
    if (!selectedMember || saving) return;

    const newPermissions = { ...permissions, [key]: value };
    setPermissions(newPermissions);

    try {
      setSaving(true);
      const token = await SecureStore.getItemAsync("token");
      const homeId = await SecureStore.getItemAsync("activeHomeId");

      const response = await postGraphQL(
        {
          query: `
            mutation UpdatePermissions($homeId: String!, $targetUserId: String!, $input: UpdateMemberPermissionsInput!) {
              updateMemberPermissions(homeId: $homeId, targetUserId: $targetUserId, input: $input)
            }
          `,
          variables: {
            homeId,
            targetUserId: selectedMember.userId,
            input: {
              can_control_devices: newPermissions.control,
              can_manage_schedules: newPermissions.schedule,
              can_invite_members: newPermissions.invite,
            },
          },
        },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": homeId,
        },
      );

      const result = await response.json();
      if (result.errors?.length) throw new Error(result.errors[0].message);

      // Update local members list to keep it in sync
      setMembers(prev => prev.map(m => 
        m.userId === selectedMember.userId 
          ? { 
              ...m, 
              can_control_devices: newPermissions.control,
              can_manage_schedules: newPermissions.schedule,
              can_invite_members: newPermissions.invite 
            } 
          : m
      ));
    } catch (error) {
      Alert.alert("Error", "Failed to update permissions");
      // Rollback on error
      setPermissions(permissions);
    } finally {
      setSaving(false);
    }
  };

  const ownerId = home?.owner_id ? String(home.owner_id) : "";
  const memberCount = members.length;

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aOwner = String(a.userId) === ownerId;
      const bOwner = String(b.userId) === ownerId;
      if (aOwner === bOwner) return 0;
      return aOwner ? -1 : 1;
    });
  }, [members, ownerId]);

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AnimatedPressable 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </AnimatedPressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Members</Text>
            <Text style={styles.subtitle}>
              {home?.name
                ? `Manage members for ${home.name}`
                : "Select a home to view members"}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{memberCount}</Text>
            <Text style={styles.summaryLabel}>Total members</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {home?.name ? "Active" : "None"}
            </Text>
            <Text style={styles.summaryLabel}>Active home</Text>
          </View>
        </View>

        <View style={styles.inviteCard}>
          <Text style={styles.cardTitle}>Invite member</Text>
          <TextInput
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="Email member"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            editable={!inviting}
          />
          <AnimatedPressable
            style={[styles.inviteButton, inviting && { opacity: 0.7 }]}
            onPress={handleInvite}
            disabled={inviting}
          >
            {inviting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.inviteButtonText}>+ Invite</Text>
            )}
          </AnimatedPressable>
        </View>

        <Text style={styles.sectionTitle}>Member list</Text>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading members...</Text>
          </View>
        ) : sortedMembers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Belum ada member</Text>
            <Text style={styles.emptySubtitle}>
              Invite member baru untuk mulai mengelola home bersama.
            </Text>
          </View>
        ) : (
          sortedMembers.map((member) => {
            const isOwner = String(member.userId) === ownerId;
            const isSelected = selectedMember?.userId === member.userId;
            return (
              <AnimatedPressable
                key={member.userId}
                style={[
                  styles.memberCard,
                  isSelected && styles.memberCardSelected,
                ]}
                onPress={() => !isOwner && handleSelectMember(member)}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.initials}>
                    {initialsFromName(member.name)}
                  </Text>
                </View>
                <View style={styles.memberCopy}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  <Text style={styles.role} numberOfLines={1}>
                    {member.email}
                  </Text>
                </View>
                <View style={[styles.badge, isOwner && styles.badgeOwner]}>
                  <Text
                    style={[styles.badgeText, isOwner && styles.badgeOwnerText]}
                  >
                    {isOwner ? "Owner" : "Member"}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })
        )}

        {selectedMember && (
          <>
            <View style={styles.permissionHeader}>
              <Text style={styles.sectionTitle}>Permissions</Text>
              <Text style={styles.editingFor}>
                Editing for: <Text style={{ fontWeight: "900", color: "#7B61FF" }}>{selectedMember.name}</Text>
              </Text>
            </View>
            <View style={styles.permissionCard}>
              <View style={styles.permissionRow}>
                <View style={styles.permissionCopy}>
                  <Text style={styles.permissionText}>Control devices</Text>
                  <Text style={styles.permissionSub}>
                    Allow member to control devices
                  </Text>
                </View>
                <Toggle
                  active={permissions.control}
                  onPress={() => updatePermission("control", !permissions.control)}
                  disabled={saving}
                />
              </View>
              <View style={styles.permissionRow}>
                <View style={styles.permissionCopy}>
                  <Text style={styles.permissionText}>Manage schedules</Text>
                  <Text style={styles.permissionSub}>
                    Allow schedule management
                  </Text>
                </View>
                <Toggle
                  active={permissions.schedule}
                  onPress={() => updatePermission("schedule", !permissions.schedule)}
                  disabled={saving}
                />
              </View>
              <View style={styles.permissionRowLast}>
                <View style={styles.permissionCopy}>
                  <Text style={styles.permissionText}>Invite members</Text>
                  <Text style={styles.permissionSub}>
                    Allow inviting new members
                  </Text>
                </View>
                <Toggle
                  active={permissions.invite}
                  onPress={() => updatePermission("invite", !permissions.invite)}
                  disabled={saving}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <BottomNav active="members" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
  },
  backIcon: {
    fontSize: 22,
    color: "#0A0F2C",
    fontWeight: "900",
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: { fontSize: 24, fontWeight: "900", color: "#0A0F2C" },
  subtitle: { color: "#64748B", marginTop: 2, fontSize: 13, lineHeight: 18 },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { color: "#0A0F2C", fontSize: 18, fontWeight: "900" },
  summaryLabel: { color: "#64748B", fontSize: 12, marginTop: 4 },
  summaryDivider: { width: 1, height: 34, backgroundColor: "#E5E7EB" },
  inviteCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: {
    color: "#0A0F2C",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F8FAFC",
    color: "#0A0F2C",
    fontWeight: "700",
    fontSize: 14,
  },
  inviteButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0A0F2C",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "900",
    color: "#0A0F2C",
  },
  loadingBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    gap: 10,
  },
  loadingText: { color: "#64748B", fontSize: 13 },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 18,
  },
  emptyTitle: { color: "#0A0F2C", fontSize: 15, fontWeight: "900" },
  emptySubtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  memberCard: {
    minHeight: 76,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  memberCardSelected: {
    borderColor: "#7B61FF",
    backgroundColor: "#F5F3FF",
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
  memberName: { color: "#0A0F2C", fontSize: 15, fontWeight: "900" },
  role: { color: "#64748B", fontSize: 12, marginTop: 4 },
  badge: {
    minWidth: 62,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#00D4FF",
    backgroundColor: "#E6FAFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  badgeText: { color: "#036B82", fontSize: 11, fontWeight: "900" },
  badgeOwner: { borderColor: "#7B61FF", backgroundColor: "#F0ECFF" },
  badgeOwnerText: { color: "#6D4DFF" },
  permissionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 18,
    marginBottom: 10,
  },
  editingFor: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "800",
    marginBottom: 2,
  },
  permissionCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 40,
  },
  permissionRow: {
    minHeight: 70,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  permissionRowLast: {
    minHeight: 70,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  permissionCopy: { flex: 1, paddingRight: 10 },
  permissionText: { color: "#0A0F2C", fontSize: 15, fontWeight: "900" },
  permissionSub: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
    fontWeight: "600",
  },
});

export default Members;
