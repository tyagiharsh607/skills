---
name: tpap-feature-lifecycle
description: Orchestrates full TPAP feature development lifecycle from Jira ticket to deployed, tested code. Use when the user asks to run a feature workflow, implement a Jira ticket end-to-end, create a feature for TPAP, or mentions running the TPAP pipeline for a ticket like TPAP-XXXX. Supports multiple services (HSS, BFF, PMS, Switch, Mandate).
---

# TPAP Feature Lifecycle

End-to-end workflow: Jira fetch -> code generation in service repo -> branch & push -> Jenkins build -> test generation in upi_automation_tpap -> local test run.

## Usage

When invoking this skill, **specify the service** (HSS, BFF, PMS, Switch, Mandate):
- "Run TPAP feature lifecycle for HSS: TPAP-XXXX"
- "Implement BFF feature TPAP-YYYY end-to-end"
- "Work on TPAP-ZZZZ for PMS service"

If the service is ambiguous, detect from Jira ticket or ask the user.

## Prerequisites

- **Service parameter**: User must specify which service (hss, bff, pms, switch, mandate)
- **Service configs**: Defined in [service-configs.md](service-configs.md)
- MCP servers configured: `user-TPAP-Jira-MCP-Server`, `user-TPAP-Bitbucket`, `user-TPAP-Jenkins`
- Repos cloned locally:
  - Dev repos: See `service-configs.md` for each service's repository path
  - Test: `/Users/harshtyagi/Desktop/Projects/Repo/upi_automation_tpap`

## Workflow

Track progress with todos. Create 6 todos (one per phase) at the start.

### Phase 1: Fetch Jira Details

1. Get cloud ID via `user-TPAP-Jira-MCP-Server` tool `getAccessibleAtlassianResources`
2. Fetch issue via `getJiraIssue`:
   ```
   cloudId: "5bf3c42b-aa31-4c9c-98ac-aa7eb022d72a"
   issueIdOrKey: "<TICKET-KEY>"
   ```
3. Extract from response: `summary`, `description`, `status`, `priority`, `assignee`, `issuetype`, `components`
4. Present summary to user. **Wait for confirmation before proceeding.**

### Phase 2: Generate Code in Service Repo

**Look up the service in [service-configs.md](service-configs.md)** to get:
- `{service.dev_repo}` - Working directory
- `{service.module}` - Main module path
- `{service.code_patterns}` - Code patterns document

Working directory: `{service.dev_repo}`
Module: `{service.module}` (if applicable)

> **STRICT RULE — Create feature branch BEFORE writing any code:**
> You MUST create the feature branch first before writing a single line of code. Never write code on `main`.
> ```bash
> cd {service.dev_repo}
> git checkout main && git pull origin main
> git checkout -b <TICKET-KEY>
> ```
> Only after you are on the new feature branch, proceed to write code. This is non-negotiable.

**Before writing code, always ask:** can this be solved with config alone (DB config, cache toggle, property key, etc.)? Only write code if config cannot fulfill the requirement.

**What to create/modify** (based on Jira requirements and service type):

Follow patterns in `[{service}-code-patterns.md]({service}-code-patterns.md)` for:
- Project structure and package conventions
- Controller/Service/Filter patterns
- Request/Response DTO conventions
- Validation annotations
- Configuration management
- Unit test requirements and templates
- Logging conventions
- Self-review checklist

**General conventions** (apply across all services):
- Lombok `@Data`, `@Slf4j` on models
- `@NotBlank` / `@NotNull` for validation
- `@JsonInclude(NON_NULL)` on responses
- Unit tests: check if the repo has existing unit tests. If yes, write them. If no existing unit tests exist, skip.
- Add clear log lines in the code for verifying positive and negative scenarios

**REVIEW CHECKPOINT 1 — Dev Code Review:**
After writing the code, present ALL created/modified files to the user for review:
- List every file with a summary of what was added/changed
- Show the full code for each new/modified file
- **Wait for user feedback.** Do NOT proceed to Phase 3 until the user approves.
- If the user requests changes, apply them and present again for re-review.

### Phase 3: Commit, Local Build & Push

