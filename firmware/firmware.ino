#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

// ================= CONFIG =================
#define ACCESS_KEY "6cb50e53c374e017:53f04f1d1f4e2e4e"
#define APP_NAME "nexahome"

// PIN DEFINITIONS
#define FIRE_PIN 32
#define GAS_PIN  34
#define LDR_PIN  35
#define WATER_PIN 33
#define RAIN_PIN 25
#define SERVO_PIN 23

// --- PIN LAMPU DITUKAR SESUAI PERMINTAAN ---
#define AUTO_LAMP_PIN 2   // Lampu yang dikontrol Sensor Cahaya (Otomatis)
#define SMART_LAMP_PIN 17 // Lampu yang dikontrol Dashboard (Smart Lamp)

Servo myServo;
int currentServoPos = 0; 

// ================= STATE VARIABLES =================
unsigned long lastSend = 0;
unsigned long lastCommandCheck = 0;
String lastCommandRI = ""; 

int fireVal, gasVal, lightVal, waterVal, rainVal;

bool fireEnabled = true;
bool gasEnabled = true;
bool lightEnabled = true;
bool waterEnabled = true;
bool rainEnabled = true;

bool lightManual = false; 
bool rainManual = false;
String servoState = "open";
String lampState = "off";      // State untuk Smart Lamp (Pin 17)
String autoLampState = "off";  // State untuk Auto Lamp (Pin 2)

String lastFireStatus  = "safe";
String lastGasStatus   = "normal";
String lastWaterStatus = "low";
String lastRainStatus  = "clear";

void connectWiFi() {
  WiFiManager wm;
  Serial.println("\n[WIFI] Menghubungkan...");
  if (!wm.autoConnect("Nexahome-Setup")) ESP.restart();
  Serial.println("[WIFI] Tersambung!");
}

void moveServo(int targetAngle) {
  if (currentServoPos == targetAngle) return;
  if (currentServoPos < targetAngle) {
    for (int i = currentServoPos; i <= targetAngle; i++) { myServo.write(i); delay(15); }
  } else {
    for (int i = currentServoPos; i >= targetAngle; i--) { myServo.write(i); delay(15); }
  }
  currentServoPos = targetAngle;
}

void sendSensor(String name, int value, String status) {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  String antaresName = name;
  if (name == "fire") antaresName = "Fire";
  else if (name == "light") antaresName = "Light";
  else if (name == "rain") antaresName = "Rain";
  
  String url = "https://platform.antares.id:8443/~/antares-cse/antares-id/" + String(APP_NAME) + "/" + antaresName;
  http.begin(client, url);
  http.addHeader("X-M2M-Origin", ACCESS_KEY);
  http.addHeader("Content-Type", "application/json;ty=4");

  String json = "{\"device\":\"sensor-" + name + "\",\"sensor\":\"" + antaresName + "\",\"value\":" + String(value) + ",\"status\":\"" + status + "\"";
  if (name == "rain") json += ",\"servo\":\"" + servoState + "\"";
  if (name == "light") json += ",\"lamp\":\"" + lampState + "\",\"auto_lamp\":\"" + autoLampState + "\"";
  json += "}";

  json.replace("\"", "\\\""); 
  String payload = "{ \"m2m:cin\": { \"con\": \"" + json + "\" } }";
  int httpCode = http.POST(payload);
  Serial.print("[ANT] POST to " + antaresName + " | Status: ");
  Serial.println(httpCode);
  http.end();
}

void checkAndSendEmergency() {
  if (fireEnabled) {
    String currentFire = (fireVal == LOW ? "danger" : "safe");
    if (currentFire != lastFireStatus) {
      if (currentFire == "danger") sendSensor("fire", fireVal, "danger");
      lastFireStatus = currentFire;
    }
  }
  if (gasEnabled) {
    String currentGas = (gasVal > 2500 ? "danger" : "normal");
    if (currentGas != lastGasStatus) {
      if (currentGas == "danger") sendSensor("gas", gasVal, "danger");
      lastGasStatus = currentGas;
    }
  }
  if (waterEnabled) {
    String currentWater = (waterVal > 4000 ? "danger" : "low");
    if (currentWater != lastWaterStatus) {
      if (currentWater == "danger") sendSensor("water", waterVal, "danger");
      lastWaterStatus = currentWater;
    }
  }
  if (rainEnabled) {
    String currentRain = (rainVal == LOW ? "heavy" : "clear");
    if (currentRain != lastRainStatus) {
      if (currentRain == "heavy") sendSensor("rain", rainVal, "heavy");
      lastRainStatus = currentRain;
    }
  }
}

