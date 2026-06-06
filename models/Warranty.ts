import mongoose, { Schema, models, model } from "mongoose";

const WarrantySchema = new Schema(
  {
    userEmail: { type: String, required: true, index: true },
    productName: { type: String, default: "" },
    companyName: { type: String, default: "" },
    companyPhone: { type: String, default: "" },
    serialNumber: { type: String, default: "" },
    purchaseDate: { type: Date },
    expiryDate: { type: Date, required: true },
    notes: { type: String, default: "" },
    imageUrl: { type: String, default: "" }, // AWS S3 URL (preferred)
    imageKey: { type: String, default: "" }, // S3 object key (for deletion)
    imageData: { type: String, default: "" }, // optional base64 preview fallback
    remindersEnabled: { type: Boolean, default: true },
    lastReminderSentAt: { type: Date },
  },
  { timestamps: true }
);

export type WarrantyDoc = mongoose.InferSchemaType<typeof WarrantySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Warranty = models.Warranty || model("Warranty", WarrantySchema);