**Note:** The feature branch was already created in Phase 2 (before writing any code). You should already be on the `<TICKET-KEY>` branch.

**Look up the service in [service-configs.md](service-configs.md)** to get:
- `{service.dev_repo}` - Repository path
- `{service.module}` - Module path for build commands

**Commit the code written in Phase 2:**

```bash
cd {service.dev_repo}
git add .
git commit -m "<TICKET-KEY>: <brief description from Jira summary>"
```

**Test build locally first** before pushing:
```bash
cd {service.dev_repo}/{service.module}
mvn clean compile
# If unit tests exist:
mvn clean test
```

Only push after local build succeeds:
```bash
git push -u origin <TICKET-KEY>
```

### Phase 4: Build & Deploy via Jenkins

**Look up the service in [service-configs.md](service-configs.md)** to get:
- `{service.jenkins_build}` - Jenkins build job path
- `{service.deploy_name}` - Deploy service name

**Build:**

1. Trigger build using `user-TPAP-Jenkins` MCP:
   ```
   Tool: trigger_build
   jobPath: "{service.jenkins_build}"
   parameters: { "Branch": "<TICKET-KEY>", "JAVA_VERSION": "21" }
   ```
   Note: `Branch` parameter has capital B.

2. Poll build status every 30 seconds until result is not null.

3. On failure: fetch log via `get_build_log`, diagnose, fix code, re-commit, re-push, re-trigger.

4. **Present build result and Jenkins build URL to user.**

**Deploy:**

1. Extract `IMAGE_TAG` from build log (grep for `IMAGE_TAG=`).
2. Trigger deploy:
   ```
   Tool: trigger_build
   jobPath: "job/tpap/job/Deploy-jobs/job/upi-tpap-deploy-job"
   parameters: { "image_tag": "<IMAGE_TAG>", "service": "{service.deploy_name}" }
   ```
3. Poll deploy status every 30 seconds.
4. **Present deploy result and Jenkins deploy URL to user.**

**Pod Health Check:**

After deployment succeeds, verify the new pod is actually running and healthy. **Loop until the pod comes up successfully:**

1. Use `user-logs-mcp-server` MCP tool `check_new_pod`:
   ```
   Tool: check_new_pod
   service_name: "{service.pod_service_name}"
   namespace: "tpapstage"
   ```
   
   **Response structure:**
   ```json
   {
     "service_name": "tpap-hss",
     "namespace": "tpapstage",
     "total_pods": 1,
     "newest_pod": {
       "name": "tpap-hss-7c58554c79-6ztvr",
       "ready": "4/4",
       "status": "Running",
       "restarts": "0",
       "age": "7h42m"
     },
     "image_tag": "256-2b7a4e5-v2",
     "is_running": true
   }
   ```

2. **Wait and retry loop - check the response fields:**
   
   - **If `status` is `Pending` or `ContainerCreating`:**
     - Pod is still starting up
     - Wait 30 seconds and check again with `check_new_pod`
     - Retry up to 10 times (5 minutes total)
     - If still pending after 10 attempts, alert user and ask if they want to continue waiting
   
   - **If `is_running` is `true` AND `status` is `Running` AND `ready` shows all containers ready (e.g., "4/4"):**
     - Pod is healthy! ✓
     - **Present to user:** Pod name, status, image_tag, ready count, age
     - Proceed to Phase 4.5
   
   - **If `status` is `CrashLoopBackOff`, `Error`, `ImagePullBackOff` OR `is_running` is `false` OR `ready` shows failures (e.g., "2/4"):**
     - **Pod has crashed or is unhealthy — diagnose and fix:**
       
       a. Extract logs using `check_pod_logs`:
          ```
          Tool: check_pod_logs (via user-logs-mcp-server MCP)
          pod_name: "{newest_pod.name}" (from check_new_pod response)
          namespace: "tpapstage"
          tail_lines: 200
          include_describe: true
          ```
          
          This returns:
          - `logs`: Last N lines of pod logs (application startup, errors, stack traces)
          - `describe`: Full kubectl describe output with Events, Conditions, Container States
       
       b. **Analyze the logs and describe output** to identify the error:
          - **Startup failure**: Missing bean, configuration issue, failed health check
          - **Dependency issue**: Can't connect to DB, Redis, Kafka, other service
          - **Code error**: NullPointerException, IllegalArgumentException, stack trace
          - **Resource issue**: OOM, CPU limit, port conflict
          - **Image issue**: Wrong image tag, pull failure
          - **Events section**: Check for container restart reasons, pull errors, scheduling issues
       
       c. **Fix the code** in the dev repo based on the error diagnosis
       
       d. **Re-commit and re-push** the fix to the same branch
       
       e. **Re-trigger Jenkins build and deploy** (repeat Build → Deploy from Phase 4)
       
       f. **Check the pod again** after redeployment (go back to step 1)
       
       g. **Repeat this fix-rebuild-redeploy cycle** until the pod comes up successfully

