import api from "./api";

export const cardAPI = {
  async getCards() {
    const response = await api.get("/cards");
    return response.data;
  },

  async addCard(data) {
    const response = await api.post("/cards", data);
    return response.data;
  },

  async deleteCard(id) {
    await api.delete(`/cards/${id}`);
  },

  async setDefaultCard(id) {
    const response = await api.patch(`/cards/${id}/default`);
    return response.data;
  },

  async updateCardStatus(id, status) {
    const response = await api.patch(`/cards/${id}/status`, { status });
    return response.data;
  },

  async updateCard(id, data) {
    const response = await api.patch(`/cards/${id}`, data);
    return response.data;
  },
};
