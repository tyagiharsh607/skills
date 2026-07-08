# tpap-transactional-bff Code Patterns

Reference patterns from the TPAP Transactional BFF repository.

## Project Structure

```
tpap-transactional-bff/
├── controller/          # REST API layer (main Spring Boot app entry)
├── service/             # Business logic implementations
├── common/              # Shared DTOs, constants, utilities (gateway-common)
├── client/              # HTTP clients for external services (OAuth, Gateway APIs)
├── repository/          # Data access (DAOs, custom repositories)
├── datasource/          # PSP datasource layer (JPA entities, data services)
├── commons/             # PSP common utilities (crypto, profiler, shared utils)
├── velocity/            # Velocity/limit checking services
├── kafkaproducer/       # Kafka producers for async messaging
├── monitoring/          # Datadog/StatsD metrics
├── httpclient/          # HTTP client utilities
├── logger/              # Logging utilities
├── spring-data-aerospike/ # Aerospike integration
└── elasticsearch-commons/ # Elasticsearch models/repos
```

**Main Application:** `com.paytm.tpap.upi.UpiApplication` (in `controller` module)

**Tech Stack:**
- **Spring Boot**: 1.5.7.RELEASE
- **Java**: 11
- **Build Tool**: Maven
- **Logging**: Log4j2 with LMAX Disruptor (async)
- **Testing**: JUnit 4, Mockito, PowerMock
- **Coverage**: JaCoCo
- **Monitoring**: Datadog (StatsD), Hystrix
- **API Docs**: Springdoc OpenAPI 1.6.12
- **Databases**: MySQL (HikariCP), Aerospike, Elasticsearch 7.17.0
- **Messaging**: Spring Kafka 2.1.7
- **Security**: Auth0 JWT 3.2.0, Spring Security

## Approach: Think Before Coding

Before writing any code, pause and reason:
- What is the actual goal? What is the simplest way to achieve this?
- **Prefer config over code:** Can this be done WITHOUT writing new code? Can configuration or a DB property solve it?
- Is this a cross-cutting concern that should be handled at the gateway/filter level vs service level?
- Only proceed to code changes if config alone cannot fulfill the requirement.

## Controller Module Patterns

Package: `com.paytm.tpap.upi.controller`

### Controller Pattern

```java
@Validated
@RestController
@RequiredArgsConstructor  // Lombok for constructor injection
@Tag(name = "Mandate History", description = "Manage Mandate History")
@Slf4j
@MonitoringEntities({  // For Datadog metrics
    @MonitoringEntity(operand = MonitoringEntity.Datatype.EXCEPTION,
        operations = { MonitoringEntity.Operations.LOG, 
                       MonitoringEntity.Operations.DATA_DOG_INCR }),
    @MonitoringEntity(operand = MonitoringEntity.Datatype.HIT_COUNT,
        operations = { MonitoringEntity.Operations.LOG, 
                       MonitoringEntity.Operations.DATA_DOG_INCR }),
    @MonitoringEntity(operand = MonitoringEntity.Datatype.TIME_DATA,
        operations = { MonitoringEntity.Operations.LOG, 
                       MonitoringEntity.Operations.DATA_DOG_TIME })
})
public class MandateHistoryController {
    
    private final DefaultMandateService defaultMandateService;
    private final DatadogUtility datadogUtility;

    @PostMapping(value = URIConstants.SCHEDULED_MANDATES_EXT_URI, 
                 consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get scheduled mandates", 
               description = "Fetch all scheduled mandates for a user")
    public MandateDetailsList getScheduledMandates(
            @RequestHeader(value = CHANNEL_TOKEN, required = false) String channelToken,
            @RequestHeader(value = CHANNEL, required = false) String channel,
            @Validated @RequestBody MandateHistoryRequest request,
            HttpServletRequest httpServletRequest) {
        
        log.info("Fetching scheduled mandates for request: {}", request);
        return defaultMandateService.getScheduledMandates(request, channel);
    }
}
```