3. **Only proceed to Phase 4.5** once `is_running` is `true`, `status` is `Running`, and all containers are ready.

### Phase 4.5: Insert DB Config Properties

After the pod is deployed and running, insert any required config properties into the database so the new feature is active for testing.

**Look up the service in [service-configs.md](service-configs.md)** to get:
- `{service.db_name}` - Database name (e.g., `switchrouter`)

The database has **two properties tables**:
- **`application_properties`** — system/infrastructure config: feature toggles, enable/disable flags, filter sequences, timeouts, URLs, thresholds, cache keys that control application behavior
- **`business_properties`** — business-specific data: merchant configs, account numbers, IFSCs, PSP-specific mappings, business rule values, encryption keys

**Step 1: Identify required properties** from the code written in Phase 2:
- Look for cache keys used via `cacheUtil.findByNameFromCache(...)` — these are the DB property names
- Look for `@Value("${...}")` annotations — these are `application.properties` fallbacks, but the DB properties override them at runtime
- Enable/disable toggles (e.g., `HSS_MAX_PSP_LIMIT_ENABLE`)
- Config values (e.g., `HSS_MAX_PSP_COUNT`)
- Filter sequence entries if a new filter was added to the pipeline

**Step 2: Decide which table each property belongs in** by reading the code context:
- If the property is a **feature toggle, enable/disable flag, filter sequence, threshold, or system config** → `application_properties`
- If the property is a **business rule value, merchant mapping, PSP-specific data, or domain-specific config** → `business_properties`
- When unsure, check where similar existing properties live by querying both tables for properties with a similar prefix/naming pattern

**Step 3: Check if properties already exist** before inserting:
```
Tool: execute_tpap_database_query (via user-logs-mcp-server MCP)
database: "{service.db_name}"
query: "select * from application_properties where name = '<PROPERTY_NAME>';"
query: "select * from business_properties where name = '<PROPERTY_NAME>';"
```

**Step 4: Insert missing properties** into the correct table:
```
Tool: execute_tpap_database_query (via user-logs-mcp-server MCP)
database: "{service.db_name}"
query: "insert into <application_properties|business_properties> (name, value, created_by) values ('<PROPERTY_NAME>', '<VALUE>', 'automation');"
```

**Step 5: Verify insertion** by querying back each inserted property.

**Step 6: Present all inserted properties to user** with a table showing name, value, and which table it was inserted into.

> **Note:** The DB cache refreshes every ~60 seconds. Wait at least 60 seconds after inserting before running tests.

### Phase 5: Add Test Cases to Existing Test Classes

**Look up the service in [service-configs.md](service-configs.md)** to get:
- `{service.test_package}` - Test package path
- `{service.csv_file}` - CSV data file
- `{service.suite_xml}` - Suite XML file name

Working directory: `/Users/harshtyagi/Desktop/Projects/Repo/upi_automation_tpap`

**NEVER write on `main`.** Always use the branch `harsh_20_feb`.

**Step 0: Merge latest main first:**
```bash
cd /Users/harshtyagi/Desktop/Projects/Repo/upi_automation_tpap
git checkout harsh_20_feb
git fetch origin main && git merge origin/main --no-edit
# Resolve any merge conflicts if they arise
```

The test infrastructure (request classes, DTOs, CSV, properties) already exists. You only need to **add new `@Test` methods** to existing test classes.

