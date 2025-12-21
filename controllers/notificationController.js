const Notification = require("../models/Notification");

//GET ALL NOTIFICATIONS
exports.getNotifications = async (req, res) => {
  try {
    // Ambil semua notifikasi milik user yang sedang login
    const notifications = await Notification.find({ user: req.user._id }).sort({
      createdAt: -1,
    }); // Urutkan dari yang terbaru

    //kirim datta noti ke client
    res.status(200).json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Gagal mengambil notifikasi" });
  }
};

exports.readNotification = async (req, res) => {
  try {
    const { id } = req.params; // ambil id dari param

    //cari notif berdasarkan id
    const notification = await Notification.findOne({ _id: id });

    //jika notif tidak ditemukan
    if (!notification)
      return res.status(404).json({ msg: "Notifikasi tidak ditemukan" });

    // Pastikan notifikasi memang milik user yang login
    if (notification.user.toString() !== req.user._id.toString())
      return res
        .status(403)
        .json({ msg: "Tidak diizinkan. Notifikasi bukan milik Anda" });

    // Update status notifikasi menjadi sudah dibaca
    await notification.updateOne({ $set: { isRead: true } });

    res
      .status(200)
      .json({ msg: "Notifikasi berhasil ditandai sebagai dibaca" });
    //kiirm respons sukse
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Gagal menandai notifikasi" });
  }
};
