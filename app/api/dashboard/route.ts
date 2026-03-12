import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TestCase from "@/models/TestCase";
import BugReport from "@/models/BugReport";
import RegressionAnalysis from "@/models/RegressionAnalysis";
import SmokeTestReport from "@/models/SmokeTestReport";
import RegressionScript from "@/models/RegressionScript";
import QAAssistantSession from "@/models/QAAssistantSession";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await connectToDatabase();

        // Count documents directly from each collection
        const totalTestCases = await TestCase.countDocuments();
        const totalBugReports = await BugReport.countDocuments();
        const totalRegressionAnalyses = await RegressionAnalysis.countDocuments();
        const totalSmokeTests = await SmokeTestReport.countDocuments();
        const totalRegressionScripts = await RegressionScript.countDocuments();
        const totalAssistantSessions = await QAAssistantSession.countDocuments();

        // New Smoke Test Metrics
        const smokeTestStats = await SmokeTestReport.aggregate([
            {
                $group: {
                    _id: null,
                    avgLoadTime: { $avg: "$pageLoadTimeMs" },
                    passCount: { $sum: { $cond: [{ $eq: ["$homepageStatus", "PASS"] }, 1, 0] } }
                }
            }
        ]);

        const avgSmokeLoadTime = Math.round(smokeTestStats[0]?.avgLoadTime || 0);
        const smokeSuccessRate = totalSmokeTests > 0
            ? Math.round((smokeTestStats[0]?.passCount / totalSmokeTests) * 100)
            : 100;

        // AI Assistant Metrics
        const assistantStats = await QAAssistantSession.aggregate([
            { $unwind: "$results" },
            {
                $group: {
                    _id: null,
                    totalTests: { $sum: 1 },
                    passCount: { $sum: { $cond: [{ $eq: ["$results.status", "pass"] }, 1, 0] } }
                }
            }
        ]);

        const assistantSuccessRate = assistantStats[0]?.totalTests > 0
            ? Math.round((assistantStats[0]?.passCount / assistantStats[0]?.totalTests) * 100)
            : 100;

        // Calculation Logic (Expanded):
        // Each Test Case = 10 mins
        // Each Bug Enhancement = 8 mins
        // Each Regression Analysis = 15 mins
        // Each Smoke Test = 20 mins (Automation saves manual execution)
        // Each Recorded Script = 30 mins (Saves scripting time)
        // Each AI Assistant Test = 5 mins (Saves manual execution)
        const totalMinutes =
            (totalTestCases * 10) +
            (totalBugReports * 8) +
            (totalRegressionAnalyses * 15) +
            (totalSmokeTests * 20) +
            (totalRegressionScripts * 30) +
            ((assistantStats[0]?.totalTests || 0) * 5);

        // Convert to hours with 2 decimal precision
        const timeSavedHours = parseFloat((totalMinutes / 60).toFixed(2));

        return NextResponse.json({
            totalTestCases,
            totalBugReports,
            totalRegressionAnalyses,
            totalSmokeTests,
            totalRegressionScripts,
            totalAssistantSessions,
            assistantSuccessRate,
            smokeSuccessRate,
            avgSmokeLoadTime,
            timeSavedHours,
            totalMinutes
        });
    } catch (error: any) {
        console.error("[api/dashboard]", error);
        return NextResponse.json(
            { error: "Failed to fetch stats" },
            { status: 500 }
        );
    }
}
