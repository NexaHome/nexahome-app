import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  Modal,
  TouchableOpacity,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import DateTimePicker from "@react-native-community/datetimepicker";
import AnimatedPressable from "../components/AnimatedPressable";
import ScreenShell from "../components/ScreenShell";
import { postGraphQL } from "../../utils/api";

const COMMANDS = [
  {
    label: "All devices off",
    value: "AllDevicesOff",
    icon: "🌑",
    desc: "Turn off everything",
  },
  {
    label: "All devices on",
    value: "AllDevicesOn",
    icon: "☀️",
    desc: "Turn on everything",
  },
  {
    label: "Set away mode",
    value: "SetAwayMode",
    icon: "🏠",
    desc: "Enable security mode",
  },
  {
    label: "Toggle devices",
    value: "ToggleDevices",
    icon: "⚙️",
    desc: "Custom selection",
  },
];

const TRIGGER_TYPES = [
  { label: "Delay", value: "Delay" },
  { label: "Schedule", value: "Schedule" },
];

const DAYS = [
  { label: "S", value: 0 },
  { label: "M", value: 1 },
  { label: "T", value: 2 },
  { label: "W", value: 3 },
  { label: "T", value: 4 },
  { label: "F", value: 5 },
  { label: "S", value: 6 },
];

const getCategoryIcon = (cat) => {
  switch (cat?.toLowerCase()) {
    case "light":
      return "💡";
    case "plug":
      return "🔌";
    case "ac":
      return "❄️";
    case "fan":
      return "🌬️";
    case "security":
      return "🛡️";
    default:
      return "📱";
  }
};

