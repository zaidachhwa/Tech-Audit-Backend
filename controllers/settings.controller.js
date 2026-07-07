import Settings from "../models/settings.model.js";

export const getSettings = async (req, res) => {
  try {
    const list = await Settings.find();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) {
      return res.status(400).json({ message: "key is required" });
    }
    const setting = await Settings.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true }
    );
    res.json({ message: "Settings updated successfully", setting });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
