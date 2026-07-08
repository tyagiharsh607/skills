# tpap-hss Code Patterns

Reference patterns from `/Users/harshtyagi/Desktop/Projects/Repo/tpap-hss/upihss/src/main/java/com/tpap/hss/`.

## Project Structure

```
com.tpap.hss/
├── controller/        # REST endpoints
├── service/           # Interface + impl/
├── request/           # Request models
├── response/          # Response models
├── filter/            # Two pipelines: BasicFilter (transactional) + Filter (meta)
│   ├── BasicFilter.java          # Root for transactional pipeline
│   ├── Filter.java               # Root for meta pipeline
│   ├── mandatory/impl/
│   ├── health/impl/
│   ├── business/impl/
│   ├── final_filter/impl/
│   └── meta/impl/
├── config/            # Constants, enums, FilterConfig
├── dto/               # Internal DTOs
├── client/            # HTTP clients
├── exception/         # Custom exceptions (ApplicationPropertiesException, JwtException, BaseHttpClientException, etc.)
├── interceptor/       # JWT, MDC, metrics
├── util/              # Utilities
├── validator/         # Request validation
├── scheduler/         # PSP health scheduler
└── streamer/          # Kafka producer
```

Build: Maven, Spring Boot 3.1.0, Java 21.

## Approach: Think Before Coding

Before writing any code, pause and reason:
- What is the actual goal? What is the simplest way to achieve this?
- **Prefer config over code:** Can this be done WITHOUT writing new code? Can an existing filter handle it with a new DB property key? Can a cache-driven toggle (`HSS_<name>_enable`) solve it?
- All runtime config lives in the **DB application/business properties table**, loaded into `CacheUtil.applicationPropertiesMap` every 60s. `application.properties` is only a last-resort fallback — never rely on it for new behavior.
- Only proceed to code changes if DB config alone cannot fulfill the requirement.

## Controller Pattern

```java
package com.tpap.hss.controller;

import com.tpap.hss.config.URIConstants;
import com.tpap.hss.request.SelectHandleRequest;
import com.tpap.hss.response.SelectHandleResponse;
import com.tpap.hss.service.impl.HandleInfoSelectionServiceImpl;
import com.tpap.hss.util.DatadogUtility;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.validator.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.time.Duration;
import java.time.Instant;

@Validated
@Slf4j
@RestController
public class HSSController {

    @Autowired
    private HandleInfoSelectionServiceImpl handleInfoSelectionService;

    @Autowired
    private DatadogUtility datadogUtility;

    @RequestMapping(value = URIConstants.SELECT_HANDLE_V3, method = { RequestMethod.POST },
            consumes = "application/json", produces = "application/json")
    public ResponseEntity<SelectHandleResponse> getHandlesV3(
            @Valid @RequestParam() @NotBlank String requestTimestamp,
            @Valid @RequestParam() @NotBlank String requestId,
            @Validated @RequestBody SelectHandleRequest selectHandleRequest) throws Exception {
        Instant startTime = Instant.now();
        log.info("Request received for select handle v3 {}", selectHandleRequest);
        ResponseEntity<SelectHandleResponse> response = handleInfoSelectionService
                .processRequest(selectHandleRequest, requestId);
        log.info("v3 responseHttpCode : {} , responseBody : {} , latency : {}",
                response.getStatusCode(), response.getBody(),
                Duration.between(startTime, Instant.now()).toMillis());
        return response;
    }
}
```

**Conventions:**
- `@Validated` + `@Slf4j` + `@RestController` on class
- Path from `URIConstants`
- Query params: `requestTimestamp`, `requestId` (both `@Valid @RequestParam @NotBlank`)
- Body: `@Validated @RequestBody`
- Return: `ResponseEntity<XxxResponse>`
- Log entry + exit with latency

## URI Constants

```java
package com.tpap.hss.config;

public class URIConstants {
    public static final String SELECT_HANDLE_V3 = "/hss/upi/int/s2s/v3/selectHandle";
    public static final String META_SELECT_HANDLE_v1 = "/hss/upi/int/s2s/meta/v1/selectHandle";
}
```

Pattern: `/hss/upi/int/s2s/<version>/<endpointName>`

## API Response Constants

```java
package com.tpap.hss.config;

public class ApiResponseConstants {
    public static final String RESPONSE_CODE_200 = "200";
    public static final String RESPONSE_CODE_400 = "400";
    public static final String RESPONSE_CODE_401 = "401";
    public static final String RESPONSE_CODE_500 = "500";
    public static final String PROCESSED = "PROCESSED";
    public static final String BAD_REQUEST = "BAD_REQUEST";
    public static final String INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR";
    public static final String UNAUTHORIZED = "UNAUTHORIZED";
}
```

