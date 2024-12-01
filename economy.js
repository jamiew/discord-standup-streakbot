const { setTimeout } = require("node:timers/promises");

// Simulated API for glifbux economy
class GlifbuxAPI {
  constructor() {
    this.balances = new Map();
    console.log("Initialized GlifbuxAPI");
  }

  getUserKey(user) {
    return `discord:${user.username}`;
  }

  async getBalance(user) {
    const userKey = this.getUserKey(user);
    console.log(`[GlifbuxAPI] Getting balance for user ${userKey}`);
    const startTime = Date.now();

    await setTimeout(100); // Simulate API delay
    const balance = this.balances.get(userKey) || 0;

    const endTime = Date.now();
    console.log(`[GlifbuxAPI] Got balance in ${endTime - startTime}ms`);
    return balance;
  }

  async sendGlifbux(fromUser, toUser, amount) {
    const fromUserKey = this.getUserKey(fromUser);
    const toUserKey = this.getUserKey(toUser);
    console.log(
      `[GlifbuxAPI] Sending ${amount} glifbux from ${fromUserKey} to ${toUserKey}`
    );
    const startTime = Date.now();

    await setTimeout(200); // Simulate API delay

    const fromBalance = this.balances.get(fromUserKey) || 0;
    if (fromBalance < amount) {
      throw new Error("Insufficient glifbux");
    }

    const toBalance = this.balances.get(toUserKey) || 0;
    this.balances.set(fromUserKey, fromBalance - amount);
    this.balances.set(toUserKey, toBalance + amount);

    const endTime = Date.now();
    console.log(`[GlifbuxAPI] Transfer completed in ${endTime - startTime}ms`);
    return true;
  }

  async awardGlifbux(user, amount) {
    const userKey = this.getUserKey(user);
    console.log(`[GlifbuxAPI] Awarding ${amount} glifbux to ${userKey}`);
    const startTime = Date.now();

    await setTimeout(150); // Simulate API delay

    const currentBalance = this.balances.get(userKey) || 0;
    this.balances.set(userKey, currentBalance + amount);

    const endTime = Date.now();
    console.log(`[GlifbuxAPI] Award completed in ${endTime - startTime}ms`);
    return true;
  }
}

const glifbuxAPI = new GlifbuxAPI();

module.exports = {
  glifbuxAPI,
};