**Key Conventions:**
- **Constructor Injection**: Use `@RequiredArgsConstructor` (Lombok) for final fields (NOT `@Inject` or `@Autowired` on constructors)
- **Field Injection**: Use `@Autowired` for field injection (legacy code uses this)
- **Validation**: `@Validated` on class, `@Validated` on `@RequestBody`
- **Logging**: `@Slf4j` (Lombok)
- **Monitoring**: `@MonitoringEntities` for Datadog metrics (exception, hit count, time data)
- **API Docs**: `@Tag`, `@Operation`, `@ApiResponse`, `@Schema`
- **Headers**: `@RequestHeader` for `CHANNEL_TOKEN`, `CHANNEL`, `SESSION_TOKEN`
- **No Base Controller Extension**: Controllers do NOT extend `BaseController` in most cases
- **Return Types**: Return domain-specific response objects directly (not wrapped in generic response types at controller level)

### JWT-Protected Endpoints

```java
@PostMapping(URIConstants.INT_MANDATE_JOURNEY_URI)
@JwtAuth  // Custom annotation for JWT validation via interceptor
@Operation(summary = "Get mandate journey timeline")
public CustomResponse<MandateJourneyResponse> getMandateJourney(
        @RequestHeader(value = AUTHORIZATION_HEADER) String authHeader,
        @Validated @RequestBody MandateJourneyRequest request) {
    
    return new CustomResponse<>(CustomResponse.Status.SUCCESS, 
                                mandateService.getMandateJourney(request));
}
```

### Controller Advice Pattern

**CRITICAL**: One advice class per controller, scoped using `assignableTypes`

```java
@Order
@RestControllerAdvice(assignableTypes = { PassbookController.class })
@Slf4j
public class PassbookControllerAdvice {
    
    @Autowired
    private DatadogUtility datadogUtility;
    
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    @ExceptionHandler(InvalidOauthTokenException.class)
    public SwitchCustomResponse handleException(InvalidOauthTokenException exception) {
        log.error(exception.getREQUEST_TOKEN(), exception.getLocalizedMessage(), exception);
        String code = getResponseMapper(AllConstants.SESSION_TOKEN_INVALID).getRespCode();
        return new SwitchCustomResponse(code, AllConstants.INVALID_TOKEN);
    }
    
    @ResponseStatus(HttpStatus.OK)
    @ExceptionHandler(ValidationException.class)
    public SwitchCustomResponse handleException(ValidationException exception) {
        log.error("Validation Exception {}", exception);
        return new SwitchCustomResponse(AllConstants.OK_RESP_CODE, exception.getMessage());
    }
    
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    @ExceptionHandler(Exception.class)
    public SwitchCustomResponse handleException(Exception exception) {
        log.error("Exception {} and {}", ExceptionUtils.getStackTrace(exception), 
                  exception.getLocalizedMessage());
        datadogUtility.incrementCounterForMultipleTags(
            Enums.METRIC_KEY.EXCEPTION_KEY.getValue(),
            Enums.METRIC_TAG.EXCEPTION_NAME_TAG.getValue() + ":" + exception.getClass());
        return new SwitchCustomResponse(AllConstants.INTERNAL_SERVER_RESP_CODE, 
                                        AllConstants.GENERIC_ERROR_MSG);
    }
}
```

## Common Module Patterns

Package: `com.paytm.tpap.upi.common`

### Request DTO Pattern

```java
@Data
@Schema(name = "MandateHistoryRequest", description = "Request for mandate history")
public class MandateHistoryRequest {
    
    @Schema(description = "Request Id")
    private String requestId;

    @Schema(description = "Page number")
    private Integer pageNo;

    @Schema(description = "Page size")
    private Integer pageSize;

    @Schema(description = "Sort on basis of params and order")
    private Sort sort;

    @Schema(description = "User customer id")
    private String userCustomerId;
}
```

**Conventions:**
- `@Data` (Lombok) for getters/setters
- `@Schema` for OpenAPI/Swagger docs
- Use `@Length`, `@Range`, `@NotBlank`, `@NotNull` for validation (javax.validation)
- Fields are typically nullable unless explicitly required
- Nested objects for complex structures (Filter, Sort, etc.)

### Response DTO Pattern

```java
@Data
@RequiredArgsConstructor
@Schema(name = "App Response")
public class AppResponse<T> {
    
    @Schema(description = "Status")
    String status;

    @Schema(description = "Response Code")
    String respCode;

    @Schema(description = "Response Message")
    String respMessage;

    @JsonProperty("seqNo")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @Schema(description = "Sequence Number")
    String seqNo;
}
```

### Response Wrapper Patterns

**Multiple response wrappers exist** - use the appropriate one for your API:

