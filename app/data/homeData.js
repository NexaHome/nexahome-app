export const rooms = [
  {
    id: "living",
    name: "Ruang Tamu",
    summary: "2 devices on",
    devicesActive: 2,
    totalDevices: 4,
  },
  {
    id: "kitchen",
    name: "Dapur",
    summary: "1 device on",
    devicesActive: 1,
    totalDevices: 2,
  },
  {
    id: "bedroom",
    name: "Kamar Tidur",
    summary: "All off",
    devicesActive: 0,
    totalDevices: 3,
  },
  {
    id: "terrace",
    name: "Teras",
    summary: "1 smart feature",
    devicesActive: 1,
    totalDevices: 2,
  },
];

export const devices = [
  {
    id: "main-light",
    name: "Lampu Utama",
    type: "light",
    roomId: "living",
    roomName: "Ruang Tamu",
    status: "On",
    online: true,
    detail: "Warm white - 80%",
    power: true,
    brightness: 80,
  },
  {
    id: "fan",
    name: "Kipas Angin",
    type: "fan",
    roomId: "living",
    roomName: "Ruang Tamu",
    status: "Off",
    online: true,
    detail: "Level 2",
    power: false,
    brightness: 45,
  },
  {
    id: "ac",
    name: "AC Split",
    type: "ac",
    roomId: "living",
    roomName: "Ruang Tamu",
    status: "On",
    online: true,
    detail: "24 C",
    power: true,
    brightness: 68,
  },
  {
    id: "lock",
    name: "Smart Lock",
    type: "lock",
    roomId: "living",
    roomName: "Ruang Tamu",
    status: "Locked",
    online: true,
    detail: "Front door",
    power: true,
    brightness: 100,
  },
  {
    id: "clothesline",
    name: "Gantungan Baju",
    type: "jemuran otomatis",
    roomId: "terrace",
    roomName: "Teras",
    status: "Otomatis aktif",
    online: true,
    detail: "Masuk saat hujan",
    power: true,
    brightness: 100,
  },
];

export const sensors = [
  { id: "fire", label: "Fire sensor", value: "23 C", state: "Normal", tone: "green" },
  { id: "gas", label: "Gas / smoke", value: "12 ppm", state: "Normal", tone: "green" },
  { id: "water", label: "Water / rain", value: "0.2 mm", state: "Dry", tone: "green" },
  { id: "light", label: "Lightning", value: "340 lux", state: "Bright", tone: "amber" },
];

export const activities = [
  { id: "a1", title: "Lampu Utama turned on", time: "2m ago" },
  { id: "a2", title: "AC set to 24 C", time: "15m ago" },
  { id: "a3", title: "Smart Lock checked", time: "35m ago" },
];

export const schedules = [
  { id: "s1", name: "Lampu Malam", time: "18:30", repeat: "daily", device: "Lampu Utama - Ruang Tamu", active: true },
  { id: "s2", name: "AC Pagi", time: "07:00", repeat: "weekdays", device: "AC Split - Kamar Tidur", active: true },
  { id: "s3", name: "Lampu Teras", time: "18:00", repeat: "daily", device: "Lampu Teras - Teras", active: false },
  { id: "s4", name: "Kipas Malam", time: "21:00", repeat: "daily", device: "Kipas Angin - Kamar Tidur", active: true },
];

export const automations = [
  { id: "r1", name: "Gas > 300 ppm", action: "Turn on exhaust fan", sensor: "Gas Dapur", active: true },
  { id: "r2", name: "Fire > 60 C", action: "Alert and turn on water pump", sensor: "Fire Dapur", active: true },
  { id: "r3", name: "Light < 100 lux", action: "Turn on living room light", sensor: "Lightning Tamu", active: false },
  { id: "r4", name: "Rain detected", action: "Send notification alert", sensor: "Water Teras", active: true },
];

export const alerts = [
  { id: "al1", title: "Gas leak detected", detail: "Dapur - 320 ppm - 2 min ago", level: "Critical" },
  { id: "al2", title: "High temperature", detail: "Dapur - 55 C - 10 min ago", level: "Warning" },
  { id: "al3", title: "Device offline", detail: "Smart Lock - 1 hr ago", level: "Info" },
  { id: "al4", title: "Schedule executed", detail: "Lampu Malam - 18:30 - 5 hrs ago", level: "Read" },
];

export const members = [
  { id: "m1", initials: "BS", name: "Budi Santoso", role: "Owner", status: "You" },
  { id: "m2", initials: "SR", name: "Siti Rahayu", role: "Admin - accepted", status: "Remove" },
  { id: "m3", initials: "AK", name: "Andi Kurnia", role: "Member - pending", status: "Pending" },
];

export const laundryStatus = {
  rainy: {
    title: "Hujan ringan",
    value: "2.4 mm",
    position: "Masuk",
    badge: "Gerimis",
    safe: false,
    history: ["08:12 - Dikeluarkan (cerah)", "13:45 - Ditarik masuk (hujan)"],
  },
  clear: {
    title: "Cuaca cerah",
    value: "0.0 mm",
    position: "Keluar",
    badge: "Kering",
    safe: true,
    history: ["08:12 - Dikeluarkan (cerah)", "13:45 - Ditarik masuk (hujan)"],
  },
};

export const roomFormFields = [
  { id: "name", label: "Nama room", value: "Teras" },
  { id: "floor", label: "Area / lantai", value: "Luar rumah" },
  { id: "icon", label: "Icon", value: "Teras" },
];

export const featureTemplates = [
  { id: "laundry", name: "Gantungan Baju", type: "Jemuran otomatis", room: "Teras" },
  { id: "rain", name: "Sensor Hujan", type: "Weather sensor", room: "Teras" },
  { id: "lamp", name: "Lampu Teras", type: "Lighting", room: "Teras" },
];
