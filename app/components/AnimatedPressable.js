import React, { useRef } from "react";
import { Animated, Pressable } from "react-native";
import { transformChildren, transformStyle, useTheme } from "../theme";

const AnimatedPressable = ({ children, style, onPress, disabled, ...props }) => {
  const { mode, theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      {...props}
    >
      <Animated.View style={[transformStyle(style, theme, mode), { transform: [{ scale }] }]}>
        {transformChildren(children, theme, mode)}
      </Animated.View>
    </Pressable>
  );
};

AnimatedPressable.skipThemeTransform = true;

export default AnimatedPressable;