#### 1. CustomResponse<T> (Generic wrapper)
```java
@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CustomResponse<T> {
    private Status status;  // SUCCESS | FAILURE
    private T response;
    
    public enum Status {
        @JsonProperty("success")
        SUCCESS,
        @JsonProperty("failure")
        FAILURE;
    }
}
```

#### 2. AppResponse (Base response with status/respCode)
```java
@Data
@RequiredArgsConstructor
@Schema(name = "App Response")
public class AppResponse<T> {
    String status;
    String respCode;
    String respMessage;
    @JsonProperty("seqNo")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    String seqNo;
}
```

#### 3. UpiCustomResponse (Transaction APIs)
```java
@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpiCustomResponse {
    private Boolean success = true;
    private String response = UpiCustomResponseEnum.SUCCESS.getResponseCode();
    private String message = "Transaction Successful";
    @JsonProperty("BankRRN")
    private String bankRRN;
    @JsonProperty("SeqNo")
    private String seqNo;
    @JsonProperty("MobileAppData")
    private MobileAppData mobileAppData;
}
```

#### 4. SwitchCustomResponse (Passbook/Pending Collect)
```java
@Data
public class SwitchCustomResponse {
    private String code;
    private String message;
    
    public SwitchCustomResponse(String code, String message) {
        this.code = code;
        this.message = message;
    }
}
```

**Choose the right response type:**
- `CustomResponse<T>`: Generic success/failure wrapper
- `AppResponse`: Mandate, bank health, risk, velocity APIs
- `UpiCustomResponse`: Transaction APIs (mini-stmt, pending collect)
- `SwitchCustomResponse`: Passbook, pending collect (legacy)
- Specific response classes: `PendingTxnListResponse`, `PendingMandateListResponse`, etc.

### Constants Pattern

```java
public class URIConstants {
    public static final String SCHEDULED_MANDATES_EXT_URI = 
        "/upi/ext/gateway/v1/mandate/scheduled";
    public static final String PASSBOOK_MINI_STMT_V1 = 
        "/upi/ext/gateway/v1/transaction/mini-stmt";
}

// AllConstants is an interface that extends multiple constant interfaces
public interface AllConstants extends TransactionHistoryConstants, 
                                       CommonConstants, 
                                       ResponseConstants, 
                                       CacheConstants,
                                       ElasticSearchFieldConstants, 
                                       ApplicationPropertiesConstants {
}
```

## Service Module Patterns

Package: `com.paytm.tpap.upi.service`

### Service Implementation Pattern

**CRITICAL**: Services use either `@RequiredArgsConstructor` (Lombok) or `@Autowired` on fields (NOT `@Inject`)

```java
@Slf4j
@Service
@RequiredArgsConstructor  // Lombok for final fields
public class DefaultMandateServiceImpl implements DefaultMandateService {
    
    private final MandateHistoryFactory mandateHistoryFactory;
    private final BusinessPropertiesDataService businessPropertiesDataService;
    private final DefaultMandateServiceHelper defaultMandateServiceHelper;
    private final DatadogUtility datadogUtility;
    private final ApplicationPropertiesAccessor applicationPropertiesAccessor;
    
    @Override
    public MandateDetailsList getScheduledMandates(
            MandateHistoryRequest request, String channel) {
        
        log.info("Fetching scheduled mandates for channel: {}, pageNo: {}", 
                 channel, request.getPageNo());
        
        // Business logic here
        List<MandateDetails> mandates = defaultMandateServiceHelper
            .fetchScheduledMandates(request);
        
        MandateDetailsList response = new MandateDetailsList();
        response.setMandates(mandates);
        response.setTotalCount(mandates.size());
        
        log.debug("Fetched {} mandates", mandates.size());
        return response;
    }
}
```

**Alternative Pattern (Field Injection):**
```java
@Service
@Slf4j
public class PassbookServiceImpl {
    
    @Autowired
    private UserTxnHistoryRepository userTxnHistoryRepository;
    
    @Autowired
    private OauthUtil oauthUtil;
    
    @Autowired
    private DatadogUtility datadogUtility;
    
    // Service methods...
}
```

**Conventions:**
- `@Service` annotation (NO explicit bean name in newer services)
- `@Slf4j` for logging
- `@RequiredArgsConstructor` for final fields OR `@Autowired` for field injection
- Log entry (info) with key parameters, exit (debug) with results
- Use helper classes for complex logic
- Inject `DatadogUtility` for metrics

### Service Helper Pattern

