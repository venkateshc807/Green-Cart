import Address from "../models/addressModel.js"

//Add address : /api/address/add
export const addAddress = async (req, res) => {
    try {
        const { address } = req.body;

        if (!req.userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        await Address.create({ ...address, userId: req.userId });

        res.json({ success: true, message: "Address added successfully" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};


//Get address : /api/address/get
export const getAddress = async (req, res) => {
    try {
        const userId = req.userId; // Get userId from the authenticated user (from authUser middleware)
        const addresses = await Address.find({ userId }); // Find addresses by userId
        res.json({ success: true, addresses }); // Return addresses if found
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message }); // Handle any errors
    }
};
