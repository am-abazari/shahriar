// apiServer.js
import "server-only";
import axios from "axios";
import { cookies } from "next/headers";

// constants
const API_BASE_URL = process.env.API_BASE_URL;
if (!API_BASE_URL) throw new Error("API_BASE_URL env var is missing!");

function assertBaseUrl() {
  return API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
}

const BASE_URL = assertBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    // "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("access_token");
  const token = tokenCookie?.value;

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

export default api;
