import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PrivacyPolicyContent from '@/components/PrivacyPolicyContent';

/**
 * PrivacyPolicyPage Component
 *
 * Publicly accessible standalone page displaying the app's privacy policy.
 * No authentication required.
 */
function PrivacyPolicyPage() {
  return (
    <div className="w-full h-full">
      <div className="flex items-start pt-8 sm:items-center sm:pt-4 justify-center px-4 sm:px-6 lg:px-8 min-h-full">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Policy</CardTitle>
              <p className="text-sm text-muted-foreground">Last updated: March 24, 2026</p>
            </CardHeader>
            <CardContent>
              <PrivacyPolicyContent />
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground mt-4">
            <Link to="/" className="underline hover:text-foreground">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicyPage;
