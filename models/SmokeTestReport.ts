import mongoose, { Schema } from "mongoose";

const SmokeTestReportSchema = new Schema(
    {
        buildUrl: { type: String, required: true },
        homepageStatus: { type: String, enum: ["PASS", "FAIL"], required: true },
        loginStatus: { type: String, enum: ["PASS", "FAIL", "N/A"], default: "N/A" },
        consoleErrors: { type: [String], default: [] },
        networkErrors: { type: [String], default: [] },
        uiChecks: { type: Schema.Types.Mixed, default: {} },
        pageLoadTimeMs: { type: Number, default: 0 },
        redirectChecks: { type: [String], default: [] },
        criticalApiChecks: { type: [String], default: [] },
        testedPages: { type: [String], default: [] },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

if (process.env.NODE_ENV === "development") {
    delete mongoose.models.SmokeTestReport;
}

export default mongoose.models.SmokeTestReport || mongoose.model("SmokeTestReport", SmokeTestReportSchema);
