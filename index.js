const midtransClient = require('midtrans-client');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;
const cors = require('cors');
require('dotenv').config();

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(cors());

let snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY
});
app.get('/get-client-key', (req, res) => {
    const clientApiKey = req.headers['api-secret-key'];
    
    const serverApiKey = process.env.API_KEY_SECRET;

    if (clientApiKey !== serverApiKey) {
        return res.status(401).json({ error: 'Invalid API Secret Key' });
    }
    res.json({ clientKey: process.env.MIDTRANS_CLIENT_KEY });
});



app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


app.post('/generate-token', (req, res) => {
    const clientApiKey = req.headers.authorization?.split(' ')[1]; // Ambil API_KEY_SECRET dari header
    const serverApiKey = process.env.API_KEY_SECRET; // Ambil API_KEY_SECRET dari .env

    // Validasi API_KEY_SECRET
    if (clientApiKey !== serverApiKey) {
        return res.status(401).json({ error: 'Invalid API Key' });
    }

    const { id, orderId, productName, price, quantity, serviceCost, deliveryCost } = req.body;

    const priceNumber = Number(price);
    const quantityNumber = Number(quantity);
    const serviceCostNumber = Number(serviceCost);
    const deliveryCostNumber = Number(deliveryCost);
    const grossAmount = (priceNumber * quantityNumber) + serviceCostNumber + deliveryCostNumber;

    let parameter = {
        item_details: [
            {
                id: id,
                name: productName,
                price: priceNumber,
                quantity: quantityNumber,
            },
            {
                id: "service-cost",
                name: "Service Cost",
                price: serviceCostNumber,
                quantity: 1,
            },
            {
                id: "delivery-cost",
                name: "Delivery Cost",
                price: deliveryCostNumber,
                quantity: 1,
            },
        ],
        transaction_details: {
            order_id: orderId,
            gross_amount: grossAmount,
        },
    };
    // console.log('Parameter dikirim ke Midtrans:', JSON.stringify(parameter, null, 2));
    snap.createTransaction(parameter)
        .then((transaction) => {
            let transactionToken = transaction.token;
            // console.log('Transaction Token:', transactionToken);
            res.json({ token: transactionToken, order_id: orderId });
        })
        .catch((err) => {
            console.error('Midtrans API Error:', err.ApiResponse);
            res.status(500).json({ error: 'Failed to generate transaction token', details: err.ApiResponse });
        });
});



app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
