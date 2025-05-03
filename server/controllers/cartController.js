import User from "../models/userModel.js"

// Update user cart data: POST /api/cart/update
export const updateCart = async (req, res) => {
    try {
        const { cartItems } = req.body
        const userId = req.userId // ✅ From middleware

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID not found in request" })
        }

        if (!cartItems || typeof cartItems !== 'object') {
            return res.status(400).json({ success: false, message: "Invalid cart items format" })
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { cartItems },
            { new: true }
        )

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" })
        }

        res.status(200).json({ success: true, message: "Cart updated", cartItems: updatedUser.cartItems })

    } catch (error) {
        console.error("updateCart error:", error.message)
        res.status(500).json({ success: false, message: "Internal server error: " + error.message })
    }
}

  