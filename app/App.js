import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { Text, TextInput } from "react-native";
import Dashboard from "./screens/Dashboard";
import DeviceControl from "./screens/DeviceControl";
import Alerts from "./screens/Alerts";
import Automation from "./screens/Automation";
import AddFeature from "./screens/AddFeature";
import AddRoom from "./screens/AddRoom";
import Members from "./screens/Members";
import LaundryAutomationRule from "./screens/LaundryAutomationRule";
import LaundryControl from "./screens/LaundryControl";
import LaundryStatus from "./screens/LaundryStatus";
import RoomDetail from "./screens/RoomDetail";
import Schedule from "./screens/Schedule";
import SensorMonitor from "./screens/SensorMonitor";
import { fonts, lightColors, ThemeProvider, useTheme } from "./theme";

const Stack = createStackNavigator();

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [
  { fontFamily: fonts.body, color: lightColors.text, letterSpacing: 0 },
  Text.defaultProps.style,
];

TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [
  { fontFamily: fonts.body, color: lightColors.text, letterSpacing: 0 },
  TextInput.defaultProps.style,
];

const AppNavigator = () => {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <StatusBar style={theme.background === "#060A1F" ? "light" : "dark"} />
      <Stack.Navigator
        initialRouteName="Dashboard"
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: theme.background },
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              opacity: current.progress,
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width * 0.08, 0],
                  }),
                },
              ],
            },
          }),
        }}
      >
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="RoomDetail" component={RoomDetail} />
        <Stack.Screen name="DeviceControl" component={DeviceControl} />
        <Stack.Screen name="SensorMonitor" component={SensorMonitor} />
        <Stack.Screen name="Schedule" component={Schedule} />
        <Stack.Screen name="Automation" component={Automation} />
        <Stack.Screen name="Alerts" component={Alerts} />
        <Stack.Screen name="Members" component={Members} />
        <Stack.Screen name="LaundryStatus" component={LaundryStatus} />
        <Stack.Screen name="LaundryControl" component={LaundryControl} />
        <Stack.Screen name="LaundryAutomationRule" component={LaundryAutomationRule} />
        <Stack.Screen name="AddRoom" component={AddRoom} />
        <Stack.Screen name="AddFeature" component={AddFeature} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
