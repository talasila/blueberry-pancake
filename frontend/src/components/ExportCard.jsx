import { RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExportCard({ title, description, buttonLabel, isLoading, disabled, onClick }) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          onClick={onClick}
          disabled={disabled}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {buttonLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
