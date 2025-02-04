const orderModel = require('../../models/orderModel');

const showSalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;

        let dateFilter = {};
        const queryType = req.query.type;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

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

        // First, get total count of orders with delivered products
        const allOrders = await orderModel
            .find({ ...dateFilter })
            .sort({ date: -1 })
            .populate({ path: 'products' });

        const ordersWithDelivered = allOrders.filter(order => 
            order.products.some(product => product.productStatus === 'Delivered')
        );

        const totalOrders = ordersWithDelivered.length;
        const totalPages = Math.ceil(totalOrders / limit);
        const skip = (page - 1) * limit;

        // Get paginated subset of filtered orders
        const paginatedOrders = ordersWithDelivered.slice(skip, skip + limit);

        // Process the paginated orders
        const deliveredOrders = paginatedOrders.map(order => ({
            ...order.toObject(),
            products: order.products.filter(product => product.productStatus === 'Delivered')
        }));

        // Calculate total price
        const totalPrice = deliveredOrders.reduce((acc, order) => {
            const deliveredProductTotal = order.products.reduce(
                (sum, product) => sum + (product.price || 0) * (product.quantity || 0),
                0
            );
            return acc + deliveredProductTotal;
        }, 0);

        res.render('admin/salesReport', {
            fetchAllOrders: deliveredOrders,
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