```java
@Component
@Slf4j
public class DefaultMandateServiceHelper {
    
    @Autowired
    private PendingMandateRepository mandateRepository;
    
    @Autowired
    private DatadogUtility datadogUtility;
    
    public List<MandateDetails> fetchScheduledMandates(MandateHistoryRequest request) {
        long startTime = System.currentTimeMillis();
        
        try {
            // Complex business logic here
            List<MandateDetails> mandates = mandateRepository
                .findScheduledMandates(request.getPageNo(), request.getPageSize());
            
            datadogUtility.recordExecutionTime("mandate.fetch.scheduled", 
                System.currentTimeMillis() - startTime);
            
            return mandates;
        } catch (Exception e) {
            log.error("Error fetching scheduled mandates", e);
            datadogUtility.incrementCounter("mandate.fetch.error");
            throw e;
        }
    }
}
```

## Repository Module Patterns

Package: `com.paytm.tpap.upi.repository`

### JPA Repository Pattern

```java
@Repository
public interface PendingMandateRepository extends JpaRepository<MandateEntity, Long> {
    List<MandateEntity> findByCustIdAndStatus(String custId, String status);
    
    @Query("SELECT m FROM MandateEntity m WHERE m.custId = ?1 " +
           "AND m.status IN ('PENDING', 'SCHEDULED') ORDER BY m.createdAt DESC")
    List<MandateEntity> findPendingMandates(String custId);
}
```

### DAO Pattern (Custom JDBC)

```java
// Interface
public interface UserTxnHistoryRepository {
    List<Transaction> findByCustId(String custId, int pageNo, int pageSize);
}

// Implementation
@Repository
@Slf4j
public class UserTxnHistoryRepositoryImpl implements UserTxnHistoryRepository {
    
    @Autowired
    @Qualifier("gatewaySlaveTemplate")  // READ from slave
    private JdbcTemplate jdbcTemplate;
    
    @Override
    public List<Transaction> findByCustId(String custId, int pageNo, int pageSize) {
        String sql = "SELECT * FROM txn_history WHERE cust_id = ? " +
                     "ORDER BY created_at DESC LIMIT ? OFFSET ?";
        
        int offset = pageNo * pageSize;
        return jdbcTemplate.query(sql, 
            new Object[]{custId, pageSize, offset}, 
            new TransactionRowMapper());
    }
}
```

**Conventions:**
- `@Repository` annotation
- **Master/Slave Split**: `gatewayMasterTemplate` for writes, `gatewaySlaveTemplate` for reads
- `@Qualifier` for template selection
- Use prepared statements (not string concatenation)
- Row mappers for JDBC queries

## Client Module Patterns

Package: `com.paytm.tpap.upi.client`

### HTTP Client Pattern

```java
@Component
@Slf4j
public class OauthHttpClient {
    
    @Autowired
    private RestClientUtil restClientUtil;
    
    @Autowired
    private OauthConfig oauthConfig;
    
    public OauthResponse validateToken(String sessionToken) {
        String url = oauthConfig.getBaseUrl() + "/oauth/validate";
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("session-token", sessionToken);
        
        try {
            ResponseEntity<OauthResponse> response = restClientUtil
                .post(url, headers, null, OauthResponse.class);
            
            log.debug("Oauth validation successful");
            return response.getBody();
            
        } catch (Exception e) {
            log.error("Oauth validation failed: {}", e.getMessage(), e);
            throw new OauthException("Token validation failed", e);
        }
    }
}
```

### Client Configuration

```java
@Configuration
@ConfigurationProperties(prefix = "oauth.config")
@Data
public class OauthConfig {
    private String baseUrl;
    private String clientId;
    private String clientSecret;
    private int connectionTimeout;
    private int readTimeout;
}
```

**In application.properties:**
```properties
oauth.config.base-url=https://oauth-staging.paytm.com
oauth.config.connection-timeout=5000
oauth.config.read-timeout=10000
```

## Configuration Patterns

### DataSource Configuration

