import mongoose, { Schema } from "mongoose";

const FlowStepSchema = new Schema(
    {
        step: { type: Number, required: true },
        action: { type: String, required: true },
        label: { type: String },
        url: { type: String },
        selector: { type: String },
        selectors: {
            css: { type: String },
            text: { type: String },
            role: { type: String },
            placeholder: { type: String },
            xpath: { type: String },
        },
        value: { type: String },
        expected: { type: String },
    },
    { _id: false }
);

const TestFlowSchema = new Schema(
    {
        name: { type: String, required: true },
        targetUrl: { type: String, required: true },
        steps: { type: [FlowStepSchema], default: [] },
        description: { type: String, default: "" },
        sourceType: {
            type: String,
            enum: ["recorded", "generated"],
            default: "recorded",
        },
        requirement: { type: String, default: "" },
        createdBy: { type: String, default: "QA Engineer" },
    },
    { timestamps: true }
);

if (process.env.NODE_ENV === "development") {
    delete mongoose.models.TestFlow;
}

export default mongoose.models.TestFlow || mongoose.model("TestFlow", TestFlowSchema);