**Step 1: Identify the correct existing test class:**

Service-specific test package: `upi_automation/src/main/java/{service.test_package}/`

For reference, common test locations by component:

| Component | Test Package | Example Test Class |
|-----------|-------------|--------------------|
| HSS | `com.paytm.tpap.hssNew` | `SelectHandleV1Test.java`, `SelectHandleV3Test.java` |
| BFF | `com.paytm.tpap.bffnew` | `GetPendingTest.java`, `ScheduledMandateTest.java` |
| PMS | `com.paytm.tpap.pmsNew` | `UserProfileTest.java` |
| Switch | `com.paytm.tpap.switchTransactionNew` | `CommonPayTest.java` |
| Mandate | `com.paytm.tpap.MandateNew` | `RMCreateTest.java` |

**Step 2: Read the existing test class** to understand:
- The class fields, `@BeforeClass` setup, `@BeforeMethod` / `@AfterMethod` lifecycle
- The `@DataProviderParams` (CSV file + table name)
- The existing test method naming pattern and numbering
- How headers, queryParams, and requestDTO are built
- Which response DTOs are used (Positive vs Negative)

**REVIEW CHECKPOINT 2 — Test Cases in English:**
Before writing any automated test code, present the planned test cases in **detailed plain English**. Each test case must be a single sentence (or two at most) that captures:
- The **exact API/feature** being tested
- The **config flags / feature toggles** and their values (e.g., `IS_FEATURE_ENABLED = true`)
- The **initial state** of relevant entities (e.g., `mandate_info.status = PENDING`)
- The **specific input variation** (e.g., `purpose = 01`, `countryCode = null`, `5 PSPs sent`)
- The **expected outcome**: what fields/responses change, what passes, what fails, what gets returned or not returned

**Level of detail expected — examples:**

> Verify that txn_info (status, extendedInfo-PREVIOUS_STATE, npciRespCode), mandate_info (status), and otm_info (status, errorCode) are updated correctly and PG callback is sent only when updateTxnStatus API is called for OTM execution with IS_UPDATE_TXN_STATUS_FOR_OTM_ENABLED = true, PURPOSE_CODE_LIST_FOR_OTM_VALIDATION = '01,25', initial state is mandate_info.status = PENDING, otm_info.status = ACTIVE, txn_info.status = PENDING with purpose = 01, and request status = SUCCESS

> Verify that payer account details are validated for non-Paytm handle during PAYEE-initiated REVOKE when CHECK_IF_PAYTM_ISSUER_FOR_ACCOUNT_DETAIL_POPULATION = false and account details are absent in SIP and revoke fails

> Verify that PSP preference list is trimmed to top 3 when MaxPspLimitBusinessFilter is enabled via HSS_MAX_PSP_LIMIT_ENABLE = true, HSS_MAX_PSP_COUNT = 3, and 5 valid onboarded PSPs with mpin set are sent in the request

**Do NOT write vague test descriptions** like "test with valid data" or "test negative scenario". Every test must read like a mini-spec.

- Present as a numbered list
- **Wait for user feedback.** Do NOT write automated test code until the user approves the test plan.
- If the user wants to add, remove, or modify test cases, update the plan and present again.

**Step 3: Think carefully, then add new `@Test` methods.** Follow patterns in [test-patterns.md](test-patterns.md).

Key rules:
- **Do NOT create new files** -- the request class (`SelectHandleV1.java`), DTOs (`*RequestDTO.java`, `*ResponseDTOPositive.java`, `*ResponseDTONegative.java`) already exist
- **Continue the numbering** from the last test (e.g., if last is `_45_`, new one is `_46_`)
- **Use Positive/Negative in the method name** -- this controls `@BeforeMethod`/`@AfterMethod` behavior (serialization vs deletion of commonValues)
- **Reuse the same `@DataProviderParams`** annotation as existing tests
- **Use the same groups** as the test class (e.g., `{"SelectHandleV1Test", "Regression-Group"}`)
- **Write clear, descriptive `description` in `@Test` annotation** — explain exactly what the test case validates
- Negative tests: modify one input (null/empty/invalid header/param/body field), assert error response
- Positive tests: valid variation, assert success response

