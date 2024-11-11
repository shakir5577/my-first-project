
const couponModel = require('../../models/couponModel')
const cartModel = require('../../models/cartModel')

const showCoupon = async (req, res) => {

    try {

        const findCoupons = await couponModel.find()

        res.render('user/coupon', { coupons: findCoupons })

    } catch (error) {

        console.log(error)
    }
}

const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        if (!couponCode) {
            console.log('Coupon code not provided');
            return res.send({ error: "Can't get coupon code" });
        }

        const { userId } = req.session;
        if (!userId) {
            console.log("User not logged in...");
            return res.send({ error: "User not logged in" });
        }

        const fetchCoupon = await couponModel.findOne({ code: couponCode });
        if (!fetchCoupon) {
            console.log("Coupon not found");
            return res.send({ error: "*Coupon not found" });
        }

        // Get current date with time set to midnight for comparison
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // clear time portion

        // Ensure startDate and endDate are also at midnight
        const couponStartDate = fetchCoupon.startDate ? new Date(fetchCoupon.startDate) : null;
        const couponEndDate = fetchCoupon.endDate ? new Date(fetchCoupon.endDate) : null;

        if (couponStartDate) couponStartDate.setHours(0, 0, 0, 0);
        if (couponEndDate) couponEndDate.setHours(0, 0, 0, 0);

        if (couponEndDate && couponEndDate < currentDate) {
            console.log("Coupon has expired");
            return res.send({ error: "*Coupon has expired" });
        }
        if (couponStartDate && couponStartDate > currentDate) {
            console.log("Coupon not valid yet");
            return res.send({ error: "*Coupon not valid yet" });
        }
        if (fetchCoupon.userList.some((user) => user.userId === userId)) {
            console.log("Coupon already used by this user");
            return res.send({ error: "*Coupon already used" });
        }

        const findCart = await cartModel
            .findOne({ userId: userId })
            .populate({
                path: "items.productId",
                populate: {
                    path: "offers",
                    select: "offerType discount startDate endDate"
                }
            });

        if (!findCart) {
            console.log("Cart not found for user");
            return res.send({ error: "Cart not found for user" });
        }

        // Calculate total amount with active offers
        const totalAmount = findCart.items.reduce((acc, item) => {
            const product = item.productId;
            let discountAmount = 0;

            // Check for active offer on each product
            const activeOffer = product.offers.find(offer =>
                offer.startDate <= currentDate && offer.endDate >= currentDate
            );
            if (activeOffer) {
                discountAmount = activeOffer.discount;
            }

            // Calculate effective price considering the discount
            const effectivePrice = Math.max(0, product.price - discountAmount);
            return acc + (effectivePrice * item.quantity);
        }, 0);

        // Check if the total meets the coupon's minimum purchase amount
        if (totalAmount < fetchCoupon.minPurchaseAmount) {
            console.log("Minimum purchase amount not met");
            return res.send({ error: "*Minimum purchase amount not met" });
        }

        // Calculate final amount after applying coupon discount
        const finalAmount = totalAmount - fetchCoupon.discountAmount;

        // Save the coupon usage (optional, based on your flow)

        fetchCoupon.userList.push({ userId }); 
        await fetchCoupon.save();

        res.send({
            discountedAmount: finalAmount,
            discount: fetchCoupon.discountAmount,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({ error: "Internal Server Error" });
    }
};


module.exports = {

    showCoupon,
    applyCoupon
}