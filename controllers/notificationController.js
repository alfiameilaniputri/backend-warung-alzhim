const Notification = require("../models/Notification");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Gagal mengambil notifikasi" });
  }
};

exports.readNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({ _id: id });

    if (!notification)
      return res.status(404).json({ msg: "Notifikasi tidak ditemukan" });

    if (notification.user.toString() !== req.user._id.toString())
      return res.status(403).json({ msg: "Tidak diizinkan. Notifikasi bukan milik Anda" });

    await notification.updateOne({ $set: { isRead: true } });

    res.status(200).json({ msg: "Notifikasi berhasil ditandai sebagai dibaca" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Gagal menandai notifikasi" });
  }
};
