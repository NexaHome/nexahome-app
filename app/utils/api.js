export const BASE_URL = "http://10.0.0.121:3000/graphql";

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
