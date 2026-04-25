import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import AnimatedPressable from "./AnimatedPressable";

const Toggle = ({ active = false, onPress }) => {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: active ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [active, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 23],
  });

  return (
    <AnimatedPressable
      style={[styles.track, active && styles.trackActive]}
      onPress={onPress}
    >
      <Animated.View style={[styles.knob, { transform: [{ translateX }] }]} />
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#DADDD4",
    justifyContent: "center",
  },
  trackActive: {
    backgroundColor: "#48B75A",
  },
  knob: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
});

export default Toggle;
