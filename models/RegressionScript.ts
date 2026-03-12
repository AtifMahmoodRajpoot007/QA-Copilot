import mongoose, { Schema } from "mongoose";

const RegressionScriptSchema = new Schema(
    {
        name: { type: String, required: true },
        url: { type: String, required: true },
        steps: {
            type: [
                {
                    action: { type: String, required: true },
                    selector: { type: String },
                    value: { type: String },
                    timestamp: { type: Number, required: true },
                },
            ],
            default: [],
        },
        generatedScript: { type: String, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

if (process.env.NODE_ENV === "development") {
    delete mongoose.models.RegressionScript;
}

export default mongoose.models.RegressionScript || mongoose.model("RegressionScript", RegressionScriptSchema);
