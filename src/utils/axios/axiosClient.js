import axios from "axios";

// Constants

const api = axios.create({
  baseURL: `/api`,
});

export default api;
