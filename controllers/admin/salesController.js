const orderModel = require('../../models/orderModel');

const showSalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const queryType = req.query.type;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        let dateFilter = {};

        if (queryType) {
            const now = new Date();

            switch (queryType) {
                case 'Daily':
                    dateFilter.date = {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lt: new Date(now.setHours(23, 59, 59, 999)),
                    };
                    break;
                case 'Weekly':
                    const weekStart = new Date(now);
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    dateFilter.date = {
                        $gte: new Date(weekStart.setHours(0, 0, 0, 0)),
                        $lt: new Date(weekEnd.setHours(23, 59, 59, 999)),
                    };
                    break;
                case 'Yearly':
                    dateFilter.date = {
                        $gte: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
                        $lt: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
                    };
                    break;
                default:
                    throw new Error('Invalid query type');
            }
        } else if (startDate && endDate) {
            dateFilter.date = {
                $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
                $lt: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
            };
        }

        const fetchAllOrders = await orderModel
        .find({ ...dateFilter }) // Get all orders matching the date filter
        .sort({ date: -1 })
        .limit(limit)
        .skip(skip)
        .populate({ path: 'products' });
    
    // Filter orders where at least one product has status "Delivered"
    const deliveredOrders = fetchAllOrders
        .map(order => {
            // Filter only delivered products
            const deliveredProducts = order.products.filter(product => product.productStatus === 'Delivered');
    
            return {
                ...order.toObject(), // Convert Mongoose object to plain JS object
                products: deliveredProducts, // Keep only delivered products
            };
        })
        .filter(order => order.products.length > 0); // Keep only orders that have delivered products
    
    // Calculate total price only for delivered products
    const totalPrice = deliveredOrders.reduce((acc, order) => {
        const deliveredProductTotal = order.products.reduce(
            (sum, product) => sum + (product.price || 0) * (product.quantity || 0),
            0
        );
    
        return acc + deliveredProductTotal;
    }, 0);
    
    // Get the total number of orders where at least one product is delivered
    const totalOrders = deliveredOrders.length;
    const totalPages = Math.ceil(totalOrders / limit);
    
    res.render('admin/salesReport', {
        fetchAllOrders: deliveredOrders, // Now contains only orders with delivered products
        totalOrders,
        totalPrice,
        currentPage: page,
        totalPages,
        limit,
    });
    } catch (error) {
        console.error('Error in showSalesReport:', error.message);
        res.status(500).render('errorPage', { errorMessage: 'Internal Server Error' });
    }
};

module.exports = { showSalesReport };
