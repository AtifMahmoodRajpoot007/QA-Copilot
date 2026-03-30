import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TestCase from "@/models/TestCase";
import BugReport from "@/models/BugReport";
import RegressionAnalysis from "@/models/RegressionAnalysis";
import SmokeTestReport from "@/models/SmokeTestReport";
import TestFlow from "@/models/TestFlow";
import FlowRun from "@/models/FlowRun";
import QAAssistantSession from "@/models/QAAssistantSession";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await connectToDatabase();

        // Count documents from each collection
        const totalTestCases = await TestCase.countDocuments();
        const totalBugReports = await BugReport.countDocuments();
        const totalRegressionAnalyses = await RegressionAnalysis.countDocuments();
        const totalSmokeTests = await SmokeTestReport.countDocuments();
        // "Automated Tests" = saved test flows (recorded/generated)
        const totalAutomatedTests = await TestFlow.countDocuments();
        const totalAssistantSessions = await QAAssistantSession.countDocuments();

        // Smoke Test Metrics
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
            : 0;

        // AI Assistant Metrics — results is an embedded object (not array), use direct $group
        const assistantStats = await QAAssistantSession.aggregate([
            {
                $group: {
                    _id: null,
                    totalTests: { $sum: 1 },
                    passCount: {
                        $sum: { $cond: [{ $eq: ["$results.status", "pass"] }, 1, 0] }
                    }
                }
            }
        ]);

        const assistantSuccessRate = assistantStats[0]?.totalTests > 0
            ? Math.round((assistantStats[0]?.passCount / assistantStats[0]?.totalTests) * 100)
            : 0;

        // Automated test run pass rate (from FlowRun collection)
        const flowRunStats = await FlowRun.aggregate([
            {
                $group: {
                    _id: null,
                    totalRuns: { $sum: 1 },
                    passCount: { $sum: { $cond: [{ $eq: ["$overallStatus", "PASS"] }, 1, 0] } }
                }
            }
        ]);

        // Time saved calculation:
        // Each Test Case = 10 mins
        // Each Bug Enhancement = 8 mins
        // Each Regression Analysis = 15 mins
        // Each Smoke Test = 20 mins
        // Each Automated Test Flow = 30 mins
        // Each AI Assistant Session = 5 mins
        const totalMinutes =
            (totalTestCases * 10) +
            (totalBugReports * 8) +
            (totalRegressionAnalyses * 15) +
            (totalSmokeTests * 20) +
            (totalAutomatedTests * 30) +
            (totalAssistantSessions * 5);

        const timeSavedHours = parseFloat((totalMinutes / 60).toFixed(2));

        return NextResponse.json({
            totalTestCases,
            totalBugReports,
            totalRegressionAnalyses,
            totalSmokeTests,
            totalRegressionScripts: totalAutomatedTests,   // keep field name for frontend compat
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
