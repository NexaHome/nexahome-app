# Catetan GraphQL NexaHome

## Header yang Dipakai

Untuk query/mutation yang scope-nya home atau room aktif, kirim header berikut:

- `Authorization`: `Bearer <token>`
- `x-home-id`: `<home_id_aktif>`
- `x-room-id`: `<room_id_aktif>`

Untuk `automations`, cukup `Authorization`.

Catatan nama:
- Module log sekarang pakai nama `log-device`
- Model code pakai `LogDevice`
- Collection MongoDB tetap `logs`

## Rooms

### Create Room
```graphql
mutation CreateRoom($createRoomInput: CreateRoomInput!) {
  createRoom(createRoomInput: $createRoomInput) {
    _id
    home_id
    name
    createdAt
  }
}
```

```json
{
  "createRoomInput": {
    "name": "Living Room"
  }
}
```

### Rooms by Home
```graphql
query RoomsByHome {
  roomsByHome {
    _id
    home_id
    name
    createdAt
  }
}
```

### Room by Id
```graphql
query Room($id: String!) {
  room(id: $id) {
    _id
    home_id
    name
    createdAt
  }
}
```

### Update Room
```graphql
mutation UpdateRoom($id: String!, $updateRoomInput: UpdateRoomInput!) {
  updateRoom(id: $id, updateRoomInput: $updateRoomInput) {
    _id
    home_id
    name
    createdAt
  }
}
```

```json
{
  "id": "room-id",
  "updateRoomInput": {
    "name": "New Room Name"
  }
}
```

### Delete Room
```graphql
mutation DeleteRoom($id: String!) {
  deleteRoom(id: $id)
}
```

## Devices

### Create Device
```graphql
mutation CreateDevice($createDeviceInput: CreateDeviceInput!) {
  createDevice(createDeviceInput: $createDeviceInput) {
    _id
    room_id
    name
    type
    status
    createdAt
  }
}
```

```json
{
  "createDeviceInput": {
    "name": "Lampu Utama",
    "type": "switch",
    "status": "OFF"
  }
}
```

### Devices by Room
```graphql
query DevicesByRoom {
  devicesByRoom {
    _id
    room_id
    name
    type
    status
    createdAt
  }
}
```

### Device by Id
```graphql
query Device($id: String!) {
  device(id: $id) {
    _id
    room_id
    name
    type
    status
    createdAt
  }
}
```

### Update Device
```graphql
mutation UpdateDevice($id: String!, $updateDeviceInput: UpdateDeviceInput!) {
  updateDevice(id: $id, updateDeviceInput: $updateDeviceInput) {
    _id
    room_id
    name
    type
    status
    createdAt
  }
}
```

```json
{
  "id": "device-id",
  "updateDeviceInput": {
    "name": "Lampu Tamu",
    "status": "ON"
  }
}
```

### Delete Device
```graphql
mutation DeleteDevice($id: String!) {
  deleteDevice(id: $id)
}
```

## Automations

### Create Automation
```graphql
mutation CreateAutomation($createAutomationInput: CreateAutomationInput!) {
  createAutomation(createAutomationInput: $createAutomationInput) {
    _id
    user_id
    name
    trigger
    action
    createdAt
  }
}
```

```json
{
  "createAutomationInput": {
    "name": "Auto Night Mode",
    "trigger": {
      "type": "schedule",
      "runAt": "2026-04-28T22:00:00Z"
    },
    "action": {
      "command": "allDevicesOff"
    }
  }
}
```

### Automations
```graphql
query Automations {
  automations {
    _id
    user_id
    name
    trigger
    action
    createdAt
  }
}
```

### Automation by Id
```graphql
query Automation($id: String!) {
  automation(id: $id) {
    _id
    user_id
    name
    trigger
    action
    createdAt
  }
}
```

### Update Automation
```graphql
mutation UpdateAutomation($id: String!, $updateAutomationInput: UpdateAutomationInput!) {
  updateAutomation(id: $id, updateAutomationInput: $updateAutomationInput) {
    _id
    user_id
    name
    trigger
    action
    createdAt
  }
}
```

### Delete Automation
```graphql
mutation DeleteAutomation($id: String!) {
  deleteAutomation(id: $id)
}
```

## Device Automations

### Attach Device Automation
```graphql
mutation AttachDeviceAutomation($deviceId: String!, $createDeviceAutomationInput: CreateDeviceAutomationInput!) {
  attachDeviceAutomation(deviceId: $deviceId, createDeviceAutomationInput: $createDeviceAutomationInput) {
    _id
    device_id
    automation_id
    createdAt
  }
}
```

```json
{
  "deviceId": "device-id",
  "createDeviceAutomationInput": {
    "automationId": "automation-id"
  }
}
```

### Detach Device Automation
```graphql
mutation DetachDeviceAutomation($deviceId: String!, $automationId: String!) {
  detachDeviceAutomation(deviceId: $deviceId, automationId: $automationId)
}
```

### Device Automations by Device
```graphql
query DeviceAutomationsByDevice($deviceId: String!) {
  deviceAutomationsByDevice(deviceId: $deviceId) {
    _id
    device_id
    automation_id
    createdAt
  }
}
```

### Device Automations by Automation
```graphql
query DeviceAutomationsByAutomation($automationId: String!) {
  deviceAutomationsByAutomation(automationId: $automationId) {
    _id
    device_id
    automation_id
    createdAt
  }
}
```

## Log Device

### Create Log
```graphql
mutation CreateLog($createLogInput: CreateLogDeviceInput!) {
  createLog(createLogInput: $createLogInput) {
    _id
    device_id
    value
    createdAt
  }
}
```

```json
{
  "createLogInput": {
    "deviceId": "device-id",
    "value": "ON"
  }
}
```

### Logs by Device
```graphql
query LogsByDevice($deviceId: String!) {
  logsByDevice(deviceId: $deviceId) {
    _id
    device_id
    value
    createdAt
  }
}
```

### Logs by Home
```graphql
query LogsByHome {
  logsByHome {
    _id
    device_id
    value
    createdAt
  }
}
```