const CreateSchedule = ({ navigation, route }) => {
  const deviceId = route.params?.deviceId;
  const deviceName = route.params?.deviceName;
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("Schedule");
  const [delaySec, setDelaySec] = useState("");
  const [scheduleDate, setScheduleDate] = useState("2026-04-29");
  const [scheduleEndDate, setScheduleEndDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("18:30");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [command, setCommand] = useState(
    deviceId ? "ToggleDevices" : "AllDevicesOff",
  );
  const [deviceState, setDeviceState] = useState("ON");
  const [awayEnabled, setAwayEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [repeat, setRepeat] = useState(true);
  const [selectedDays, setSelectedDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [allDevices, setAllDevices] = useState([]);
  const [activeHomeName, setActiveHomeName] = useState("");
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(
    deviceId ? [deviceId] : [],
  );

  useEffect(() => {
    loadAllDevices();
  }, []);

  const loadAllDevices = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const homeId = await SecureStore.getItemAsync("activeHomeId");
      if (!token || !homeId) return;

      const response = await postGraphQL(
        {
          query: `
            query GetDevicesByHome {
              devicesByHome {
                _id
                name
                category
                room_id
                room {
                  name
                }
              }
            }
          `,
        },
        {
          Authorization: `Bearer ${token}`,
          "x-home-id": homeId,
        },
      );

      const result = await response.json();
      if (result.data?.devicesByHome) {
        setAllDevices(result.data.devicesByHome);
      }

      // Fetch Home Name
      const homeResponse = await postGraphQL(
        {
          query: `
            query GetHome($id: String!) {
              home(id: $id) {
                name
              }
            }
          `,
          variables: { id: homeId },
        },
        { Authorization: `Bearer ${token}` },
      );
      const homeResult = await homeResponse.json();
      if (homeResult.data?.home?.name) {
        setActiveHomeName(homeResult.data.home.name);
      }
    } catch (e) {
      console.error("Failed to load device list", e);
    }
  };

  const toggleDeviceSelection = (id) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
    );
  };

  const handleDelayChange = (value) => {
    // Basic numeric filter
    setDelaySec(value.replace(/[^0-9]/g, ""));
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
      throw new Error("Invalid date or time format.");
    }
    return parsed.toISOString();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      if (!name.trim()) {
        throw new Error("Schedule name is required.");
      }

      const token = await SecureStore.getItemAsync("token");
      const homeId = await SecureStore.getItemAsync("activeHomeId");

      if (!token) {
        throw new Error("Token not found, please log in again.");
      }

      if (!homeId) {
        throw new Error("Active home not found.");
      }

      const trigger =
        triggerType === "Delay"
          ? { type: "Delay", delayMs: (Number(delaySec) || 0) * 1000 }
          : {
              type: "Schedule",
              runAt: buildRunAt(),
              endDate: scheduleEndDate || undefined,
              endTime: scheduleEndTime || undefined,
              repeat: repeat,
              days: repeat ? selectedDays : [],
            };

      const action =
        command === "SetAwayMode"
          ? { command, enabled: awayEnabled }
          : command === "ToggleDevices"
            ? { command, state: deviceState }
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
        throw new Error(result.errors[0]?.message || "Failed to save schedule");
      }

      const newAutomationId = result.data?.createAutomation?._id;

      if (newAutomationId && selectedDeviceIds.length > 0) {
        // Loop through all selected devices to attach them to the automation
        for (const targetDeviceId of selectedDeviceIds) {
          const device = allDevices.find((d) => d._id === targetDeviceId);
          const roomId =
            device?.room_id || (await SecureStore.getItemAsync("activeRoomId"));

          await postGraphQL(
            {
              query: `
                mutation AttachDevice($deviceId: String!, $input: CreateDeviceAutomationInput!) {
                  attachDeviceAutomation(deviceId: $deviceId, createDeviceAutomationInput: $input) {
                    _id
                  }
                }
              `,
              variables: {
                deviceId: targetDeviceId,
                input: { automationId: newAutomationId },
              },
            },
            {
              Authorization: `Bearer ${token}`,
              "x-home-id": homeId,
              ...(roomId ? { "x-room-id": roomId } : {}),
            },
          );
        }
      }

      navigation.goBack();
    } catch (saveError) {
      setError(saveError.message || "An error occurred");
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
        <AnimatedPressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Back</Text>
        </AnimatedPressable>

        <Text style={styles.title}>Create schedule</Text>
        <Text style={styles.subtitle}>
          Set up automated schedules for your smart devices to make life easier
          and more efficient.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Schedule name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Example: Morning routine"
              placeholderTextColor="#94A3B8"
            />
          </View>

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
                    index === TRIGGER_TYPES.length - 1
                      ? styles.chipRight
                      : null,
                  ]}
                  onPress={() => setTriggerType(item.value)}
                >
                  <Text
                    style={[styles.chipText, activeChipTextStyle(isActive)]}
                  >
                    {item.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {triggerType === "Delay" ? (
            <>
              <Text style={styles.label}>Wait for (seconds)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={delaySec}
                  onChangeText={handleDelayChange}
                  keyboardType="numeric"
                  placeholder="e.g. 5"
                  placeholderTextColor="#94A3B8"
                  maxLength={5}
                />
                <Text style={{ fontSize: 16, marginRight: 12 }}>⏱️</Text>
              </View>
              <Text style={styles.helperText}>
                The automation will run after the specified time.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.timeRangeRow}>
                <View style={styles.timeBox}>
                  <Text style={styles.labelSmall}>Start Date</Text>
                  <AnimatedPressable
                    style={styles.input}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text
                      style={{
                        color: scheduleDate ? "#0A0F2C" : "#94A3B8",
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {scheduleDate || "Select"}
                    </Text>
                    <Text style={{ fontSize: 14 }}>📅</Text>
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

                <View style={styles.timeBox}>
                  <Text style={styles.labelSmall}>End Date (Optional)</Text>
                  <AnimatedPressable
                    style={styles.input}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text
                      style={{
                        color: scheduleEndDate ? "#0A0F2C" : "#CBD5E1",
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {scheduleEndDate || "None"}
                    </Text>
                    <Text style={{ fontSize: 14, opacity: 0.5 }}>📅</Text>
                  </AnimatedPressable>
                  {showEndDatePicker && Platform.OS === "android" && (
                    <DateTimePicker
                      value={safeDateFromString(
                        scheduleEndDate || scheduleDate,
                      )}
                      mode="date"
                      display="default"
                      onChange={(e, d) => {
                        setShowEndDatePicker(false);
                        if (d)
                          setScheduleEndDate(d.toISOString().split("T")[0]);
                      }}
                    />
                  )}
                </View>
              </View>

              <View style={styles.timeRangeRow}>
                <View style={styles.timeBox}>
                  <Text style={styles.labelSmall}>Start Time</Text>
                  <AnimatedPressable
                    style={styles.input}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text
                      style={{
                        color: scheduleTime ? "#0A0F2C" : "#94A3B8",
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {scheduleTime || "Select"}
                    </Text>
                    <Text style={{ fontSize: 14 }}>⏰</Text>
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

                <View style={styles.timeBox}>
                  <Text style={styles.labelSmall}>End Time (Optional)</Text>
                  <AnimatedPressable
                    style={styles.input}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text
                      style={{
                        color: scheduleEndTime ? "#0A0F2C" : "#CBD5E1",
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {scheduleEndTime || "None"}
                    </Text>
                    <Text style={{ fontSize: 14, opacity: 0.5 }}>⏰</Text>
                  </AnimatedPressable>
                  {showEndTimePicker && Platform.OS === "android" && (
                    <DateTimePicker
                      value={safeTimeFromString(
                        scheduleEndTime || scheduleTime,
                      )}
                      mode="time"
                      display="default"
                      onChange={(e, d) => {
                        setShowEndTimePicker(false);
                        if (d)
                          setScheduleEndTime(
                            `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
                          );
                      }}
                      is24Hour={true}
                    />
                  )}
                </View>
              </View>

              {Platform.OS === "ios" && (
                <>
                  <Modal
                    visible={showDatePicker}
                    transparent
                    animationType="slide"
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <View style={styles.modalToolbar}>
                          <TouchableOpacity
                            onPress={() => setShowDatePicker(false)}
                          >
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

                  <Modal
                    visible={showTimePicker}
                    transparent
                    animationType="slide"
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <View style={styles.modalToolbar}>
                          <TouchableOpacity
                            onPress={() => setShowTimePicker(false)}
                          >
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

          {triggerType === "Schedule" && (
            <>
              <View style={styles.previewRow}>
                <Text style={styles.previewRowLabel}>Repeat Daily</Text>
                <AnimatedPressable
                  style={[styles.toggleBox, repeat && styles.toggleBoxOn]}
                  onPress={() => setRepeat((v) => !v)}
                >
                  <Text
                    style={[styles.toggleText, repeat && styles.toggleTextOn]}
                  >
                    {repeat ? "On" : "Off"}
                  </Text>
                </AnimatedPressable>
              </View>

              {repeat && (
                <View style={styles.daysRow}>
                  {DAYS.map((day) => {
                    const isActive = selectedDays.includes(day.value);
                    return (
                      <AnimatedPressable
                        key={day.value}
                        style={[
                          styles.dayCircle,
                          isActive && styles.dayCircleActive,
                        ]}
                        onPress={() => toggleDay(day.value)}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isActive && styles.dayTextActive,
                          ]}
                        >
                          {day.label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              )}
            </>
          )}

          <Text style={styles.label}>Select Action</Text>
          <View style={styles.commandGrid}>
            {COMMANDS.map((item) => {
              const isActive = command === item.value;
              return (
                <AnimatedPressable
                  key={item.value}
                  style={[
                    styles.commandCard,
                    isActive && styles.commandCardActive,
                  ]}
                  onPress={() => setCommand(item.value)}
                >
                  <View
                    style={[
                      styles.commandIconBox,
                      isActive && styles.commandIconBoxActive,
                    ]}
                  >
                    <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.commandLabel,
                        isActive && styles.commandLabelActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.commandDesc,
                        isActive && styles.commandDescActive,
                      ]}
                    >
                      {item.desc}
                    </Text>
                  </View>
                  {isActive && <Text style={styles.checkIcon}>✓</Text>}
                </AnimatedPressable>
              );
            })}
          </View>

          {command === "ToggleDevices" && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                <Text style={styles.label}>Select Devices</Text>
                {activeHomeName ? (
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#94A3B8",
                      fontWeight: "700",
                      marginBottom: 7,
                    }}
                  >
                    HOME: {activeHomeName.toUpperCase()}
                  </Text>
                ) : null}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.deviceListScroll}
              >
                {allDevices.map((dev) => {
                  const isSelected = selectedDeviceIds.includes(dev._id);
                  return (
                    <AnimatedPressable
                      key={dev._id}
                      style={[
                        styles.deviceCard,
                        isSelected && styles.deviceCardActive,
                      ]}
                      onPress={() => toggleDeviceSelection(dev._id)}
                    >
                      <View
                        style={[
                          styles.deviceIconBox,
                          isSelected && styles.deviceIconBoxActive,
                        ]}
                      >
                        <Text style={{ fontSize: 18 }}>
                          {getCategoryIcon(dev.category)}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.deviceCardName,
                          isSelected && styles.deviceCardNameActive,
                        ]}
                      >
                        {dev.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.deviceCardRoom,
                          isSelected && styles.deviceCardRoomActive,
                        ]}
                      >
                        {dev.room?.name || "No Room"}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>✓</Text>
                        </View>
                      )}
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          {command === "ToggleDevices" && (
            <View style={styles.previewRow}>
              <Text style={styles.previewRowLabel}>Target State</Text>
              <View style={styles.chipRow}>
                {["ON", "OFF"].map((s) => {
                  const isActive = deviceState === s;
                  return (
                    <AnimatedPressable
                      key={s}
                      style={[
                        styles.chip,
                        activeChipStyle(isActive),
                        s === "ON" ? styles.chipLeft : styles.chipRight,
                      ]}
                      onPress={() => setDeviceState(s)}
                    >
                      <Text
                        style={[styles.chipText, activeChipTextStyle(isActive)]}
                      >
                        {s}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          )}

          {command === "SetAwayMode" && (
            <View style={styles.previewRow}>
              <Text style={styles.previewRowLabel}>Away mode enabled</Text>
              <AnimatedPressable
                style={[styles.toggleBox, awayEnabled && styles.toggleBoxOn]}
                onPress={() => setAwayEnabled((value) => !value)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    awayEnabled && styles.toggleTextOn,
                  ]}
                >
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
    marginBottom: 8,
    marginTop: 22,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D9E6",
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "#0A0F2C",
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: "#F0F4F8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  commandGrid: {
    gap: 10,
  },
  commandCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 4,
  },
  commandCardActive: {
    backgroundColor: "#0A0F2C",
    borderColor: "#0A0F2C",
  },
  commandIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  commandIconBoxActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  commandLabel: {
    color: "#0A0F2C",
    fontSize: 14,
    fontWeight: "800",
  },
  commandLabelActive: {
    color: "#FFFFFF",
  },
  commandDesc: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  commandDescActive: {
    color: "rgba(255,255,255,0.6)",
  },
  checkIcon: {
    color: "#00D4FF",
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8,
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
  inputContainer: {
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D9E6",
    borderRadius: 12,
    backgroundColor: "#F0F4F8",
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    color: "#0A0F2C",
    fontSize: 14,
    fontWeight: "700",
  },
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
  timeRangeRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 0,
  },
  timeBox: {
    flex: 1,
  },
  labelSmall: {
    fontSize: 10,
    fontWeight: "900",
    color: "#64748B",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  deviceListScroll: {
    marginTop: 8,
    marginBottom: 16,
    marginHorizontal: -4,
  },
  deviceCard: {
    width: 120,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    marginHorizontal: 6,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  deviceCardActive: {
    backgroundColor: "#0A0F2C",
    borderColor: "#0A0F2C",
    elevation: 6,
    shadowOpacity: 0.2,
  },
  deviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  deviceIconBoxActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  deviceCardName: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  deviceCardNameActive: {
    color: "#FFFFFF",
  },
  deviceCardRoom: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  deviceCardRoomActive: {
    color: "rgba(255,255,255,0.7)",
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#00D4FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  selectedBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 4,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    backgroundColor: "#0A0F2C",
    borderColor: "#0A0F2C",
  },
  dayText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "900",
  },
  dayTextActive: {
    color: "#FFFFFF",
  },
});

export default CreateSchedule;
