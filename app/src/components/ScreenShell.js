import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { transformChildren, transformStyle, useTheme } from "../../theme";

const ScreenShell = ({ children, style }) => {
  const { mode, theme } = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 4,
      }),
    ]).start();
  }, [fade, translateY]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <Animated.View
        style={[
          transformStyle(styles.content, theme, mode),
          transformStyle(style, theme, mode),
          { opacity: fade, transform: [{ translateY }] },
        ]}
      >
        {transformChildren(children, theme, mode)}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default ScreenShell;
