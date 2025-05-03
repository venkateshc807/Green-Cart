import Product from "../models/productModel.js"
import Order from "../models/orderModels.js"
import stripe from "stripe"
import User  from "../models/userModel.js"


//Place order COD : /api/order/cod
export const placeOrderCOD = async (req, res) => {
    try {
        const { userId, items, address } = req.body
        if(!address || items.length === 0){
            return res.json({succes: false , message : "Invalid data"})
        }
        //Calculate amount using items
        let amount = await items.reduce(async(acc, item) => {
            const product = await Product.findById(item.product)
            return (await acc) + product.offerPrice * item.quantity
        }, 0)

        //Add tax charge 2%

        amount += Math.floor( amount * 0.02)

        await Order.create({
            userId,
            items,
            amount,
            address, 
            paymentType : "COD",
        })

        return res.json({success: true, message : "Order placed successfully"})
    } catch (error) {
        console.log(error.message)
        res.json({success : false, message: error.message })
    }
}


//Place order Online-payment : /api/order/stripe
export const placeOrderStripe = async (req, res) => {
    try {
        const { userId, items, address } = req.body

        const {origin} = req.headers

        if(!address || items.length === 0){
            return res.json({succes: false , message : "Invalid data"})
        }

        let productData = []

        //Calculate amount using items
        let amount = await items.reduce(async(acc, item) => {
            const product = await Product.findById(item.product)
            productData.push({
                name: product.name,
                price : product.offerPrice,
                quantity : item.quantity,
            })
            return (await acc) + product.offerPrice * item.quantity
        }, 0)

        //Add tax charge 2%

        amount += Math.floor( amount * 0.02)

        const order =  await Order.create({
            userId,
            items,
            amount,
            address, 
            paymentType : "Online",
        })

        //Stripe Gateway initialize
        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)
        //Create line items for stripe
        const line_items = productData.map((item) =>{
            return{
                price_data : {
                    currency : "usd",
                    product_data : {
                        name : item.name,
                    },
                    unit_amount : Math.floor(item.price + item.price * 0.02) * 100
                },
                quantity : item.quantity,
            }
        })

        //Create session

        const session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode : "payment",
            success_url : `${origin}/loader?next=my-orders`,
            cancel_url :  `${origin}/cart`,
            metadata : {
                orderId : order._id.toString(),
                userId,
            }
        })
        return res.json({success: true, url : session.url})
    } catch (error) {
        console.log(error.message)
        res.json({success : false, message: error.message })
    }
}

//Stripe webhooks to verify payment axtion : /atripe

export const stripeWebHooks = async(req, res) =>{
    //Stripe gateway initialize
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)

    const sig = req.headers['stripe-signature']
    let event
    try {
        event = stripeInstance.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        )
    } catch (error) {
        res.status(400).send(`Webhoook Error ${error.message}`)
    }
    //Handle the event
    switch (event.type) {
        case "payment_intent.succeeded" :{
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;
            
            //Getting Session metadata

            const session = await stripeInstance.checkout.sessions.list({
                payment_intent : paymentIntentId,
            })

            const { orderId, userId } = session.data[0].metadata;

            //Mark payment as paid

            await Order.findByIdAndUpdate(orderId, {isPaid : true })

            //Clear the cart data

            await User.findByIdAndUpdate(userId, { cartItems : {}})
            break
        }
        case "payment_intent.succeeded_failed" : {
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;
            
            //Getting Session metadata

            const session = await stripeInstance.checkout.sessions.list({
                payment_intent : paymentIntentId,
            })

            const { orderId } = session.data[0].metadata;
            await Order.findByIdAndDelete(orderId)
            break
        }
    
        default:
            console.error( `Unhandled event type ${event.type}`)
            break;
    }
    res.json({ received : true})
}


//Get orders by user id : /api/order/user

export const getUserOrders = async (req, res) => {
    try {
        const userId = req.userId; // Get the userId from the authenticated user (authUser middleware)

        const orders = await Order.find({
            userId,
            $or: [{ paymentType: "COD" }, { isPaid: true }]
        }).populate("items.product address").sort({ createdAt: -1 });

        res.json({ success: true, orders }); // Return orders if found
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message }); // Handle errors
    }
};


//Get all order ( for seller / admin ) : /api/order/seller 

export const getAllOrders = async(req, res) =>{
    try {
        const orders = await Order.find({
            $or : [{ paymentType: "COD"}, {isPaid: true}]
    }).populate("items.product address").sort({createdAt : -1})
    res.json({success: true , orders})
    } catch (error) {
        console.log(error.message)
        res.json({success : false, message: error.message })
    }
}