## Request Model Pattern

```java
package com.tpap.hss.request;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.validator.constraints.NotBlank;

import javax.validation.constraints.NotNull;
import java.util.List;

@Slf4j
@Data
public class SelectHandleRequest {
    @NotBlank
    private String requestId;
    @NotBlank
    private String custId;
    private String countryCode;
    @NotNull
    private List<PspDetails> pspDetails;
    private String primaryPsp;
    private JsonNode dynamicParams;
    private JsonNode extendedInfo;
}
```

**Sub-model (PspDetails):**

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PspDetails {
    @NotBlank
    private String pspName;
    @NotNull
    private Boolean isDeviceBinded;
    @NotNull
    private Boolean userOnboarded;
    private Boolean isPseudo;
    private Boolean isCustomVpa;
    @NotNull
    private List<BankAccount> linkedBanks;
    private Long userOnboardedTimestamp;
    private Long userBindedTimestamp;
}
```

**Sub-model (BankAccount):**

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BankAccount {
    private String bankKey;
    @NotNull
    private Boolean mpinSet;
    private String bioAuthStatus;
}
```

**Conventions:**
- Lombok `@Data`, `@Slf4j`
- `@NotBlank` for required strings, `@NotNull` for required objects/lists
- `JsonNode` for flexible/dynamic fields
- Nested models as separate classes in the `request` package

## Response Model Pattern

```java
package com.tpap.hss.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SelectHandleResponse {
    private String responseCode;
    private String responseMessage;
    private Map<String, List<String>> pspPriorityDetails;
    private Map<String, Map<String, Map<String, Object>>> pspPriorityDetailsInfo;
}
```

**Conventions:**
- `@JsonInclude(NON_NULL)` to omit null fields
- Always include `responseCode` and `responseMessage`
- Data payload as additional fields

## Service Interface Pattern

```java
package com.tpap.hss.service;

import com.tpap.hss.request.SelectHandleRequest;
import com.tpap.hss.response.SelectHandleResponse;
import org.springframework.http.ResponseEntity;

import javax.validation.Valid;

public interface HandleSelectionService {
    ResponseEntity<SelectHandleResponse> processRequest(
            SelectHandleRequest request, @Valid String requestId) throws Exception;
}
```

**Implementation conventions:**
- `@Service` annotation
- Inject via `@Autowired`: `RequestValidator`, `FilterConfig`, `CacheUtil`, `DatadogUtility`
- Flow: validate -> build DTOs -> run filter pipeline -> build response
- Use `new ResponseEntity<>(response, HttpStatus.OK)` / `new ResponseEntity<>(response, HttpStatus.BAD_REQUEST)` etc. (not the static builder methods)

## Filter Architecture

Two separate pipelines exist:

**Meta pipeline** (`/hss/upi/int/s2s/meta/v1/selectHandle`):
- Filters in `filter/meta/impl/` extend `Filter` (abstract class in `filter/Filter.java`)
- Resolved: `applicationContext.getBean(filterName, Filter.class)`
- Sequence key: `HSS_META_filter_sequence_{flowType}_{instrumentType}`

**Transactional pipeline** (`/hss/upi/int/s2s/v3/selectHandle`):
- Four layers executed in order: MANDATORY → HEALTH → BUSINESS → FINAL
- Each layer has an abstract class extending `BasicFilter` (`filter/BasicFilter.java`)
- Resolved: `applicationContext.getBean(filterName, BasicFilter.class)`
- Sequence key: `HSS_filter_sequence_{txnType}_{filterType}_{flowType}_{instrumentType}`

Filter sequences are driven by **DB keys**, **NOT** by `application.properties`.

**BasicFilter (transactional pipeline root):**

```java
package com.tpap.hss.filter;

import com.tpap.hss.dto.SelectHandleDto;
import lombok.Setter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

@Setter
public abstract class BasicFilter {
    public abstract List<String> process(
            List<String> hssPspPreference,
            SelectHandleDto selectHandleDto,
            LinkedHashMap<String, ArrayList<String>> filtersApplied) throws Exception;
}
```

**Writing a new transactional filter — follow this contract:**

1. Package: `com.tpap.hss.filter.<type>.impl`
2. `@Slf4j` + `@Component("ExactClassName")` — bean name must match the DB filter sequence entry
3. Extend the correct type (`MandatoryFilter`, `HealthFilter`, `BusinessFilter`, or `FinalFilter`)
4. `@Autowired` for `FilterConfig`, `CacheUtil`, etc.

