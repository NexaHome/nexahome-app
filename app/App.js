import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { TextInput, View, StyleSheet, TouchableOpacity, Text } from "react-native";
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
import CreateSchedule from "./src/screens/CreateSchedule";
import SensorMonitor from "./src/screens/SensorMonitor";
import AIRecommendations from "./src/screens/AIRecommendations";
import { fonts, lightColors, ThemeProvider, useTheme } from "./theme";
import { ApolloProvider } from "@apollo/client/react";
import client from "./utils/apollo";
import * as Notifications from 'expo-notifications';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import AnimatedPressable from "./src/components/AnimatedPressable";


// KONFIGURASI AGAR NOTIFIKASI MUNCUL SAAT APP DIBUKA
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
  const [notification, setNotification] = React.useState(null);

  React.useEffect(() => {
    // Listener for when a notification is received while app is foregrounded
    const subscription = Notifications.addNotificationReceivedListener(noti => {
      setNotification(noti);
      // Auto hide after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    });

    // Listener for when user taps on a notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      // You can navigate to specific screen here if needed
      console.log("Notification tapped:", response);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
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
          <Stack.Screen name="CreateSchedule" component={CreateSchedule} />
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
          <Stack.Screen name="AIRecommendations" component={AIRecommendations} />
          <Stack.Screen name="Profile" component={Profile} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* IN-APP NOTIFICATION POPUP */}
      {notification && (
        <Animated.View 
          entering={FadeInUp} 
          exiting={FadeOutUp}
          style={styles.notiPopup}
        >
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => setNotification(null)}
            style={styles.notiInner}
          >
            <View style={styles.notiIconBox}>
              <Text style={{ fontSize: 20 }}>🚨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notiTitle}>{notification.request.content.title}</Text>
              <Text style={styles.notiBody} numberOfLines={2}>{notification.request.content.body}</Text>
            </View>
            <View style={styles.notiBar} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  notiPopup: {
    position: 'absolute',
    top: 50,
    left: 15,
    right: 15,
    zIndex: 9999,
  },
  notiInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  notiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF0F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notiTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0A0F2C',
  },
  notiBody: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  notiBar: {
    width: 4,
    height: '100%',
    backgroundColor: '#FF6B00',
    borderRadius: 2,
    marginLeft: 12,
  }
});

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
