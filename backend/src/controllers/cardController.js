"use strict";
/**
 * CardController
 *
 * Thin HTTP layer — delegates all business logic to cardService.
 * Responsibility: parse request, call service, return response.
 */

const cardService = require("../services/cardService");

class CardController {
  /**
   * GET /api/v1/cards
   * Return all cards for the authenticated user.
   */
  async listCards(req, res) {
    const userId = req.user?.id || req.user?.$id;
    const cards = await cardService.getUserCards(userId);
    res.json({ success: true, data: cards });
  }

  /**
   * POST /api/v1/cards
   * Tokenise and save a new card.
   *
   * Body: { cardNumber, holderName, expiryMonth, expiryYear, cvv, label?, cardType?, color? }
   */
  async addCard(req, res) {
    const userId = req.user?.id || req.user?.$id;
    const {
      cardNumber,
      holderName,
      expiryMonth,
      expiryYear,
      cvv,
      label,
      cardType,
      color,
    } = req.body;

    const card = await cardService.addCard(userId, {
      cardNumber,
      holderName,
      expiryMonth: parseInt(expiryMonth, 10),
      expiryYear: parseInt(expiryYear, 10),
      cvv,
      label,
      cardType,
      color,
    });

    res.status(201).json({
      success: true,
      data: card,
      message: "Card added successfully",
    });
  }

  /**
   * DELETE /api/v1/cards/:id
   * Remove a card from the user's account.
   */
  async deleteCard(req, res) {
    const userId = req.user?.id || req.user?.$id;
    const { id } = req.params;

    await cardService.deleteCard(userId, id);

    res.json({ success: true, message: "Card removed successfully" });
  }

  /**
   * PATCH /api/v1/cards/:id/default
   * Mark a card as the default payment method.
   */
  async setDefaultCard(req, res) {
    const userId = req.user?.id || req.user?.$id;
    const { id } = req.params;

    const card = await cardService.setDefaultCard(userId, id);

    res.json({
      success: true,
      data: card,
      message: "Default card updated",
    });
  }

  /**
   * PATCH /api/v1/cards/:id/status
   * Freeze or unfreeze a card.
   * Body: { status: "active" | "frozen" }
   */
  async updateCardStatus(req, res) {
    const userId = req.user?.id || req.user?.$id;
    const { id } = req.params;
    const { status } = req.body;

    const card = await cardService.updateCardStatus(userId, id, status);

    res.json({
      success: true,
      data: card,
      message: `Card ${status === "frozen" ? "frozen" : "unfrozen"} successfully`,
    });
  }

  /**
   * PATCH /api/v1/cards/:id
   * Update user-editable card metadata (label, color).
   * Body: { label?, color? }
   */
  async updateCard(req, res) {
    const userId = req.user?.id || req.user?.$id;
    const { id } = req.params;
    const { label, color } = req.body;

    const card = await cardService.updateCard(userId, id, { label, color });

    res.json({
      success: true,
      data: card,
      message: "Card updated successfully",
    });
  }
}

module.exports = new CardController();
