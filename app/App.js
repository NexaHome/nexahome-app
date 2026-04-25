import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
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

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Dashboard"
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: "#F6F7F3" },
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
}
