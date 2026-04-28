import React, { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, Platform, Modal, TouchableOpacity } from "react-native";
import * as SecureStore from "expo-secure-store";
import DateTimePicker from "@react-native-community/datetimepicker";
import AnimatedPressable from "../components/AnimatedPressable";
import ScreenShell from "../components/ScreenShell";
import { postGraphQL } from "../../utils/api";

const COMMANDS = [
  { label: "All devices off", value: "AllDevicesOff" },
  { label: "All devices on", value: "AllDevicesOn" },
  { label: "Set away mode", value: "SetAwayMode" },
];

const TRIGGER_TYPES = [
  { label: "Delay", value: "Delay" },
  { label: "Schedule", value: "Schedule" },
];

const CreateSchedule = ({ navigation }) => {
  const [name, setName] = useState("Morning routine");
  const [triggerType, setTriggerType] = useState("Schedule");
  const [delaySec, setDelaySec] = useState("3");
  const [scheduleDate, setScheduleDate] = useState("2026-04-28");
  const [scheduleTime, setScheduleTime] = useState("18:30");
  const [command, setCommand] = useState("AllDevicesOff");
  const [awayEnabled, setAwayEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDelayChange = (value) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setDelaySec(numericValue);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      setScheduleDate(`${year}-${month}-${day}`);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      const hours = String(selectedTime.getHours()).padStart(2, "0");
      const minutes = String(selectedTime.getMinutes()).padStart(2, "0");
      setScheduleTime(`${hours}:${minutes}`);
    }
  };

  const safeDateFromString = (s) => {
    try {
      const d = new Date(s + "T00:00:00");
      return Number.isNaN(d.getTime()) ? new Date() : d;
    } catch (e) {
      return new Date();
    }
  };

  const safeTimeFromString = (s) => {
    try {
      const parts = (s || "00:00").split(":");
      const now = new Date();
      const h = Number(parts[0] || 0);
      const m = Number(parts[1] || 0);
      now.setHours(h, m, 0, 0);
      return now;
    } catch (e) {
      return new Date();
    }
  };

  const previewText = useMemo(() => {
    if (triggerType === "Delay") {
      return `Delay ${delaySec || "0"} s`;
    }

    return `${scheduleDate || "YYYY-MM-DD"} ${scheduleTime || "HH:mm"}`;
  }, [delaySec, scheduleDate, scheduleTime, triggerType]);

  const buildRunAt = () => {
    const value = `${scheduleDate}T${scheduleTime}:00`;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Format tanggal / jam schedule tidak valid.");
    }
    return parsed.toISOString();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      if (!name.trim()) {
        throw new Error("Nama schedule wajib diisi.");
      }

      const token = await SecureStore.getItemAsync("token");
      const homeId = await SecureStore.getItemAsync("activeHomeId");

      if (!token) {
        throw new Error("Token tidak ditemukan, silakan login ulang.");
      }

      if (!homeId) {
        throw new Error("Home aktif tidak ditemukan.");
      }

      const trigger =
        triggerType === "Delay"
          ? { type: "Delay", delayMs: (Number(delaySec) || 0) * 1000 }
          : { type: "Schedule", runAt: buildRunAt() };

      const action =
        command === "SetAwayMode"
          ? { command, enabled: awayEnabled }
          : { command };

      const response = await postGraphQL(
        {
          query: `
            mutation CreateAutomation($createAutomationInput: CreateAutomationInput!) {
              createAutomation(createAutomationInput: $createAutomationInput) {
                _id
                name
              }
            }
          `,
          variables: {
            createAutomationInput: {
              name: name.trim(),
              trigger,
              action,
            },
          },
        },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": homeId,
        },
      );

      const result = await response.json();
      if (result.errors?.length) {
        throw new Error(result.errors[0]?.message || "Gagal menyimpan schedule");
      }

      navigation.goBack();
    } catch (saveError) {
      setError(saveError.message || "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const activeChipStyle = (isActive) => ({
    backgroundColor: isActive ? "#0A0F2C" : "#F8FAFC",
    borderColor: isActive ? "#0A0F2C" : "#D8DEE9",
  });

  const activeChipTextStyle = (isActive) => ({
    color: isActive ? "#FFFFFF" : "#64748B",
  });

  return (
    <ScreenShell>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </AnimatedPressable>

        <Text style={styles.title}>Create schedule</Text>
        <Text style={styles.subtitle}>
          Buat automation terstruktur. Backend akan menyimpan trigger dan action ke format JSON.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Schedule name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Lampu malam"
          />

          <Text style={styles.label}>Trigger type</Text>
          <View style={styles.chipRow}>
            {TRIGGER_TYPES.map((item, index) => {
              const isActive = triggerType === item.value;
              return (
                <AnimatedPressable
                  key={item.value}
                  style={[
                    styles.chip,
                    activeChipStyle(isActive),
                    index === 0 ? styles.chipLeft : null,
                    index === TRIGGER_TYPES.length - 1 ? styles.chipRight : null,
                  ]}
                  onPress={() => setTriggerType(item.value)}
                >
                  <Text style={[styles.chipText, activeChipTextStyle(isActive)]}>
                    {item.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {triggerType === "Delay" ? (
            <>
              <Text style={styles.label}>Delay in seconds</Text>
              <TextInput
                style={styles.input}
                value={delaySec}
                onChangeText={handleDelayChange}
                keyboardType="numeric"
                placeholder="3"
              />
            </>
          ) : (
            <>
              <View style={styles.rowGap}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Date</Text>
                <AnimatedPressable
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: scheduleDate ? "#0A0F2C" : "#B0B9C9", fontSize: 14, fontWeight: "800" }}>
                    {scheduleDate || "Select date"}
                  </Text>
                </AnimatedPressable>
                {showDatePicker && Platform.OS === "android" && (
                  <DateTimePicker
                    value={safeDateFromString(scheduleDate)}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                  />
                )}
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Time</Text>
                <AnimatedPressable
                  style={styles.input}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={{ color: scheduleTime ? "#0A0F2C" : "#B0B9C9", fontSize: 14, fontWeight: "800" }}>
                    {scheduleTime || "Select time"}
                  </Text>
                </AnimatedPressable>
                {showTimePicker && Platform.OS === "android" && (
                  <DateTimePicker
                    value={safeTimeFromString(scheduleTime)}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                    is24Hour={true}
                  />
                )}
              </View>
            </View>

            {Platform.OS === "ios" && (
              <>
                <Modal visible={showDatePicker} transparent animationType="slide">
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalToolbar}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={styles.modalButtonText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={safeDateFromString(scheduleDate)}
                        mode="date"
                        display="spinner"
                        onChange={handleDateChange}
                      />
                    </View>
                  </View>
                </Modal>

                <Modal visible={showTimePicker} transparent animationType="slide">
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalToolbar}>
                        <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                          <Text style={styles.modalButtonText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={safeTimeFromString(scheduleTime)}
                        mode="time"
                        display="spinner"
                        onChange={handleTimeChange}
                        is24Hour={true}
                      />
                    </View>
                  </View>
                </Modal>
              </>
            )}
          </>
        )}

          <Text style={styles.label}>Action</Text>
          <View style={styles.commandList}>
            {COMMANDS.map((item) => {
              const isActive = command === item.value;
              return (
                <AnimatedPressable
                  key={item.value}
                  style={[
                    styles.commandChip,
                    activeChipStyle(isActive),
                  ]}
                  onPress={() => setCommand(item.value)}
                >
                  <Text style={[styles.commandText, activeChipTextStyle(isActive)]}>
                    {item.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {command === "SetAwayMode" && (
            <View style={styles.previewRow}>
              <Text style={styles.previewRowLabel}>Away mode enabled</Text>
              <AnimatedPressable
                style={[styles.toggleBox, awayEnabled && styles.toggleBoxOn]}
                onPress={() => setAwayEnabled((value) => !value)}
              >
                <Text style={[styles.toggleText, awayEnabled && styles.toggleTextOn]}>
                  {awayEnabled ? "On" : "Off"}
                </Text>
              </AnimatedPressable>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.previewCard}>
          <View>
            <Text style={styles.previewTitle}>{name || "New schedule"}</Text>
            <Text style={styles.previewMeta}>{previewText}</Text>
          </View>
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>{command}</Text>
          </View>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <AnimatedPressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>Save schedule</Text>
          )}
        </AnimatedPressable>
      </ScrollView>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 26 },
  backButton: { paddingVertical: 8, paddingRight: 16, alignSelf: "flex-start" },
  backText: { color: "#7B61FF", fontSize: 14, fontWeight: "900" },
  title: {
    color: "#0A0F2C",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 5,
    marginBottom: 16,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 14,
  },
  label: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 7,
    marginTop: 8,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 9,
    paddingHorizontal: 12,
    color: "#0A0F2C",
    fontSize: 14,
    fontWeight: "800",
    backgroundColor: "#EEF2F7",
  },
  helperText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  chipRow: {
    flexDirection: "row",
  },
  chip: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  chipLeft: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  chipRight: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  commandList: {
    flexDirection: "column",
  },
  rowGap: {
    flexDirection: "row",
    gap: 10,
  },
  halfCol: {
    flex: 1,
  },
  commandChip: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  commandText: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  previewRow: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewRowLabel: { color: "#0A0F2C", fontSize: 14, fontWeight: "800" },
  toggleBox: {
    minWidth: 54,
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  toggleBoxOn: {
    backgroundColor: "#E6FAFF",
    borderColor: "#00D4FF",
  },
  toggleText: { color: "#64748B", fontSize: 12, fontWeight: "900" },
  toggleTextOn: { color: "#036B82" },
  sectionTitle: {
    color: "#0A0F2C",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 10,
  },
  previewCard: {
    minHeight: 78,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  previewTitle: { color: "#0A0F2C", fontSize: 17, fontWeight: "900" },
  previewMeta: { color: "#64748B", fontSize: 12.5, marginTop: 5 },
  previewBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#00D4FF",
    backgroundColor: "#E6FAFF",
  },
  previewBadgeText: { color: "#036B82", fontSize: 12, fontWeight: "900" },
  saveButton: {
    height: 48,
    borderRadius: 9,
    backgroundColor: "#0A0F2C",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  errorText: {
    color: "#FF5C7A",
    fontSize: 12,
    marginBottom: 10,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 20,
  },
  modalToolbar: {
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: "#EFEFEF",
  },
  modalButtonText: { color: "#0A0F2C", fontSize: 16, fontWeight: "800" },
});

export default CreateSchedule;
