import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Eye, AlertCircle } from "lucide-react";
import Survey from "@/pages/user/survey";

export default function LivePreview() {
  const [previewSessionId] = useState(`preview_${Date.now()}`);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-600">LIVE PREVIEW MODE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Notice */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Card className="bg-blue-50 border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Preview Mode Active</p>
              <p className="text-sm text-blue-700 mt-1">
                This shows the exact user experience. Forms will auto-fill when you click Continue. 
                No data will be saved to the database.
              </p>
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
