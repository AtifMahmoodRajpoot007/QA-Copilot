import mongoose, { Schema } from "mongoose";

const StepResultSchema = new Schema(
    {
        step: { type: Number, required: true },
        label: { type: String },
        action: { type: String },
        status: { type: String, enum: ["PASS", "FAIL", "SKIP"], required: true },
        durationMs: { type: Number, default: 0 },
        error: { type: String, default: "" },
    },
    { _id: false }
);

const FlowRunSchema = new Schema(
    {
        flowId: { type: Schema.Types.ObjectId, ref: "TestFlow", required: true },
        flowName: { type: String, required: true },
        stepResults: { type: [StepResultSchema], default: [] },
        consoleLogs: { type: [String], default: [] },
        networkFailures: { type: [String], default: [] },
        overallStatus: { type: String, enum: ["PASS", "FAIL", "PARTIAL"], default: "PASS" },
        totalDurationMs: { type: Number, default: 0 },
        failedStep: { type: String, default: "" },
        screenshot: { type: String, default: "" },
        aiAnalysis: { type: String, default: "" },
    },
    { timestamps: true }
);

if (process.env.NODE_ENV === "development") {
    delete mongoose.models.FlowRun;
}

export default mongoose.models.FlowRun || mongoose.model("FlowRun", FlowRunSchema);
