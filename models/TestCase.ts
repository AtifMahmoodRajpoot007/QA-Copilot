import mongoose, { Schema } from "mongoose";

const TestCaseSchema = new Schema(
  {
    projectName: { type: String, default: "General" },
    moduleName: { type: String, default: "" },
    requirementInput: { type: String, required: true },
    generatedTestCases: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

if (process.env.NODE_ENV === "development") {
  delete mongoose.models.TestCase;
}

export default mongoose.models.TestCase || mongoose.model("TestCase", TestCaseSchema);
