##Example of code for razorpay payment integration

```javascript

"use client";
import Image from "next/image";
import products from "@/data/products.json";
import { useTransition } from "react";
import { createOrders, verifyPayment } from "@/actions/razorpay";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function Razorpay() {
  const [loading, startTransition] = useTransition();
  const router = useRouter();
  const product = products[0];

  function handleBuy() {
    startTransition(async () => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;

      script.onload = async () => {
        const result = await createOrders({ productId: product.id, quantity: 1 });

        if (result.error) {
          alert("Error creating orders");
          return;
        }

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: (product.price - product.price * (product.discount / 100)) * 100,
          currency: "USD",
          name: "Payment Gateways Demo",
          image: `${process.env.NEXT_PUBLIC_BASE_URL}${product.image}`,
          order_id: result.orderId,
          handler: async function (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            const result = await verifyPayment(response);
            if (result.error) {
              toast.error("Payment failed");
              router.push("/payment?status=failed");
              return;
            }
            router.push("/payment?status=success");
            toast.success("Payment successful");
          },
          prefill: {
            name: "Payment Gateways Demo",
            email: "premprakash@example.com",
            contact: "9999999999",
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };

      document.body.appendChild(script);
    });
  }

  return (
    <div className="h-screen w-full flex justify-center items-center">
      <div className="flex w-full max-w-xs flex-col overflow-hidden rounded-lg  bg-white dark:bg-gray-950 shadow-md">
        <div className="relative m-2 flex h-60 overflow-hidden rounded-xl">
          <Image
            height={500}
            width={500}
            className="object-cover"
            src={product.image}
            alt="product image"
          />
          <span className="absolute top-0 left-0 m-2 rounded-full bg-black px-2 text-center text-sm font-medium text-white">
            {product.discount}% OFF
          </span>
        </div>
        <div className="mt-4 px-5 pb-5">
          <a href="#">
            <h5 className="text-xl tracking-tight text-slate-900 dark:text-gray-200">
              {product.name}
            </h5>
          </a>
          <div className="mt-2 mb-5 flex items-center justify-between">
            <p>
              <span className="text-3xl font-bold text-slate-900 dark:text-gray-200">
                ₹{(product.price - product.price * (product.discount / 100)).toFixed(2)}
              </span>
              <span className="text-sm text-slate-900 dark:text-gray-200 line-through">
                ₹{product.price.toFixed(2)}
              </span>
            </p>
          </div>
          <button
            disabled={loading}
            onClick={handleBuy}
            className="w-full rounded-md bg-slate-900 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            {loading ? "Loading..." : "Buy Now"}
          </button>
        </div>
      </div>
    </div>
  );
}


```

actions/razorpay.ts:

```javascript

"use server";
import Razorpay from "razorpay";
import products from "@/data/products.json";
import { createHmac } from "crypto";

interface CreateOrdersInput {
  productId: number;
  quantity: number;
}

export async function createOrders({ productId, quantity }: CreateOrdersInput) {
  if (!productId || !quantity) {
    return { error: "Invalid input" };
  }

  const product = products.find((product) => product.id === productId);

  if (!product) {
    return { error: "Product not found" };
  }

  try {
    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      console.log("Razorpay keys are missing");
      return { error: "Razorpay keys are missing" };
    }

    const instance = new Razorpay({
      key_id,
      key_secret,
    });

    const orders = await instance.orders.create({
      amount: (product.price - product.price * (product.discount / 100)) * 100,
      currency: "INR",
    });

    if (!orders) {
      return { error: "Error creating orders" };
    }

    // Save the order details in the database

    return { orderId: orders.id };
  } catch (error) {
    console.log("Error creating orders", error);
    return { error: "Error creating orders" };
  }
}

export async function verifyPayment(data: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}) {
  try {
    const shasum = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!);
    shasum.update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`);
    const digest = shasum.digest("hex");

    if (digest !== data.razorpay_signature) {
      return { error: "Transaction not legit!" };
    }

    // Save the payment details in the database

    return { success: true };
  } catch (error) {
    console.log("Error verifying payment", error);
    return { error: "Error verifying payment" };
  }
}



```

# Razorpay

NEXT_PUBLIC_RAZORPAY_KEY_ID={{RAZORPAY_KEY_ID}}
RAZORPAY_KEY_SECRET={{RAZORPAY_KEY_SECRET}}
