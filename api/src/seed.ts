import bcrypt from "bcryptjs";
import { scoreSample } from "./catalog.js";
import { Product, User } from "./models.js";

const samples = [
  {
    name: "Bamboo Drawer Organizer Set",
    category: "Home",
    subcategory: "Storage",
    product_price: 29.99,
    supplier_cost: 9.5,
    shipping_cost: 4,
    warehouse: "US",
    ship_from: "US",
    shipping_time: "3-5 days",
    image_src: "https://example.com/drawer.jpg",
    image_urls: ["https://example.com/drawer.jpg"],
    supplier_name: "US Home Supply"
  },
  {
    name: "Desk Organizer Tray with Pen Holder",
    category: "Office",
    subcategory: "Desk",
    product_price: 34.99,
    supplier_cost: 11,
    shipping_cost: 4.5,
    warehouse: "US",
    ship_from: "US",
    shipping_time: "2-4 days",
    image_src: "https://example.com/desk.jpg",
    image_urls: ["https://example.com/desk.jpg"],
    supplier_name: "US Office Supply"
  },
  {
    name: "Spice Rack Pantry Organizer",
    category: "Kitchen",
    subcategory: "Pantry",
    product_price: 39.99,
    supplier_cost: 12,
    shipping_cost: 5,
    warehouse: "US",
    ship_from: "US",
    shipping_time: "4-6 days",
    image_src: "https://example.com/spice.jpg",
    image_urls: ["https://example.com/spice.jpg"],
    supplier_name: "US Kitchen Supply"
  },
  {
    name: "Phone Case LED Strip",
    category: "Electronics",
    subcategory: "Accessories",
    product_price: 12.99,
    supplier_cost: 8,
    shipping_cost: 6,
    warehouse: "CN",
    ship_from: "CN",
    shipping_time: "15-25 days",
    image_urls: [],
    supplier_name: "CN General"
  }
];

export async function seedDemoUser() {
  const existing = await User.findOne({ email: "demo@store.test" });
  if (existing) {
    return;
  }

  const user = await User.create({
    name: "Demo Owner",
    email: "demo@store.test",
    passwordHash: await bcrypt.hash("password123", 10)
  });

  const scored = samples.map((sample, index) =>
    scoreSample({
      ...sample,
      product_id: index + 1,
      source_product_id: `DEMO-${index + 1}`,
      price: sample.product_price
    })
  );

  await Product.insertMany(
    scored.map((product) => ({
      userId: user._id,
      productId: Number(product.product_id) || 0,
      name: String(product.name),
      grade: String(product.grade || "Skip"),
      usBased: String(product.us_based || "N"),
      overallScore: Number(product.overall_score) || 0,
      collectionId: String(product.collection_id || ""),
      supplierName: String(product.supplier_name || "Unknown"),
      payload: product
    }))
  );

  console.log("Seeded demo@store.test / password123");
}
