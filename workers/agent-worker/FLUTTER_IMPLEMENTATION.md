# Plan Agent — Flutter Implementation Prompt

Use this prompt in Cursor/Claude Code when working in the LUMARA repo.

---

## Context

SwarmSpace now has a Plan Agent Worker deployed at:
- Plan: `POST https://swarmspace-agent-worker.orbitalai.workers.dev/agent/plan`
- Execute: `POST https://swarmspace-agent-worker.orbitalai.workers.dev/agent/execute`

Auth: Firebase ID token in `Authorization: Bearer <token>` header.

## Task

Add the Flutter client-side Plan Review flow to LUMARA.

### 1. Create `lib/features/agent/agent_plan.dart`

```dart
class AgentPlan {
  final String goal;
  final List<String> clarifications;
  final List<PlanStep> steps;
  final List<String> toolsRequired;
  final int estimatedToolCalls;
  final bool requiresPremium;
  final bool tierGate;

  AgentPlan({
    required this.goal,
    required this.clarifications,
    required this.steps,
    required this.toolsRequired,
    required this.estimatedToolCalls,
    required this.requiresPremium,
    required this.tierGate,
  });

  factory AgentPlan.fromJson(Map<String, dynamic> json) {
    return AgentPlan(
      goal: json['goal'] ?? '',
      clarifications: List<String>.from(json['clarifications'] ?? []),
      steps: (json['steps'] as List? ?? [])
          .map((s) => PlanStep.fromJson(s))
          .toList(),
      toolsRequired: List<String>.from(json['tools_required'] ?? []),
      estimatedToolCalls: json['estimated_tool_calls'] ?? 0,
      requiresPremium: json['requires_premium'] ?? false,
      tierGate: json['tier_gate'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'goal': goal,
    'clarifications': clarifications,
    'steps': steps.map((s) => s.toJson()).toList(),
    'tools_required': toolsRequired,
    'estimated_tool_calls': estimatedToolCalls,
    'requires_premium': requiresPremium,
    'tier_gate': tierGate,
  };
}

class PlanStep {
  final int step;
  String description;  // Mutable — user can edit before approving
  final String? tool;
  final String rationale;

  PlanStep({
    required this.step,
    required this.description,
    this.tool,
    required this.rationale,
  });

  factory PlanStep.fromJson(Map<String, dynamic> json) {
    return PlanStep(
      step: json['step'] ?? 0,
      description: json['description'] ?? '',
      tool: json['tool'],
      rationale: json['rationale'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'step': step,
    'description': description,
    'tool': tool,
    'rationale': rationale,
  };
}
```

### 2. Create `lib/features/agent/agent_service.dart`

```dart
class AgentService {
  static const _baseUrl = 'https://swarmspace-agent-worker.orbitalai.workers.dev';

  final FirebaseAuth _auth;

  AgentService({FirebaseAuth? auth}) : _auth = auth ?? FirebaseAuth.instance;

  Future<String> _getToken() async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('Not authenticated');
    return await user.getIdToken() ?? '';
  }

  /// Phase 1: Generate a plan
  Future<AgentPlan> generatePlan(String task, String tier) async {
    final token = await _getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/agent/plan'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'task': task, 'tier': tier}),
    );

    if (response.statusCode != 200) {
      throw Exception('Plan generation failed: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return AgentPlan.fromJson(data['plan']);
  }

  /// Phase 2: Execute an approved plan
  Future<Map<String, dynamic>> executePlan(
    String task,
    AgentPlan approvedPlan,
    String tier,
  ) async {
    final token = await _getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/agent/execute'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'task': task,
        'approved_plan': approvedPlan.toJson(),
        'tier': tier,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Execution failed: ${response.body}');
    }

    return jsonDecode(response.body)['result'];
  }
}
```

### 3. Create `lib/features/agent/widgets/plan_step_tile.dart`

A list tile widget for each step in the plan:
- Step number (circle badge)
- Description text (tappable to edit)
- Tool chip (colored by tier: green=free, purple=standard, orange=premium)
- Rationale text (smaller, muted color)
- Edit mode: tapping description opens a TextField for inline editing

### 4. Create `lib/features/agent/plan_review_screen.dart`

Screen shown after task submission, before execution:

**Layout:**
- AppBar: "Here's what I'm going to do"
- Goal card at top (plan.goal in a highlighted card)
- If `plan.clarifications` is non-empty: show questions section with text fields for answers
- Steps list: use PlanStepTile for each step (staggered animation on reveal)
- Tools summary: "Using X tools" with chip list
- If free tier: "Estimated calls: X/20" badge
- If `plan.tierGate`: premium upsell banner blocking approval
- Bottom: "Approve & Run" primary button + "Cancel" secondary

**Behavior:**
- "Approve & Run" calls `AgentService.executePlan()` and navigates to results
- "Cancel" pops back
- Steps are editable: user can tap a step description to modify it before approving

### 5. Modify existing agent flow

In whatever screen/cubit currently handles task submission:

```
// Before (direct execution):
// submitTask(task) → POST /agent/execute → show results

// After (plan-first):
submitTask(task)
  → AgentService.generatePlan(task, tier)
  → navigate to PlanReviewScreen(plan, task, tier)
  → user taps "Approve & Run"
  → AgentService.executePlan(task, editedPlan, tier)
  → navigate to results screen
```

### 6. Animations

- Steps list: staggered reveal animation (each step fades in 100ms after the previous)
- Tool chips: fade in after steps complete
- Approve button: pulse animation when plan is ready

## Design Notes

- Match LUMARA's existing dark theme and component library
- Tool chip colors: green for free-tier tools, purple for standard, orange for premium
- Step numbers in circular badges (same style as LUMARA's existing numbered lists)
- Error states: if plan generation fails, show a retry button with the error message

## Success Criteria

1. User submits a task and sees a structured plan within 3 seconds
2. Plan lists only tools available for their tier
3. User can edit step descriptions before approving
4. Execution follows the approved plan
5. Tier-gated plans show upsell and block execution
