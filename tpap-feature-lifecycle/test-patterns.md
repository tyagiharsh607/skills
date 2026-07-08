# upi_automation_tpap Test Patterns

Reference for **adding new test methods to existing test classes**.

Repo: `/Users/harshtyagi/Desktop/Projects/Repo/upi_automation_tpap/`
Test source: `upi_automation/src/main/java/com/paytm/`

## Existing Test Class Map

| Component | Package | Test Classes | CSV | Properties |
|-----------|---------|-------------|-----|------------|
| HSS | `tpap/hssNew/SelectHandleV1/` | `SelectHandleV1Test` | `hssusers.csv` (`selectHandleV1New`) | `hssNew.properties` |
| HSS v3 | `tpap/hssNew/SelectHandleV3/` | `SelectHandleV3Test` | `hssusers.csv` (`SelectHandleV3New`) | `hssNew.properties` |
| PMS | `tpap/pmsNew/<Api>/` | `UserProfileTest`, `ListAccountTest`, etc. | `pmsusers.csv` | `pmsNew.properties` |
| Switch | `tpap/switchTransactionNew/<Api>/` | `CommonPayTest`, `AppPayTest`, etc. | `switch.csv` | `switchTxn.properties` |
| Mandate | `tpap/MandateNew/<Api>/` | `RMCreateTest`, `OTMPayerCreateTest`, etc. | `mandate.csv` | `switchMandate.properties` |
| BFF | `tpap/bffnew/<Api>/` | `GetPendingTest`, `TimeLineTest`, etc. | `bff.csv` | `staging.properties` |

Supporting files per test class (already exist, do NOT recreate):
- `<ApiName>.java` -- BaseApi request builder
- `<ApiName>RequestDTO.java` -- request body POJO
- `<ApiName>ResponseDTOPositive.java` -- success response POJO
- `<ApiName>ResponseDTONegative.java` -- error response POJO

## Test Method Naming Convention

```
<apiName>_<sequenceNumber>_<Positive|Negative><ShortDescription>
```

Examples from SelectHandleV1Test:
- `selectHandleV1_01_PositiveWithAllValidParameters`
- `selectHandleV1_02_PositiveWithoutCustId`
- `selectHandleV1_03_PositiveWithEmptyCustId`

Examples from CommonPayTest:
- `commonPay_01_PositiveWithAllValidParameters`
- `commonPay_02_BlankXDevIntegrityInt`

Examples from RMCreateTest:
- `RMCreate_01_PositiveWithAllValidParameters`
- `RMCreate_02_PositiveWithBlankXId`
- `RMCreate_03_PositiveWithoutXId`

**Critical**: Method name must contain `Positive` or `Negative` -- this triggers `@BeforeMethod`/`@AfterMethod` logic that serializes or deletes `commonValues`.

## Adding a New Test Method

### Step 1: Read the existing test class

Before writing, read the entire test class to find:
- The last test method number (to continue numbering)
- The exact `@DataProviderParams` and groups used
- How headers/queryParams/requestDTO are built
- Which response DTO is used for assertions

### Step 2: Write the new method

**Template for a Positive test (valid variation):**

```java
@DataProviderParams({"fileName=hssusers.csv", "tableName=selectHandleV1New"})
@Test(dataProviderClass = DataReaderUtil.class, alwaysRun = true,
      groups = {"SelectHandleV1Test", "Regression-Group"},
      dataProvider = "CsvDataProvider",
      description = "Verify Select Handle V1 API with <description>")
public void selectHandleV1_46_PositiveWith<Description>(String custID, String primaryPSP) {
    String requestTimestamp = CommonUtils.getCurrentEpochTimeSeconds();
    logger.getModel().setName(logger.getModel().getName().split("::")[0]
            + " :: " + "<readable description>");

    // Build headers, queryParams, requestDTO same as _01_ but with the variation
    headers = SelectHandleV1.getHeaders(...);
    queryParams = SelectHandleV1.getQueryParams(requestTimestamp, this.requestId);

    // Apply the variation (e.g., different param value)
    // ...

    requestDTO = SelectHandleV1.getRequestBody(...);
    SelectHandleV1 request = new SelectHandleV1(requestDTO, queryParams, headers, path);
    Response response = request.execute();

    SelectHandleV1ResponseDTOPositive responseDTO =
            response.as(SelectHandleV1ResponseDTOPositive.class);
    CustomAssert customAssert = new CustomAssert();
    customAssert.assertEquals(response.statusCode(), 200, "Validate Response Code");
    customAssert.assertEquals(responseDTO.getResponseCode(), "200", "Validate Response Code");
    customAssert.assertEquals(responseDTO.getResponseMessage(), "PROCESSED",
            "Validate Response Message");
    customAssert.assertNotNull(responseDTO.getPspPriorityDetails(),
            "Validate PSP Priority Details is not null");
}
```

**Template for a Negative test (invalid input):**

