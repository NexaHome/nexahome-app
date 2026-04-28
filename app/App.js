import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { Text, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import StartedScreen from "./src/screens/StartedScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import Dashboard from "./src/screens/Dashboard";
import DeviceControl from "./src/screens/DeviceControl";
import Alerts from "./src/screens/Alerts";
import Automation from "./src/screens/Automation";
import AddDevice from "./src/screens/AddDevice";
import AddHome from "./src/screens/AddHome";
import HomesSettings from "./src/screens/HomesSettings";
import AddRoom from "./src/screens/AddRoom";
import Members from "./src/screens/Members";
import LaundryAutomationRule from "./src/screens/LaundryAutomationRule";
import LaundryControl from "./src/screens/LaundryControl";
import LaundryStatus from "./src/screens/LaundryStatus";
import RoomDetail from "./src/screens/RoomDetail";
import Profile from "./src/screens/Profile";
import Schedule from "./src/screens/Schedule";
import SensorMonitor from "./src/screens/SensorMonitor";
import { fonts, lightColors, ThemeProvider, useTheme } from "./theme";
import { ApolloProvider } from "@apollo/client/react";
import client from "./utils/apollo";

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
        initialRouteName="Started"
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
        <Stack.Screen name="Started" component={StartedScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
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
        <Stack.Screen
          name="LaundryAutomationRule"
          component={LaundryAutomationRule}
        />
        <Stack.Screen name="AddHome" component={AddHome} />
        <Stack.Screen name="HomesSettings" component={HomesSettings} />
        <Stack.Screen name="AddRoom" component={AddRoom} />
        <Stack.Screen name="AddDevice" component={AddDevice} />
        <Stack.Screen name="Profile" component={Profile} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ApolloProvider client={client}>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}
