const midtransClient = require("midtrans-client");

// ===================== IRIS CLIENT (Core API untuk payout) ===================== //
const iris = new midtransClient.Iris({
  isProduction: false, // sandbox mode
  serverKey: "SB-Mid-server-gaXA8yU01TD2UC8xu5jYrnTb" // serverKey khusus Iris
});

// ===================== CREATE PAYOUT ===================== //
/**
 * payoutData = {
 *   beneficiary_name: "Nama Penerima",
 *   beneficiary_account: "No Rekening / No HP",
 *   beneficiary_bank: "bca / bni / gopay / ovo",
 *   beneficiary_email: "opsional",
 *   amount: "10000.00",
 *   notes: "catatan payout"
 * }
 */
async function createPayout(payoutData) {
  try {
    // Iris API mengharuskan array "payouts"
    const payload = { payouts: [payoutData] };
    const response = await iris.createPayouts(payload);
    return response;
  } catch (err) {
    console.error("IRIS Payout Error:", err);
    throw err;
  }
}

// ===================== EXPORT ===================== //
module.exports = {
  iris,
  createPayout
};
