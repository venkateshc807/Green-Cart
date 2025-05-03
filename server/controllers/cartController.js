import User from "../models/userModel.js"


//Update user cartData : /api/cart/update
export const updateCart = async (req, res) => {
    try {
        const { cartItems } = req.body;
        const userId = req.userId; // ✅ Get from middleware

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID not found in request" });
        }

        await User.findByIdAndUpdate(userId, { cartItems });

        res.json({ success: true, message: "Cart updated" });
    } catch (error) {
        console.log("updateCart error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

  