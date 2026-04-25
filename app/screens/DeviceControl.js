import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BottomNav from "../components/BottomNav";
import ScreenShell from "../components/ScreenShell";
import { devices } from "../data/homeData";

const DeviceControl = ({ route, navigation }) => {
  const device = useMemo(() => {
    const selectedId = route.params?.deviceId || "main-light";
    return devices.find((item) => item.id === selectedId) || devices[0];
  }, [route.params?.deviceId]);

  const [power, setPower] = useState(device.power);
  const [brightness, setBrightness] = useState(device.brightness);
  const heroAnim = useRef(new Animated.Value(device.power ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: power ? 1 : 0,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [heroAnim, power]);

  const heroColor = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#EEF2F7", "#DFF4E3"],
  });

  const knobX = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 25],
  });

  const brightnessWidth = `${brightness}%`;

  return (
    <ScreenShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedPressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </AnimatedPressable>

        <Animated.View style={[styles.hero, { backgroundColor: heroColor }]}>
          <View style={styles.deviceGlow} />
          <View style={styles.devicePlate}>
            <View style={styles.deviceCore} />
          </View>
        </Animated.View>

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{device.name}</Text>
              <Text style={styles.subtitle}>{device.roomName} - {device.type}</Text>
            </View>
            <View style={styles.onlinePill}>
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Power</Text>
            <AnimatedPressable
              style={[styles.switch, power && styles.switchOn]}
              onPress={() => setPower((value) => !value)}
            >
              <Animated.View style={[styles.knob, { transform: [{ translateX: knobX }] }]} />
            </AnimatedPressable>
          </View>

          <Text style={styles.controlLabel}>Brightness - {brightness}%</Text>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: brightnessWidth }]} />
          </View>
          <View style={styles.stepperRow}>
            {[30, 55, 80, 100].map((level) => (
              <AnimatedPressable
                key={level}
                style={[styles.stepButton, brightness === level && styles.stepButtonActive]}
                onPress={() => setBrightness(level)}
              >
                <Text
                  style={[
                    styles.stepText,
                    brightness === level && styles.stepTextActive,
                  ]}
                >
                  {level}%
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          <View style={styles.buttonGrid}>
            <AnimatedPressable style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Add schedule</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Add automation</Text>
            </AnimatedPressable>
          </View>
          <AnimatedPressable style={styles.wideButton}>
            <Text style={styles.secondaryText}>View device log</Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.removeButton}>
            <Text style={styles.removeText}>Remove device</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
      <BottomNav active="home" navigation={navigation} />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    minHeight: "100%",
  },
  backButton: {
    position: "absolute",
    top: 18,
    left: 20,
    zIndex: 2,
    paddingVertical: 8,
    paddingRight: 16,
  },
  backText: {
    color: "#7B61FF",
    fontSize: 15,
    fontWeight: "800",
  },
  hero: {
    height: 330,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#FFFFFF",
    opacity: 0.55,
  },
  devicePlate: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DEE9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0A0F2C",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  deviceCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#00D4FF",
  },
  sheet: {
    marginTop: -26,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: "#D8DEE9",
  },
  handle: {
    alignSelf: "center",
    width: 58,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#D8DEE9",
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0A0F2C",
    letterSpacing: 0,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 3,
  },
  onlinePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#00D4FF",
    backgroundColor: "#E6FAFF",
  },
  onlineText: {
    color: "#036B82",
    fontSize: 12,
    fontWeight: "800",
  },
  controlRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  controlLabel: {
    color: "#0A0F2C",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  switch: {
    width: 54,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D8DEE9",
    padding: 3,
  },
  switchOn: {
    backgroundColor: "#00D4FF",
  },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  sliderTrack: {
    height: 10,
    borderRadius: 8,
    backgroundColor: "#EEF2F7",
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
    backgroundColor: "#0A0F2C",
    borderRadius: 8,
  },
  stepperRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 18,
  },
  stepButton: {
    flex: 1,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
  },
  stepButtonActive: {
    backgroundColor: "#0A0F2C",
    borderColor: "#0A0F2C",
  },
  stepText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
  },
  stepTextActive: {
    color: "#FFFFFF",
  },
  buttonGrid: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#0A0F2C",
    fontSize: 13,
    fontWeight: "700",
  },
  wideButton: {
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D8DEE9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  removeButton: {
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#FF5C7A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  removeText: {
    color: "#FF5C7A",
    fontSize: 13,
    fontWeight: "800",
  },
});

export default DeviceControl;
