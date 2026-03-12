import mongoose from "mongoose";

const AgentStepSchema = new mongoose.Schema({
    action: { type: String },
    selector: { type: String },
    value: { type: String },
    url: { type: String },
    reasoning: { type: String },
    screenshot: { type: String }
});

const TestExecutionResultSchema = new mongoose.Schema({
    status: { type: String, enum: ["pass", "fail"], required: true },
    errorMessage: { type: String, default: "" },
    steps: [AgentStepSchema],
    totalDurationMs: { type: Number, required: true },
});

const QAAssistantSessionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    url: { type: String },
    instruction: { type: String, required: true },
    results: TestExecutionResultSchema,
    createdAt: { type: Date, default: Date.now },
});

// Next.js hot-reloading cache clear for this model
if (mongoose.models.QAAssistantSession) {
    delete mongoose.models.QAAssistantSession;
}

export default mongoose.models.QAAssistantSession ||
    mongoose.model("QAAssistantSession", QAAssistantSessionSchema);