**Step 4 (if needed):** Add new CSV test data rows or properties only if the new tests require data not already present.

**REVIEW CHECKPOINT 3 — Automated Test Code Review:**
After writing the automated test methods, present the code to the user for review:
- Show the full code of each new test method added
- Highlight the response DTO types used and assertions made
- **Wait for user feedback.** Do NOT proceed to run tests until the user approves.
- If the user requests changes, apply them and present again for re-review.

### Phase 6: Run New Tests Only

**Look up the service in [service-configs.md](service-configs.md)** to get:
- `{service.suite_xml}` - Suite XML file name

**Step 1: Read the current suite XML** and save its original content (you will restore it in Phase 7).

**Step 2: Comment out ALL existing class entries** in the suite XML, and add ONLY the new test methods:
```xml
<test name="..." parallel="none">
    <classes>
        <!-- COMMENTED OUT FOR ISOLATED TEST RUN — will restore before push
        <class name="com.paytm.tpap.hssNew.SelectHandleV1.SelectHandleV1Test"/>
        <class name="com.paytm.tpap.hssNew.SelectHandleV3.SelectHandleV3Test"/>
        -->
        <class name="{service.test_package}.<FeatureName>.<TestClassName>">
            <methods>
                <include name="testMethod_47_PositiveWithSomeScenario"/>
                <include name="testMethod_48_NegativeWithSomeScenario"/>
            </methods>
        </class>
    </classes>
</test>
```

This ensures only the new tests run, avoiding interference from other test classes.

**Step 3: Build and run:**
```bash
cd /Users/harshtyagi/Desktop/Projects/Repo/upi_automation_tpap

# Build common module first
cd upi-common-automation && mvn clean install -q

# Run tests
cd ../upi_automation && mvn clean test -DsuiteXmlFile={service.suite_xml}
```

Parse test output for pass/fail counts. If failures occur:
1. Read the failure messages
2. Diagnose and fix test code
3. Re-run until all new tests pass

### Phase 7: Push & Create PR

Only after all new tests pass:

1. **Restore the suite XML to its original state**: uncomment all previously commented-out class entries and remove the `<methods><include>` filter so the suite XML looks exactly as it did before Phase 6 (but now the test class file contains the new methods too).

2. **Merge latest main again** (in case it changed during testing):
   ```bash
   git fetch origin main && git merge origin/main --no-edit
   # Resolve any merge conflicts
   ```
3. Commit, push, and create PR:
   ```bash
   git add .
   git commit -m "<TICKET-KEY>: Add automation test cases for <feature>"
   git push -u origin harsh_20_feb
   ```
4. Create PR via `user-TPAP-Bitbucket` MCP `createPullRequest`:
   - `sourceBranch`: `harsh_20_feb`
   - `targetBranch`: `main`
   - Include test results in PR description
5. **Present PR URL to user.**

## Service Detection

When the user provides a Jira ticket, determine the service from:

1. **Explicit mention**: "HSS feature", "BFF task", "PMS service"
2. **Jira components**: Check the `components` field in the Jira response
3. **Keywords** in summary/description:
   - **HSS**: handle selection, PSP priority, filter pipeline, selectHandle
   - **BFF**: timeline, pending, scheduled, gateway, frontend, app-facing, mandate operations
   - **PMS**: user profile, VPA, account linking, device binding, onboarding
   - **Switch**: pay, collect, transaction, refund, status check, callback
   - **Mandate**: mandate, recurring, OTM, autopay, revoke, pause, unpause

If ambiguous, **ask the user** which service this ticket targets before proceeding.

## Error Recovery

| Error | Resolution |
|-------|-----------|
| Jira 401 | Check TPAP-Jira MCP credentials in `~/.cursor/mcp.json` |
| Jenkins 404 | Verify job path in `service-configs.md` for the service |
| Jenkins build fails (Java) | Ensure `JAVA_VERSION: 21` parameter |
| Git push rejected | Pull latest main, rebase branch, resolve conflicts |
| Test compilation fails | Build `upi-common-automation` first: `mvn clean install` |
| Test 401/403 | Check base URL and auth method in `service-configs.md` |
