const fetch = require("node-fetch");

const GLIFBUX_API = "https://jamiedubs-glifbux.web.val.run";
const INVENTORY_API = "https://jamiedubs-glifinventory.web.val.run";

// Helper to get headers with optional authorization
const getHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (process.env.CHAIRMAN_PASSWORD) {
    headers["Authorization"] = process.env.CHAIRMAN_PASSWORD;
  }

  return headers;
};

// Helper to handle API errors
const handleApiError = async (response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error (${response.status}): ${text}`);
  }
  return response.json();
};

/**
 * Get balance for a user
 * @param {Object} user - Discord user object
 * @returns {Promise<number>} User's balance
 */
async function getBalance(user) {
  console.log(`[GlifbuxAPI] Getting balance for user ${user.username}`);
  const startTime = Date.now();

  try {
    const address = `discord:${user.username}`;
    const response = await fetch(
      `${GLIFBUX_API}/balance?address=${encodeURIComponent(address)}`,
      { headers: getHeaders() }
    );
    const data = await handleApiError(response);

    const endTime = Date.now();
    console.log(`[GlifbuxAPI] Got balance in ${endTime - startTime}ms`);

    return data.balance;
  } catch (error) {
    console.error("[GlifbuxAPI] Error getting balance:", error);
    throw error;
  }
}

/**
 * Send glifbux from one user to another
 * @param {Object} fromUser - Discord user sending glifbux
 * @param {Object} toUser - Discord user receiving glifbux
 * @param {number} amount - Amount of glifbux to send
 * @returns {Promise<boolean>} Success status
 */
async function sendGlifbux(fromUser, toUser, amount) {
  const fromAddress = `discord:${fromUser.username}`;
  const toAddress = `discord:${toUser.username}`;

  console.log(
    `[GlifbuxAPI] Sending ${amount} glifbux from ${fromAddress} to ${toAddress}`
  );
  const startTime = Date.now();

  try {
    const response = await fetch(`${GLIFBUX_API}/send`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        from: fromAddress,
        to: toAddress,
        amount: amount,
      }),
    });

    await handleApiError(response);

    const endTime = Date.now();
    console.log(`[GlifbuxAPI] Transfer completed in ${endTime - startTime}ms`);

    return true;
  } catch (error) {
    console.error("[GlifbuxAPI] Error sending glifbux:", error);
    if (error.message.includes("insufficient")) {
      throw new Error("Insufficient glifbux");
    }
    throw error;
  }
}

/**
 * Award glifbux to a user (system mint)
 * @param {Object} user - Discord user to award glifbux to
 * @param {number} amount - Amount of glifbux to award
 * @returns {Promise<boolean>} Success status
 */
async function awardGlifbux(user, amount) {
  const toAddress = `discord:${user.username}`;
  console.log(`[GlifbuxAPI] Minting ${amount} glifbux to ${toAddress}`);
  const startTime = Date.now();

  try {
    const response = await fetch(`${GLIFBUX_API}/mint`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        to: toAddress,
        amount: amount,
      }),
    });

    await handleApiError(response);

    const endTime = Date.now();
    console.log(`[GlifbuxAPI] Mint completed in ${endTime - startTime}ms`);

    return true;
  } catch (error) {
    console.error("[GlifbuxAPI] Error minting glifbux:", error);
    throw error;
  }
}

/**
 * Get inventory for a user
 * @param {Object} user - Discord user
 * @returns {Promise<Array>} User's inventory items
 */
async function getInventory(user) {
  console.log(`[GlifInventoryAPI] Getting inventory for user ${user.username}`);
  const startTime = Date.now();

  try {
    const address = `discord:${user.username}`;
    const response = await fetch(
      `${INVENTORY_API}/inventory?address=${encodeURIComponent(address)}`,
      { headers: getHeaders() }
    );
    const data = await handleApiError(response);

    const endTime = Date.now();
    console.log(`[GlifInventoryAPI] Got inventory in ${endTime - startTime}ms`);

    return data.inventory;
  } catch (error) {
    console.error("[GlifInventoryAPI] Error getting inventory:", error);
    throw error;
  }
}

/**
 * Add an item to a user's inventory
 * @param {Object} user - Discord user
 * @param {Object} item - Item to add with properties: name, description, rarity, quantity
 * @returns {Promise<boolean>} Success status
 */
async function addToInventory(user, item) {
  const address = `discord:${user.username}`;
  console.log(
    `[GlifInventoryAPI] Adding item ${item.name} to ${address}'s inventory`
  );
  const startTime = Date.now();

  try {
    const response = await fetch(`${INVENTORY_API}/add-item`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        address: address,
        item: {
          name: item.name,
          description: item.description,
          type: item.type || "item",
          rarity: item.rarity,
          quantity: item.quantity,
          image: item.image,
        },
      }),
    });

    await handleApiError(response);

    const endTime = Date.now();
    console.log(`[GlifInventoryAPI] Added item in ${endTime - startTime}ms`);

    return true;
  } catch (error) {
    console.error("[GlifInventoryAPI] Error adding item to inventory:", error);
    throw error;
  }
}

module.exports = {
  getBalance,
  sendGlifbux,
  awardGlifbux,
  getInventory,
  addToInventory,
};
