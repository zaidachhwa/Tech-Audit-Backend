import Announcement from "../models/announcement.model.js";

export const getAnnouncements = async (req, res) => {
try {
const announcements = await Announcement.find().sort({ createdAt: -1 });
res.status(200).json({ announcements });
} catch (err) {
res.status(500).json({ message: "Server error" });
}
};

export const createAnnouncement = async (req, res) => {
try {
const { title, description, batchName, priority, createdBy } = req.body;

```
const announcement = await Announcement.create({
  title,
  description,
  batchName,
  priority,
  createdBy,
});

res.status(201).json({ announcement });
```

} catch (err) {
console.error(err);
res.status(500).json({ message: "Server error" });
}
};

export const deleteAnnouncement = async (req, res) => {
try {
await Announcement.findByIdAndDelete(req.params.id);
res.status(200).json({ message: "Deleted" });
} catch (err) {
res.status(500).json({ message: "Server error" });
}
};