> **Note:** Some existing business filters incorrectly extend `MandatoryFilter` instead of `BusinessFilter` (e.g., `PreferPrimaryPspBusinessFilterImpl`, `PreferCustomVpaBusinessFilterImpl`, `RemovePtyesBusinessFilterImpl`, `PreferPtyesBusinessFilterImpl`). This works because both extend `BasicFilter`, but for new code always extend the correct type for the filter layer.

**Writing a new meta filter:**

1. Package: `com.tpap.hss.filter.meta.impl`
2. `@Slf4j` + `@Component("ExactClassName")`
3. Extend `Filter` (NOT `BasicFilter`)

**The `process()` method (transactional filters):**
- Always create `List<String> newHssPspPreference = new ArrayList<>()` — never mutate the input list
- Check enable/disable toggle first: `cacheUtil.findByNameFromCache("HSS_<FilterName>_enable", "false").equalsIgnoreCase("true")`. Default must be `"false"` (off).
- When disabled: passthrough (`newHssPspPreference.addAll(hssPspPreference)`)
- Null/empty input → add `filterConfig.getDefaultPsp()`, set `applyNextFilter(false)`, put `"DefaultPsp"` in filtersApplied, return
- Single element → copy as-is, set `applyNextFilter(false)`, return
- Multiple elements → apply actual filter logic
- After logic: `filtersApplied.put(this.getClass().getSimpleName(), new ArrayList<>(newHssPspPreference))`
- Log: `log.debug("post <FilterName> bankKey:{} , preference:{}", selectHandleDto.getBankKey(), newHssPspPreference)`

**General rules:**
- Use constants from `Constants.java` — cache key prefixes follow `HSS_` convention
- No hardcoded values — everything via DB cache keys
- Cache misses must always have a sensible default in `findByNameFromCache`
- Make changes additive — do not modify or break existing filters/services

## Internal DTO Pattern

```java
package com.tpap.hss.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
public class SelectHandleDto {
    private String bankKey;
    private String primaryPsp;
    private String requestId;
    private String custId;
    private String countryCode;
    private JsonNode dynamicParams;
    private Map<String, PspDetailsDto> pspDetailsDtoMap;
    private boolean applyNextFilter;
    private String txnType;

    public List<String> getBasePspList() {
        return new ArrayList<>(pspDetailsDtoMap.keySet());
    }
}
```

## Request Constants

```java
package com.tpap.hss.config;

public class RequestConstants {
    public final static String CLIENT_OS = "clientOS";
    public final static String FLOW_TYPE = "flowType";
    public final static String IS_PSEUDO_DEB_CAPTURE = "isPseudoDebCapture";
}
```

## Unit Tests (Conditional)

Check if other filters/tasks in the repo already have unit tests at `src/test/java/...`. If yes, write unit tests for your change too. If no existing unit tests exist, skip this step.

- **Framework:** JUnit 5 + Mockito, no Spring context
- **Setup:** `@InjectMocks` for the filter, `@Mock` for all `@Autowired` dependencies, `MockitoAnnotations.openMocks(this)` in `@BeforeEach`
- **SelectHandleDto:** construct manually in setUp — set `bankKey`, `txnType`, `pspDetailsDtoMap`, `dynamicParams` (mocked `JsonNode`)
- **filtersApplied:** initialize as `new LinkedHashMap<>()`
- **Style:** Given/When/Then comments in each test, descriptive method names like `whenFilterDisabled_shouldReturnOriginalPreferences`
- **Scenarios to cover:**
  - Filter disabled → passthrough
  - Null preferences → default PSP, applyNextFilter false
  - Empty preferences → default PSP, applyNextFilter false
  - Single preference → short-circuit, applyNextFilter false
  - Core filter logic — both match and no-match paths
  - Edge cases specific to the filter's behavior

## Self-Review Checklist

Before declaring the task done, verify:
- [ ] Does existing behavior remain unchanged?
- [ ] Are all edge cases and null checks in place?
- [ ] Is the feature off by default (via cache key with default "false")?
- [ ] Are unit tests written and covering key scenarios?
- [ ] Is the @Component bean name correct (must match DB filter sequence entry)?
- [ ] Is logging consistent (`log.debug("post <FilterName> bankKey:{} , preference:{}", ...)`)?
- [ ] No hardcoded values — everything via CacheUtil or FilterConfig?
