import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const contentTypeHeader = req.headers.get("content-type") || "";
        let data: any;
        let format: string;

        if (contentTypeHeader.includes("application/json")) {
            const body = await req.json();
            data = body.data;
            format = body.format;
        } else {
            // Handle form data for robust downloads
            const formData = await req.formData();
            data = formData.get("data");
            format = formData.get("format") as string;

            // If data is a string (from form), try to parse it if format is json
            if (format === "json" && typeof data === "string") {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    data = [];
                }
            }
        }

        const isCsv = format === "csv";
        const extension = isCsv ? "csv" : "json";
        const filename = `test-cases.${extension}`;
        const contentType = isCsv
            ? "text/csv; charset=utf-8"
            : "application/json; charset=utf-8";

        const headers = new Headers();
        // Force octet-stream to prevent browser "preview"
        headers.set("Content-Type", "application/octet-stream");
        // Requirement 1: Force specific filename, quoted for compatibility
        headers.set("Content-Disposition", `attachment; filename="${filename}"`);

        // Aggressive no-cache headers for maximum compatibility
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate, proxy-revalidate");
        headers.set("Pragma", "no-cache");
        headers.set("Expires", "0");
        headers.set("X-Content-Type-Options", "nosniff");

        let responseBody: string | Uint8Array;

        if (isCsv) {
            // Requirement 3 & 6: Ensure data is a string or fallback to headers only
            const csvData = typeof data === "string" && data.trim().length > 0
                ? data
                : "Title,Preconditions,Steps,ExpectedResult";

            // Explicitly prepend UTF-8 BOM bytes
            const encoder = new TextEncoder();
            const encoded = encoder.encode(csvData);
            const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
            const combined = new Uint8Array(bom.length + encoded.length);
            combined.set(bom);
            combined.set(encoded, bom.length);

            responseBody = combined;
        } else {
            // Requirement 2 & 6: Strict JSON stringification and fallback to empty array
            const jsonData = Array.isArray(data) ? data : [];
            const jsonStr = JSON.stringify(jsonData, null, 2);
            const encoder = new TextEncoder();
            responseBody = encoder.encode(jsonStr);
        }

        // Return properly encoded response
        return new NextResponse(responseBody as any, {
            status: 200,
            headers,
        });
    } catch (error: any) {
        console.error("[api/export]", error);
        return NextResponse.json(
            { error: "Failed to generate export file." },
            { status: 500 }
        );
    }
}
