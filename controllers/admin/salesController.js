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
            .find({ status: 'Delivered', ...dateFilter })
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip)
            .populate({ path: 'products' });

        const totalOrders = await orderModel.countDocuments({
            status: 'Delivered',
            ...dateFilter,
        });

        const totalPrice = fetchAllOrders.reduce(
            (acc, order) => acc + (order.totalAmount || 0),
            0
        );

        const totalPages = Math.ceil(totalOrders / limit);

        res.render('admin/salesReport', {
            fetchAllOrders,
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
