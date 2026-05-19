const Razorpay = require("razorpay");
const crypto = require("crypto");
const { Payment, User } = require("../models");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "placeholder_key_id",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_key_secret",
});

const PLANS = {
  plan_10: { amount: 10, trackingBalance: 5, label: "Basic Plan" },
  plan_20: { amount: 20, trackingBalance: 15, label: "Standard Plan" },
  plan_30: { amount: 30, trackingBalance: 25, label: "Premium Plan" },
};

/**
 * Create a new Razorpay order
 * POST /api/payment/create-order
 */
exports.createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];

    if (!plan) {
      return res.status(400).json({ success: false, message: "Invalid plan selected" });
    }

    const options = {
      amount: plan.amount * 100, // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_plan_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Store payment record in DB with 'created' status
    await Payment.create({
      userId: req.user.id,
      orderId: order.id,
      amount: plan.amount,
      status: "created",
      planDetails: plan,
    });

    res.status(200).json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    res.status(500).json({ success: false, message: "Could not create order" });
  }
};

/**
 * Verify Razorpay payment signature
 * POST /api/payment/verify
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "placeholder_key_secret")
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Payment successful
      const payment = await Payment.findOne({ where: { orderId: razorpay_order_id } });

      if (!payment) {
        return res.status(404).json({ success: false, message: "Payment record not found" });
      }

      if (payment.status === "paid") {
        return res.status(200).json({ success: true, message: "Payment already verified" });
      }

      // Update payment record
      payment.paymentId = razorpay_payment_id;
      payment.signature = razorpay_signature;
      payment.status = "paid";
      await payment.save();

      // Update user tracking balance
      const user = await User.findByPk(payment.userId);
      if (user) {
        const addedBalance = payment.planDetails.trackingBalance || 0;
        user.trackingBalance += addedBalance;
        user.planType = payment.planDetails.label;
        await user.save();
      }

      return res.status(200).json({ success: true, message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid signature sent!" });
    }
  } catch (error) {
    console.error("Payment verification failed:", error);
    res.status(500).json({ success: false, message: "Verification error" });
  }
};
