export default function AdminCommissionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Commission Distribution</h1>
          <p className="text-muted-foreground">
            Track and analyze downline commission distributions across all levels
          </p>
        </div>
      </div>
      
      <div className="bg-card p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Commission System Overview</h2>
        <div className="space-y-4 text-muted-foreground">
          <p>The commission distribution system automatically calculates and distributes commissions when plots are sold:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Level 1:</strong> 6% commission to direct upline</li>
            <li><strong>Level 2:</strong> 2% commission to second level upline</li>
            <li><strong>Level 3:</strong> 0.5% commission to third level upline</li>
          </ul>
          <p>Commission tracking and detailed analytics will be available soon.</p>
        </div>
      </div>
    </div>
  );
}
