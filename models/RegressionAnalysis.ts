import mongoose, { Schema } from "mongoose";

const RegressionAnalysisSchema = new Schema(
    {
        userId: { type: String, required: true, default: "anonymous" },
        inputText: { type: String, required: true },
        analysisOutput: { type: Schema.Types.Mixed, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

if (process.env.NODE_ENV === "development") {
    delete mongoose.models.RegressionAnalysis;
}

export default mongoose.models.RegressionAnalysis || mongoose.model("RegressionAnalysis", RegressionAnalysisSchema);
