export const BASE_URL = process.env.EXPO_PUBLIC_GRAPHQL_URL;

export const postGraphQL = async (body, customHeaders = {}) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...customHeaders,
    },
    body: JSON.stringify(body),
  });

  return response;
};
