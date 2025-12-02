const cron = require("node-cron");
const Order = require("../models/Order");

// Runs every hour
cron.schedule("0 * * * *", async () => {
  console.log("🔄 Checking orders to auto-complete...");

  const limitTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const orders = await Order.find({
    status: "delivered",
    deliveredAt: { $lte: limitTime }
  });

  for (const order of orders) {
    order.status = "completed";
    await order.save();

    // Kirim notif user
    await Notification.create({
      user: order.buyer,
      title: "Pesanan Selesai ✔️",
      message: `Pesanan #${order._id} telah otomatis selesai karena tidak ada konfirmasi penerimaan selama 24 jam.`,
    });
  }

  console.log(`Auto-completed: ${orders.length} orders 🟢`);
});
