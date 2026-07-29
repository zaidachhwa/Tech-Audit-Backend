import PushSubscription from "../models/pushSubscription.model.js";

export const subscribeToPush = async (req, res) => {
  try {
    const { subscription, userModel } = req.body;
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId || !userModel || !subscription) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if subscription already exists for this endpoint
    const existingSubscription = await PushSubscription.findOne({
      "subscription.endpoint": subscription.endpoint,
    });

    if (existingSubscription) {
      // If it exists but belongs to a different user, update it
      if (existingSubscription.user.toString() !== userId.toString()) {
        existingSubscription.user = userId;
        existingSubscription.userModel = userModel;
        await existingSubscription.save();
      }
      return res.status(200).json({ message: "Subscription updated" });
    }

    const newSubscription = new PushSubscription({
      user: userId,
      userModel,
      subscription,
    });

    await newSubscription.save();

    res.status(201).json({ message: "Subscribed to push notifications successfully" });
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    res.status(500).json({ message: "Failed to subscribe to push notifications" });
  }
};
