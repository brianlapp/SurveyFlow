import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Eye, AlertCircle, Info } from "lucide-react";
import Survey from "@/pages/user/survey";

export default function LivePreview() {
  const [previewSessionId] = useState(`preview_${Date.now()}`);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full">
                  <Eye className="h-4 w-4 text-blue-700" />
                  <span className="font-semibold text-sm text-blue-700">LIVE PREVIEW MODE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Instructions */}
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
        <Card className="bg-blue-50 border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900">Live Preview Mode Active</p>
              <p className="text-sm text-blue-700 mt-1">
                This shows the exact user-facing survey experience. Click "Continue" to auto-fill forms and navigate through the flow. 
                No data will be saved to the database.
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-teal-50 border-teal-200 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-teal-900 mb-2">How It Works</p>
              <ul className="text-sm text-teal-700 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="font-semibold mt-0.5">•</span>
                  <span><strong>Step 1 (Registration):</strong> Click "Continue" to auto-fill registration fields</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold mt-0.5">•</span>
                  <span><strong>Step 2 (Survey Questions):</strong> Click through all 12 questions to see offers on survey page</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold mt-0.5">•</span>
                  <span><strong>Step 3 (Main Offers):</strong> View offer cards filtered by displayPages settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold mt-0.5">•</span>
                  <span><strong>Exit Page:</strong> See the final lottery wheel and exit offers</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Live Survey Preview */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <Survey 
          params={{ sessionId: previewSessionId }}
          previewMode={true}
        />
      </div>
    </div>
  );
}