```java
@DataProviderParams({"fileName=hssusers.csv", "tableName=selectHandleV1New"})
@Test(dataProviderClass = DataReaderUtil.class, alwaysRun = true,
      groups = {"SelectHandleV1Test", "Regression-Group"},
      dataProvider = "CsvDataProvider",
      description = "Verify Select Handle V1 API with <invalid scenario>")
public void selectHandleV1_47_NegativeWith<Description>(String custID, String primaryPSP) {
    String requestTimestamp = CommonUtils.getCurrentEpochTimeSeconds();
    logger.getModel().setName(logger.getModel().getName().split("::")[0]
            + " :: " + "<readable description>");

    headers = SelectHandleV1.getHeaders(...);
    queryParams = SelectHandleV1.getQueryParams(requestTimestamp, this.requestId);

    // Apply the negative variation (null, empty, invalid value, missing field)
    // e.g., headers.put("Authorization", "invalid_token");
    // e.g., pass null for a required param

    requestDTO = SelectHandleV1.getRequestBody(this.requestId, null, ...);
    SelectHandleV1 request = new SelectHandleV1(requestDTO, queryParams, headers, path);
    Response response = request.execute();

    SelectHandleV1ResponseDTONegative responseDTO =
            response.as(SelectHandleV1ResponseDTONegative.class);
    CustomAssert customAssert = new CustomAssert();
    customAssert.assertEquals(response.statusCode(), 400, "Validate Error Response Code");
    customAssert.assertEquals(responseDTO.getResponseCode(), "400", "Validate Response Code");
    customAssert.assertEquals(responseDTO.getResponseMessage(), "BAD_REQUEST",
            "Validate Error Message");
}
```



## Component-Specific Patterns

### HSS (internal S2S API)
- Auth: JWT token via `generateJWTTokenWithclientId()`
- Base URL: `ConstantUtil.HSSBaseUrl`
- No SSO token needed (S2S)
- Assertions: `responseCode`, `responseMessage`, `pspPriorityDetails` (not null)

### PMS (external app API)
- Auth: SSO token via `AuthHelper.getSSOToken(mobile, password)`
- Base URL: `ConstantUtil.PMSBaseUrl`
- HTTP method: often GET (not POST)
- Headers: extensive device/app headers (Host, device-id, channel-token, x-id, channel, x-app-rid, x-mfg, x-nw, etc.)
- Query params: extensive device params (deviceName, version, osVersion, etc.)
- Assertions: `status` (SUCCESS/FAILURE), `respCode`, `respMessage`, nested `respDetails`

### Switch (external transactional API)
- Auth: SSO token
- Base URL: `ConstantUtil.SwitchBaseUrl`
- Assertions: `success` (boolean), `response` (code string like "92"), `message`, `upiTranlogId`, `seqNo`
- Pending responses common (async transactions)

### Mandate (recurring payments)
- Auth: SSO token
- Base URL: `ConstantUtil.MandateBaseUrl`
- Often uses DB queries in `@BeforeClass` (`MandateQueries.getDataFromStandingInstructions()`)
- Assertions: `status` (PENDING), `respCode` ("92"), `respMessage`, `seqNo`
- May call `CheckStatus` after create operations

### BFF (frontend-facing)
- Auth: SSO token via `session-token` header
- Base URL: `ConstantUtil.GatewayBaseUrl`
- Content-Type may be `application/x-www-form-urlencoded` (not JSON)
- Assertions may have conditional logic (success vs no-data)

## Base URL Reference

From `ConstantUtil.java`:

```
PMSBaseUrl      = https://tpappms-staging1.paytm.com
HSSBaseUrl      = https://upi-tpap-hss-internal-staging.paytm.com
SwitchBaseUrl   = https://upisecure-staging.paytm.com
MandateBaseUrl  = https://upisecure-staging.paytm.com
GatewayBaseUrl  = https://tpaptransactionalbffv2-staging.paytm.com
PanelBaseUrl    = https://upipanel-staging-internal.paytm.com
```

## CSV Data Format

Location: `upi_automation/src/main/resources/profiles/SwitchRouter/<file>.csv`

```
<TableName>
,<col1>,<col2>,...
,,,<TableName>
```

- Line 1: table name (matches `@DataProviderParams tableName`)
- Middle lines: data rows (leading comma, values match test method params)
- Last line: end marker (commas + table name in last column)

Example (`hssusers.csv`):
```
SelectHandleV1New
,1234,ptaxis
,,,SelectHandleV1New
```

Columns map positionally to the test method's String parameters.

## Running Tests

```bash
cd /Users/harshtyagi/Desktop/Projects/Repo/upi_automation_tpap
cd upi-common-automation && mvn clean install -q
cd ../upi_automation && mvn clean test -DsuiteXmlFile=<suite>.xml
```

| Component | Suite File |
|-----------|-----------|
| HSS | `upi-tpap-hss-regression-suite.xml` |
| PMS (smoke) | `upi-tpap-pms-smoke-suite.xml` |
| PMS (regression) | `upi-tpap-pms-regression-suite.xml` |
| Switch (sanity) | `upi-tpap-switch-sanity-suite.xml` |
| Switch (regression) | `upi-tpap-switch-regression-suite.xml` |
| Mandate | `upi-tpap-mandate-regression-suite.xml` |
| BFF | `upi-tpap-transactional-bff-sanity-suite.xml` |
