// Example: How to integrate Convex real-time data
// This file shows the pattern for replacing mock data with real Convex queries

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

// ============================================
// GUIDANCE INTERFACE INTEGRATION
// ============================================

export function useGuidanceData(sessionId: string) {
    // Get active execution for this session
    const activeExecution = useQuery(api.executions.getActiveBySession, {
        sessionId
    });

    // Get the procedure being executed
    const procedure = useQuery(
        api.procedures.getById,
        activeExecution ? { id: activeExecution.procedureId } : "skip"
    );

    // Get current UI state
    const currentUIState = useQuery(api.ui_states.getLatest, { sessionId });

    // Mutation to mark step as complete
    const completeStep = useMutation(api.executions.completeStep);

    return {
        execution: activeExecution,
        procedure,
        currentUIState,
        completeStep,
        isLoading: activeExecution === undefined
    };
}

// Usage in GuidanceInterface.tsx:
/*
function GuidanceInterface() {
  const sessionId = "session_123"; // Get from auth/context
  const { execution, procedure, completeStep } = useGuidanceData(sessionId);

  if (!execution || !procedure) {
    return <div>No active guidance...</div>;
  }

  const currentStep = procedure.steps[execution.currentStep - 1];

  const handleComplete = async () => {
    await completeStep({
      executionId: execution._id,
      stepId: currentStep.id
    });
  };

  return (
    <div className="current-step-card">
      <h2>{currentStep.instruction}</h2>
      <button onClick={handleComplete}>Mark as Complete</button>
    </div>
  );
}
*/

// ============================================
// ADMIN DASHBOARD INTEGRATION
// ============================================

export function useAdminData() {
    // Get system metrics
    const metrics = useQuery(api.executions.getMetrics);

    // Get recent executions
    const executions = useQuery(api.executions.getRecent, {
        limit: 20
    });

    // Get agent logs
    const agentLogs = useQuery(api.agent_logs.getRecent, {
        limit: 50
    });

    // Get tool logs
    const toolLogs = useQuery(api.tool_logs.getRecent, {
        limit: 50
    });

    return {
        metrics: metrics || {
            activeExecutions: 0,
            completedToday: 0,
            successRate: 0,
            avgLatency: 0,
            totalSessions: 0
        },
        executions: executions || [],
        agentLogs: agentLogs || [],
        toolLogs: toolLogs || [],
        isLoading: metrics === undefined
    };
}

// Usage in AdminDashboard.tsx:
/*
function AdminDashboard() {
  const { metrics, executions, agentLogs, isLoading } = useAdminData();

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="metrics-grid">
        <MetricCard 
          label="Active Executions"
          value={metrics.activeExecutions}
        />
        <MetricCard 
          label="Success Rate"
          value={`${metrics.successRate}%`}
        />
      </div>
      
      <ExecutionsList executions={executions} />
      <AgentLogs logs={agentLogs} />
    </div>
  );
}
*/

// ============================================
// CONVEX QUERY EXAMPLES (Backend)
// ============================================

// These would go in your backend/convex/ directory

/*
// convex/executions.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getActiveBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("executions")
      .filter((q) => 
        q.and(
          q.eq(q.field("sessionId"), args.sessionId),
          q.eq(q.field("status"), "active")
        )
      )
      .first();
  },
});

export const getMetrics = query({
  handler: async (ctx) => {
    const executions = await ctx.db.query("executions").collect();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeExecutions = executions.filter(e => e.status === "active").length;
    const completedToday = executions.filter(e => 
      e.status === "completed" && 
      new Date(e.completedAt) >= today
    ).length;

    const completed = executions.filter(e => e.status === "completed");
    const successRate = completed.length > 0
      ? (completed.filter(e => !e.failed).length / completed.length) * 100
      : 0;

    return {
      activeExecutions,
      completedToday,
      successRate: Math.round(successRate * 10) / 10,
      avgLatency: 2.3, // Calculate from agent_logs
      totalSessions: new Set(executions.map(e => e.sessionId)).size
    };
  },
});

export const completeStep = mutation({
  args: { 
    executionId: v.id("executions"),
    stepId: v.string()
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) throw new Error("Execution not found");

    await ctx.db.patch(args.executionId, {
      currentStep: execution.currentStep + 1,
      updatedAt: Date.now()
    });

    return { success: true };
  },
});
*/

// ============================================
// N8N WEBHOOK INTEGRATION
// ============================================

export async function sendToN8n(endpoint: string, data: any) {
    const n8nUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

    const response = await fetch(`${n8nUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`N8N webhook failed: ${response.statusText}`);
    }

    return response.json();
}

// Usage examples:
/*
// Send screenshot event
await sendToN8n('navigator-screenshot-event', {
  session_id: sessionId,
  screenshot_url: screenshotDataUrl,
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight,
    url: window.location.href
  }
});

// Request help
await sendToN8n('request-help', {
  execution_id: executionId,
  step_id: stepId,
  reason: 'User clicked Need Help'
});

// Report step failure
await sendToN8n('step-failed', {
  execution_id: executionId,
  step_id: stepId,
  error: errorMessage
});
*/

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

// Convex automatically handles real-time updates!
// When data changes in the database, your components re-render automatically.

// Example: Live execution monitoring
/*
function LiveExecutionMonitor({ executionId }) {
  // This will automatically update when the execution changes
  const execution = useQuery(api.executions.getById, { id: executionId });

  useEffect(() => {
    if (execution?.status === 'completed') {
      showNotification('Execution completed!');
    }
  }, [execution?.status]);

  return (
    <div>
      Current Step: {execution?.currentStep} / {execution?.totalSteps}
    </div>
  );
}
*/

export default {
    useGuidanceData,
    useAdminData,
    sendToN8n
};
