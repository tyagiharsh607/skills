# TPAP Service Configurations

Service configuration registry for the TPAP feature lifecycle workflow. Each service has specific metadata that determines repository paths, Jenkins jobs, test locations, and code patterns.

## Service Details

### HSS (Handle Selection Service)

**Purpose**: Determines PSP (Payment Service Provider) priority for UPI transactions based on business rules and user preferences.

**Dev Repo**: `/Users/harshtyagi/Desktop/Projects/Repo/tpap-hss`
**Module**: `upihss`
**Jenkins Build**: `job/tpap/job/Build-jobs/job/tpap-hss`
**Deploy Name**: `tpap-hss`
**Pod Service Name**: `tpap-hss`
**Test Package**: `com.paytm.tpap.hssNew`
**CSV File**: `hssusers.csv`
**Suite XML**: `upi-tpap-hss-regression-suite.xml`
**Code Patterns**: `hss-code-patterns.md`
**DB Name**: `switchrouter`
**Properties Tables**: `application_properties`, `business_properties`

### BFF 

**Purpose**: Gateway/aggregation layer for frontend applications, handles mandate operations, timeline, pending transactions.

**Dev Repo**: `/Users/harshtyagi/Desktop/Projects/Repo/tpap-transactional-bff`
**Module**: Multi-module (controller, service, repository, etc.)
**Jenkins Build**: `job/tpap/job/Build-jobs/job/tpap-transactional-bff-new`
**Deploy Name**: `tpap-bff`
**Pod Service Name**: `tpap-transactional-bff`
**Test Package**: `com.paytm.tpap.bffnew`
**CSV File**: `bff.csv`
**Suite XML**: `upi-tpap-transactional-bff-sanity-suite.xml`
**Code Patterns**: `bff-code-patterns.md`
**DB Name**: `switchrouter`
**Properties Tables**: `application_properties`, `business_properties`

## Adding New Services

To add a new service, create a new section under "Service Details" with all the required properties and create a corresponding `{service}-code-patterns.md` file.