```java
@Configuration
@EnableJpaRepositories(
    basePackages = "com.paytm.tpap.upi.repository.gateway.master",
    entityManagerFactoryRef = "gatewayMasterEntityManagerFactory",
    transactionManagerRef = "gatewayMasterTransactionManager"
)
public class GatewayMasterDbConfig {
    
    @Bean(name = "metricRegistry")
    public MetricRegistry metricRegistry() {
        return new MetricRegistry();
    }
    
    @Primary
    @Bean(name = "gatewayMasterHikariConfig")
    @ConfigurationProperties(prefix = "master.datasource.gateway")
    public HikariConfig hikariConfig(@Qualifier("metricRegistry") MetricRegistry metricRegistry) {
        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setMetricRegistry(metricRegistry);
        return hikariConfig;
    }
    
    @Primary
    @Bean(name = "gatewayMasterDataSource")
    public DataSource dataSource(
            @Qualifier("gatewayMasterHikariConfig") HikariConfig hikariConfig) {
        return new HikariDataSource(hikariConfig);
    }
}
```

### Interceptor Pattern

```java
@Slf4j
@Component
@Aspect
public class JwtInterceptorV2 implements HandlerInterceptor {
    
    @Autowired
    private JwtUtilV2 jwtUtilV2;
    
    @Autowired
    private HttpServletRequest request;
    
    @Override
    public boolean preHandle(HttpServletRequest httpServletRequest, 
                              HttpServletResponse httpServletResponse, 
                              Object o) throws Exception {
        
        String jwtToken = JwtUtilV2.extractJwtToken(
            request.getHeader(AUTHORIZATION_HEADER));
        
        log.debug("Extracted jwtToken: {}", jwtToken);
        
        jwtUtilV2.isJwtExpired(jwtToken);
        Channel channel = (Channel) request.getAttribute(Constants.CHANNEL_OBJECT);
        jwtUtilV2.verifyToken(channel.getChannelCode(), jwtToken, claims);
        
        log.debug("Returning from jwt interceptor: {}", request.getRequestURI());
        return true;
    }
}
```

### Interceptor Registration

```java
@Configuration
public class InterceptorConfig implements WebMvcConfigurer {
    
    @Autowired
    private JwtInterceptorV2 jwtInterceptorV2;
    
    @Autowired
    private ChannelInterceptor channelInterceptor;
    
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(channelInterceptor)
            .addPathPatterns("/upi/ext/gateway/**");
        
        registry.addInterceptor(jwtInterceptorV2)
            .addPathPatterns(INT_PENDING_TXN_WITH_RECURRING_MANDATE,
                             INT_MANDATE_JOURNEY_URI,
                             VELOCITY_VALIDATE_WITH_AUTH);
    }
}
```

## Monitoring & Metrics

### Datadog Integration

```java
@Component
@Slf4j
public class SomeService {
    
    @Autowired
    private DatadogUtility datadogUtility;
    
    public void someBusinessMethod() {
        long startTime = System.currentTimeMillis();
        
        try {
            // Business logic
            
            // Record execution time
            datadogUtility.recordExecutionTime("service.method.execution", 
                System.currentTimeMillis() - startTime);
            
            // Increment counter
            datadogUtility.incrementCounter("service.method.success");
            
        } catch (Exception e) {
            datadogUtility.incrementCounter("service.method.error");
            datadogUtility.incrementCounterForMultipleTags(
                "exception.occurred",
                "exception_type:" + e.getClass().getSimpleName(),
                "method:someBusinessMethod"
            );
            throw e;
        }
    }
}
```

## Unit Testing (Conditional)

**Check if other modules/features have unit tests. If yes, write tests. If no existing unit tests exist, skip this step.**

**Framework:** JUnit 4 + Mockito + PowerMock (Spring Boot 1.5.7)

```java
@PowerMockIgnore({ "javax.management.*", "jdk.internal.reflect.*" })
@RunWith(PowerMockRunner.class)
@PrepareForTest({ AccountProvidersCache.class, ResponseCodeCache.class })
public class UpiPassbookServiceTest {
    
    @Mock
    private UserTxnHistoryRepository userTxnHistoryRepositoryMock;
    
    @Mock
    private DatadogUtility datadogUtility;
    
    @InjectMocks
    private UpiPassBookService passbookService;
    
    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
    }
    
    @Test
    public void whenGetPassbook_thenReturnTransactions() {
        // Given
        PassbookRequest request = new PassbookRequest();
        request.setPageNo(0);
        request.setPageSize(20);
        String custId = "12345";
        
        List<Transaction> mockTxns = Arrays.asList(
            new Transaction(), new Transaction());
        when(userTxnHistoryRepositoryMock.findByCustId(custId, 0, 20))
            .thenReturn(mockTxns);
        
        // When
        PassbookResponse response = passbookService.getPassbook(request, custId);
        
        // Then
        assertNotNull(response);
        assertEquals(2, response.getTransactions().size());
        verify(userTxnHistoryRepositoryMock).findByCustId(custId, 0, 20);
    }
}
```

