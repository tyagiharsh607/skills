# TPAP Jenkins Job Path Patterns

**Discovery Date:** March 9, 2025  
**Jenkins Base URL:** https://tpap-jenkins.paytm.com  
**MCP Server:** user-TPAP-Jenkins

---

## Path Pattern

Jenkins job paths follow this structure:

```
job/tpap/job/<folder>/job/<job-name>
```

Where:
- **folder** = `Build-jobs` | `Deploy-jobs` | `Stage-Deploy-Jobs` (and possibly others)
- **job-name** = Exact job name as configured in Jenkins

---

## Working Job Paths

### Deploy Jobs

| Job Path | Status | Notes |
|----------|--------|-------|
| `job/tpap/job/Deploy-jobs/job/upi-tpap-deploy-job` | ✅ Works | Parameterized; requires `service` and version/tag |

### Build Jobs

| Job Path | Status | Last Build |
|----------|--------|------------|
| `job/tpap/job/Build-jobs/job/tpap-transactional-bff-new` | ✅ Works | SUCCESS |
| `job/tpap/job/Build-jobs/job/tpap-hss` | ✅ Works | SUCCESS |


---

## Deploy Job Parameters

The `upi-tpap-deploy-job` is **parameterized**. From build log analysis:

### Required Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `service` | `tpap-hss`, `tpap-bff` | Service name to deploy |
| `version` / `tag` | `251-b83091f-v2` | Build tag (format: `buildNumber-commitHash-v2`) |

**Note:** Build job names may differ from deploy service names. For example, the BFF build job is `tpap-transactional-bff-new`, but the deploy service name is `tpap-bff`.

---

## MCP Tool Usage

### Get Build Status

```json
{
  "jobPath": "job/tpap/job/Deploy-jobs/job/upi-tpap-deploy-job",
  "buildNumber": "lastBuild"
}
```

### Trigger Build (Deploy Job)

```json
{
  "jobPath": "job/tpap/job/Deploy-jobs/job/upi-tpap-deploy-job",
  "parameters": {
    "service": "tpap-bff",
    "version": "<build-tag-from-ecr>"
  }
}
```

**Warning:** Triggering with empty `parameters` returns "Nothing is submitted". Invalid parameters may return 500.

---

## Build Job Naming Convention

| Service / Component | Build Job Name |
|---------------------|----------------|
| Transactional BFF | `tpap-transactional-bff-new` |
| HSS | `tpap-hss` |
| BFF (generic) | ❌ Use `tpap-transactional-bff-new` |

---

## Summary

1. **Path format:** `job/tpap/job/<folder>/job/<job-name>`
2. **Build jobs:** Under `Build-jobs`; names like `tpap-<service>` (e.g., `tpap-transactional-bff-new`, `tpap-hss`)
3. **Deploy job:** `job/tpap/job/Deploy-jobs/job/upi-tpap-deploy-job` with `service` and `version` parameters
4. **`tpap-bff` and `bff`** do not exist as build jobs; use `tpap-transactional-bff-new` for BFF builds