void checkControl() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  String url = "https://platform.antares.id:8443/~/antares-cse/antares-id/" + String(APP_NAME) + "/Control/la";
  http.begin(client, url);
  http.addHeader("X-M2M-Origin", ACCESS_KEY);
  http.addHeader("Accept", "application/json");

  int httpCode = http.GET();
  if (httpCode == 200) {
    StaticJsonDocument<1024> doc;
    deserializeJson(doc, http.getString());
    String currentRI = doc["m2m:cin"]["ri"];
    if (currentRI == lastCommandRI) { http.end(); return; }
    lastCommandRI = currentRI;

    String con = doc["m2m:cin"]["con"];
    StaticJsonDocument<512> cmd;
    deserializeJson(cmd, con);

    if (cmd.containsKey("target")) {
      String target = cmd["target"];
      String status = cmd["status"];
      String targetLower = target; targetLower.toLowerCase();

      Serial.println("\n--- PERINTAH DITERIMA ---");
      Serial.println("Target: " + target + " | Status: " + status);

      // 1. Kill Switch
      if (target.equalsIgnoreCase("Fire")) fireEnabled = (status == "on");
      else if (target.equalsIgnoreCase("gas"))  gasEnabled = (status == "on");
      else if (target.equalsIgnoreCase("water")) waterEnabled = (status == "on");
      else if (target.equalsIgnoreCase("Light Sensor")) lightEnabled = (status == "on");
      else if (target.equalsIgnoreCase("Rain"))  rainEnabled = (status == "on");

      // 2. SMART LAMP (Pin 17)
      if (targetLower.indexOf("lamp") >= 0 || targetLower.indexOf("control") >= 0 || targetLower.indexOf("indicator") >= 0) {
        lampState = status;
        digitalWrite(SMART_LAMP_PIN, (status == "on") ? HIGH : LOW);
        Serial.println("[OK] SMART LAMP (PIN 17) -> " + status);
      }

      if (target.equalsIgnoreCase("Rain") && cmd.containsKey("servo")) {
        String srv = cmd["servo"];
        if (srv == "auto") rainManual = false;
        else {
          rainManual = true; servoState = srv;
          moveServo((srv == "open") ? 0 : 180);
        }
      }
      Serial.println("-------------------------\n");
    }
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(FIRE_PIN, INPUT); pinMode(GAS_PIN, INPUT); pinMode(LDR_PIN, INPUT);
  pinMode(WATER_PIN, INPUT); pinMode(RAIN_PIN, INPUT); 
  pinMode(SMART_LAMP_PIN, OUTPUT); pinMode(AUTO_LAMP_PIN, OUTPUT);
  myServo.attach(SERVO_PIN); myServo.write(0);
  connectWiFi();
}

void loop() {
  fireVal = digitalRead(FIRE_PIN); rainVal = digitalRead(RAIN_PIN);
  gasVal = analogRead(GAS_PIN); lightVal = analogRead(LDR_PIN);
  waterVal = analogRead(WATER_PIN);
  unsigned long now = millis();
  checkAndSendEmergency();
  if (now - lastCommandCheck > 2000) { checkControl(); lastCommandCheck = now; }

  // LOGIKA OTOMATIS SENSOR CAHAYA (PIN 2)
  if (lightEnabled) {
    if (lightVal > 3800 && autoLampState != "on") { 
      digitalWrite(AUTO_LAMP_PIN, HIGH); autoLampState = "on"; 
      Serial.println("[AUTO] Gelap: Lampu Pin 2 MENYALA");
      sendSensor("light", lightVal, "dark"); // Kirim instan saat berubah status
    }
    else if (lightVal < 2800 && autoLampState != "off") { 
      digitalWrite(AUTO_LAMP_PIN, LOW); autoLampState = "off"; 
      Serial.println("[AUTO] Terang: Lampu Pin 2 MATI");
      sendSensor("light", lightVal, "bright"); // Kirim instan saat berubah status
    }
  }

  if (rainEnabled && !rainManual) {
    if (rainVal == LOW && servoState != "closed") { moveServo(180); servoState = "closed"; }
    else if (rainVal == HIGH && servoState != "open") { moveServo(0); servoState = "open"; }
  }

  if (now - lastSend > 5000) {
    sendSensor("fire", fireVal, (fireVal == LOW ? "danger" : "safe"));
    sendSensor("gas", gasVal, (gasVal > 2500 ? "danger" : "normal"));
    sendSensor("light", lightVal, (autoLampState == "on" ? "dark" : "bright"));
    sendSensor("water", waterVal, (waterVal > 3000 ? "high" : "low"));
    sendSensor("rain", rainVal, (rainVal == LOW ? "heavy" : "clear"));
    lastSend = now;
  }
  delay(50);
}