## Self-Review Checklist

Before declaring the task done, verify:

- [ ] Does existing behavior remain unchanged?
- [ ] Are all edge cases and null checks in place?
- [ ] Is validation present on request DTOs using `@Validated`, `@Length`, `@Range`, `@NotBlank`?
- [ ] Are unit tests written if other modules have them (JUnit 4 + Mockito + PowerMock)?
- [ ] Is logging consistent (`log.info` for entry, `log.debug` for exit)?
- [ ] Are configuration values externalized (not hardcoded)?
- [ ] Is the correct datasource used (`gatewayMasterTemplate` for writes, `gatewaySlaveTemplate` for reads)?
- [ ] Are HTTP clients using proper timeout and error handling?
- [ ] Is JWT/OAuth authentication properly validated via interceptors?
- [ ] Are Swagger/OpenAPI annotations present (`@Tag`, `@Operation`, `@Schema`, `@ApiResponse`)?
- [ ] Is sensitive data (tokens, passwords) masked in logs?
- [ ] Are database queries using prepared statements (no string concatenation)?
- [ ] Is the appropriate response wrapper used (`CustomResponse`, `AppResponse`, `UpiCustomResponse`, `SwitchCustomResponse`)?
- [ ] Are Datadog metrics recorded for critical operations (`recordExecutionTime`, `incrementCounter`)?
- [ ] Are exceptions handled in controller advice with appropriate `@ResponseStatus`?

## Common Patterns Summary

| Pattern | Convention |
|---------|------------|
| **Controller** | `@RestController`, `@Validated`, `@RequiredArgsConstructor`, `@Tag`, `@Operation`, `@MonitoringEntities` |
| **Service** | `@Service`, `@Slf4j`, `@RequiredArgsConstructor` OR `@Autowired` fields |
| **Repository** | `@Repository`, master/slave separation, `@Qualifier` for templates |
| **DTO** | `@Data`, `@Schema`, `@JsonInclude(NON_NULL)`, validation annotations |
| **Config** | `@Configuration`, `@ConfigurationProperties`, externalize to application.properties |
| **Client** | `@Component`, `RestClientUtil`, config-driven URLs/timeouts |
| **Logging** | `@Slf4j`, `log.info` for entry, `log.debug` for exit, mask sensitive data |
| **Validation** | `@Validated`, `@Length`, `@Range`, `@NotBlank` on request DTOs |
| **Exception** | Controller advice per controller, `@RestControllerAdvice(assignableTypes = {...})`, `@ExceptionHandler` |
| **Response** | Choose appropriate: `CustomResponse<T>`, `AppResponse`, `UpiCustomResponse`, `SwitchCustomResponse` |
| **Monitoring** | Inject `DatadogUtility`, record metrics for execution time, counters, errors |
| **Dependency Injection** | `@RequiredArgsConstructor` (Lombok) for constructor injection, `@Autowired` for field injection |
| **Testing** | JUnit 4, Mockito, PowerMock, `@RunWith(PowerMockRunner.class)`, `@PrepareForTest` |

## Key Differences from Previous Patterns

1. **Dependency Injection**: Use `@RequiredArgsConstructor` (Lombok) for constructor injection, NOT `@Inject`. Field injection uses `@Autowired`.
2. **Controller Base**: Controllers do NOT extend `BaseController` in most cases.
3. **Service Bean Names**: Services use `@Service` without explicit bean names in newer code.
4. **Multiple Response Types**: Not a single `CustomResponse` pattern - choose based on API type (AppResponse, UpiCustomResponse, SwitchCustomResponse).
5. **Monitoring**: All controllers and services should integrate Datadog metrics via `@MonitoringEntities` and `DatadogUtility`.
6. **Testing**: JUnit 4 + Mockito + PowerMock (not JUnit 5), PowerMock for static mocks.
7. **Constants**: `AllConstants` is an interface extending multiple constant interfaces.
8. **Log4j2**: Uses Log4j2 with LMAX Disruptor for async logging (not Logback).

---

**Last Updated:** March 2026  
**Repository:** tpap-transactional-bff  
**Spring Boot Version:** 1.5.7.RELEASE  
**Java Version:** 11
