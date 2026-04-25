import React, { useState } from "react";
import StartedScreen from "./screens/StartedScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";

export default function App() {
  const [screen, setScreen] = useState("started");

  if (screen === "started") {
    return (
      <StartedScreen
        goToLogin={() => setScreen("login")}
        goToHome={() => setScreen("home")}
      />
    );
  }

  if (screen === "login") {
    return (
      <LoginScreen
        goToRegister={() => setScreen("register")}
        goToHome={() => setScreen("home")}
      />
    );
  }

  if (screen === "register") {
    return (
      <RegisterScreen
        goToLogin={() => setScreen("login")}
        goToHome={() => setScreen("home")}
      />
    );
  }

  return <HomeScreen />;
}
