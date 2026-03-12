import mongoose, { Schema } from "mongoose";

const BugReportSchema = new Schema(
  {
    userId: { type: String, required: true, default: "anonymous" },
    rawBugDescription: { type: String, required: true },
    structuredBugReport: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

if (process.env.NODE_ENV === "development") {
  delete mongoose.models.BugReport;
}

export default mongoose.models.BugReport || mongoose.model("BugReport", BugReportSchema);
