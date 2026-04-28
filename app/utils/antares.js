import { postGraphQL } from "./api";
import * as SecureStore from "expo-secure-store";

export const getAntaresData = async (appName, deviceName) => {
  const token = await SecureStore.getItemAsync("token");

  const query = `
    query GetAntaresLatestData($appName: String, $deviceName: String) {
      getAntaresLatestData(appName: $appName, deviceName: $deviceName)
    }
  `;

  const response = await postGraphQL(
    {
      query,
      variables: { appName, deviceName },
    },
    {
      Authorization: `Bearer ${token}`,
    },
  );

  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  const dataString = result.data.getAntaresLatestData;
  try {
    return JSON.parse(dataString);
  } catch {
    return dataString;
  }
};

export const sendAntaresData = async (data, appName, deviceName) => {
  const token = await SecureStore.getItemAsync("token");

  const mutation = `
    mutation SendAntaresData($data: String!, $appName: String, $deviceName: String) {
      sendAntaresData(data: $data, appName: $appName, deviceName: $deviceName)
    }
  `;

  const response = await postGraphQL(
    {
      query: mutation,
      variables: {
        data: typeof data === "object" ? JSON.stringify(data) : String(data),
        appName,
        deviceName,
      },
    },
    {
      Authorization: `Bearer ${token}`,
    },
  );

  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return JSON.parse(result.data.sendAntaresData);
};

export const getAntaresLogs = async () => {
  const token = await SecureStore.getItemAsync("token");
  const homeId = await SecureStore.getItemAsync("activeHomeId");

  const query = `
    query LogsByHome {
      logsByHome {
        _id
        device_id
        value
        createdAt
      }
    }
  `;

  const response = await postGraphQL(
    {
      query,
    },
    {
      Authorization: `Bearer ${token}`,
      "x-home-id": homeId,
    },
  );

  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data.logsByHome.map((log) => ({
    ...log,
    value: typeof log.value === "string" ? JSON.parse(log.value) : log.value,
  }));
};
