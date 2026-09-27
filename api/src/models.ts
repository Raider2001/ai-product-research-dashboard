import mongoose, { type InferSchemaType } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    grade: { type: String, default: "Skip", index: true },
    usBased: { type: String, default: "N" },
    overallScore: { type: Number, default: 0, index: true },
    collectionId: { type: String, default: "" },
    supplierName: { type: String, default: "Unknown" },
    payload: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

const supplierSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    region: { type: String, default: "" },
    leadTimeDays: { type: Number, default: null },
    qualityScore: { type: Number, default: null }
  },
  { timestamps: true }
);

supplierSchema.index({ userId: 1, name: 1 }, { unique: true });

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productName: { type: String, default: "" },
    title: { type: String, required: true },
    note: { type: String, required: true },
    priority: { type: String, default: "medium" }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
export const Product = mongoose.model("Product", productSchema);
export const Supplier = mongoose.model("Supplier", supplierSchema);
export const ResearchNote = mongoose.model("ResearchNote", noteSchema);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
