import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Eye, Info } from "lucide-react";
import Survey from "@/pages/user/survey";

export default function PublicPreview() {
  const [previewSessionId] = useState(`preview_${Date.now()}`);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full">
              <Eye className="h-4 w-4 text-blue-700" />
              <span className="font-semibold text-sm text-blue-700">PREVIEW MODE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <Card className="bg-teal-50 border-teal-200 p-4 mb-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-teal-700">
                This is a preview of the survey flow. Click "Continue" to auto-advance. No data is saved.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        <Survey 
          params={{ sessionId: previewSessionId }}
          previewMode={true}
        />
      </div>
    </div>
  );
}
