import jwt from "jsonwebtoken"

const authUser = async (req, res, next) => {
    try {
        const { token } = req.cookies

        if (!token) {
            return res.status(401).json({ success: false, message: "Not authorized: Token missing" })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        if (!decoded?.id) {
            return res.status(401).json({ success: false, message: "Not authorized: Invalid token" })
        }

        req.userId = decoded.id
        next()

    } catch (error) {
        console.error("Auth error:", error.message)
        return res.status(401).json({ success: false, message: "Authentication failed: " + error.message })
    }
}

export default authUser
