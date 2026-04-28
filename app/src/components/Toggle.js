import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import AnimatedPressable from "./AnimatedPressable";
import { transformStyle, useTheme } from "../../theme";

const Toggle = ({ active = false, onPress }) => {
  const { mode, theme } = useTheme();
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
      style={transformStyle(
        [styles.track, active && styles.trackActive],
        theme,
        mode,
      )}
      onPress={onPress}
    >
      <Animated.View
        style={[
          transformStyle(styles.knob, theme, mode),
          { transform: [{ translateX }] },
        ]}
      />
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#D8DEE9",
    justifyContent: "center",
  },
  trackActive: {
    backgroundColor: "#00D4FF",
  },
  knob: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
});

export default Toggle;
