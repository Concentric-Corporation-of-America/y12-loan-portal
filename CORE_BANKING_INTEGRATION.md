# Y-12 Federal Credit Union Core Banking Integration

## Executive Summary

Y-12 Federal Credit Union uses **Jack Henry's Symitar Episys** as their core banking system. This document outlines the integration architecture for connecting the Y12 Loan Portal with the Symitar core via the **SymXchange API**.

---

## 1. Core Banking System Overview

### 1.1 Y-12 FCU Technology Stack

| Component | Provider | Details |
|-----------|----------|---------|
| Core Banking System | Jack Henry Symitar Episys | Full-service credit union core platform |
| Core API | SymXchange | SOAP/XML web services API |
| Data Store | Symitar Data Store | Real-time data access layer |
| Integration Layer | SymConnect / SymXchange | TCP socket and web services protocols |

### 1.2 Confirmed Y-12 FCU + Jack Henry Relationship

Y-12 FCU is a confirmed Jack Henry Symitar customer based on:
- Jack Henry Resource Hub case study: "Y-12 Federal Credit Union innovates to gain superior fraud prevention... leveraged Symitar"
- 2025 Cobalt Award winner for reducing fraud by 93% using Jack Henry technology
- Job postings for "Programmer I" at Y-12 FCU requiring Symitar Episys experience
- CU Build 2025 conference featuring Todd Richardson (CTIO, Y-12 FCU) with Jack Henry executives

---

## 2. SymXchange API Architecture

### 2.1 API Overview

SymXchange is a web services API that provides:
- **Transactions**: Loan disbursements, payments, transfers
- **Inquiries**: Account lookups, balance checks, member info
- **File Maintenance**: Update member records, loan details
- **PowerOn Specfiles**: Run custom Symitar scripts

### 2.2 Technical Specifications

| Specification | Value |
|---------------|-------|
| Protocol | SOAP 1.1 / 1.2 |
| Data Format | XML |
| Authentication | Multiple credential types (see below) |
| WSDL Location | Credit union-specific endpoint |
| API Version | Updated quarterly by Jack Henry |

### 2.3 Authentication Methods

SymXchange supports multiple credential types:
1. **AccountNumber** - Member account number authentication
2. **HomeBanking** - Online banking credentials
3. **Card** - Debit/credit card authentication
4. **MICR** - Check MICR line authentication
5. **Lookup** - SSN/TIN lookup
6. **UserNumber** - Internal user number
7. **Administrative** - System-level access (for backend operations)

---

## 3. Key API Operations for Loan Portal

### 3.1 Loan Disbursement (newLoan)

**Target WSDL**: TransactionsService
**Operation**: newLoan

Used to disburse funds when a loan is approved.

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:tran="http://www.symxchange.generated.symitar.com/v1/transactions"
    xmlns:dto="http://www.symxchange.generated.symitar.com/v1/transactions/dto">
  <soapenv:Header/>
  <soapenv:Body>
    <tran:newLoan>
      <Request MessageId="newLoan">
        <Credentials>
          <AdministrativeCredentials>
            <Password>[ADMIN_PASSWORD]</Password>
          </AdministrativeCredentials>
        </Credentials>
        <DeviceInformation DeviceType="CLIENTSYSTEM" DeviceNumber="20000"/>
        <dto:AccountNumber>[MEMBER_ACCOUNT]</dto:AccountNumber>
        <dto:LoanId>[LOAN_ID]</dto:LoanId>
        <LoanAmounts>
          <dto:TotalAmount>[LOAN_AMOUNT]</dto:TotalAmount>
          <CheckAmount>[CHECK_AMOUNT]</CheckAmount>
        </LoanAmounts>
        <dto:CheckIssuer>Y12FCU</dto:CheckIssuer>
        <dto:Comment>Loan Disbursement - [LOAN_PURPOSE]</dto:Comment>
      </Request>
    </tran:newLoan>
  </soapenv:Body>
</soapenv:Envelope>
```

**Required Fields**:
- dto:AccountNumber
- dto:LoanId
- LoanAmounts/dto:TotalAmount
- LoanAmounts/CheckAmount

### 3.2 Loan Payment (makeLoanPayment)

**Target WSDL**: TransactionsService
**Operation**: makeLoanPayment

Used to process loan payments from members.

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:tran="http://www.symxchange.generated.symitar.com/v1/transactions"
    xmlns:dto="http://www.symxchange.generated.symitar.com/v1/transactions/dto">
  <soapenv:Header/>
  <soapenv:Body>
    <tran:makeLoanPayment>
      <Request MessageId="loanPayment">
        <Credentials>
          <HomeBankingCredentials>
            <UserId>[MEMBER_USER_ID]</UserId>
            <Password>[MEMBER_PASSWORD]</Password>
          </HomeBankingCredentials>
        </Credentials>
        <DeviceInformation DeviceType="HOMEBANKING" DeviceNumber="1"/>
        <dto:AccountNumber>[MEMBER_ACCOUNT]</dto:AccountNumber>
        <dto:LoanId>[LOAN_ID]</dto:LoanId>
        <dto:PaymentAmount>[PAYMENT_AMOUNT]</dto:PaymentAmount>
        <dto:SourceShareId>[SOURCE_SHARE_ID]</dto:SourceShareId>
      </Request>
    </tran:makeLoanPayment>
  </soapenv:Body>
</soapenv:Envelope>
```

### 3.3 Account Inquiry (getAccountInfo)

**Target WSDL**: InquiryService
**Operation**: getAccountInfo

Used to retrieve member account details, balances, and loan information.

### 3.4 Fund Transfer (transferFunds)

**Target WSDL**: TransactionsService
**Operation**: transferFunds

Used to transfer funds between member accounts or to external accounts.

---

## 4. Integration Architecture

### 4.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Y12 Loan Portal (Frontend)                   │
│                    https://y12-loan-portal.com                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Backend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Database   │  │    Auth     │  │    Edge Functions       │  │
│  │  (Postgres) │  │  (JWT/RLS)  │  │  - core-banking-sync    │  │
│  │             │  │             │  │  - loan-disbursement    │  │
│  │  - members  │  │             │  │  - payment-processing   │  │
│  │  - loans    │  │             │  │  - account-inquiry      │  │
│  │  - payments │  │             │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Core Banking Integration Layer                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              SymXchange SOAP Client                      │    │
│  │  - XML Request Builder                                   │    │
│  │  - SOAP Envelope Handler                                 │    │
│  │  - Response Parser                                       │    │
│  │  - Error Handler                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                Jack Henry SymXchange API                         │
│                (Y-12 FCU Symitar Instance)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │Transactions │  │  Inquiries  │  │   File Maintenance      │  │
│  │  Service    │  │   Service   │  │      Service            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Symitar Episys Core                             │
│              (Y-12 FCU Member Database)                          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow

1. **Loan Application Submission**
   - Member submits loan application via portal
   - Application stored in Supabase `loan_applications` table
   - Status set to "pending"

2. **Loan Approval (Admin)**
   - Admin reviews and approves loan
   - Edge Function `loan-disbursement` triggered
   - SymXchange `newLoan` operation called
   - Funds disbursed to member account in Symitar
   - Loan record created in Supabase `loans` table
   - Confirmation number stored from SymXchange response

3. **Loan Payment**
   - Member initiates payment via portal
   - Edge Function `payment-processing` triggered
   - SymXchange `makeLoanPayment` operation called
   - Payment posted to Symitar
   - Payment record created in Supabase `loan_payments` table

4. **Account Sync**
   - Scheduled Edge Function `core-banking-sync` runs hourly
   - Queries SymXchange for updated balances
   - Syncs loan balances, payment history to Supabase
   - Ensures data consistency between systems

---

## 5. Implementation Plan

### 5.1 Phase 1: Foundation (Current)

- [x] Supabase database schema with RLS
- [x] Member authentication via Supabase Auth
- [x] Loan application workflow
- [x] Admin approval interface
- [x] FRED AI assistant

### 5.2 Phase 2: Core Banking Integration Layer

- [ ] Create SymXchange SOAP client Edge Function
- [ ] Implement XML request builders for each operation
- [ ] Add response parsers and error handlers
- [ ] Create secure credential storage in Supabase Vault

### 5.3 Phase 3: Transaction Integration

- [ ] Implement loan disbursement flow
- [ ] Implement payment processing flow
- [ ] Add real-time balance sync
- [ ] Create transaction audit logging

### 5.4 Phase 4: Production Deployment

- [ ] Obtain SymXchange credentials from Y-12 FCU IT
- [ ] Configure production endpoint URLs
- [ ] Complete end-to-end testing
- [ ] Go-live with core banking integration

---

## 6. Security Considerations

### 6.1 Credential Management

| Credential Type | Storage Location | Access Control |
|-----------------|------------------|----------------|
| SymXchange Admin Password | Supabase Vault | Edge Functions only |
| API Endpoint URL | Environment Variable | Server-side only |
| Device Number | Configuration | Assigned by Y-12 FCU IT |

### 6.2 Data Protection

- All SymXchange communications over TLS 1.3
- No member credentials stored in portal database
- Audit logging of all core banking transactions
- IP whitelisting for SymXchange access (if required by Y-12 FCU)

### 6.3 Compliance

- SOC 2 Type II certification in progress (via Vanta)
- NCUA Part 748 compliant security controls
- GLBA data protection requirements met
- BSA/AML monitoring integrated

---

## 7. API Endpoint Configuration

### 7.1 Environment Variables Required

```env
# SymXchange Configuration
SYMXCHANGE_ENDPOINT_URL=https://[Y12-SPECIFIC-ENDPOINT]/SymXchange/v1
SYMXCHANGE_ADMIN_PASSWORD=[ENCRYPTED_PASSWORD]
SYMXCHANGE_DEVICE_TYPE=CLIENTSYSTEM
SYMXCHANGE_DEVICE_NUMBER=[ASSIGNED_BY_Y12]
SYMXCHANGE_CLIENT_NUMBER=[ASSIGNED_BY_Y12]

# Supabase Configuration (existing)
SUPABASE_URL=https://rbmotycxvspzeudwhrqi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]
```

### 7.2 WSDL Endpoints

| Service | WSDL Path |
|---------|-----------|
| Transactions | /TransactionsService?wsdl |
| Inquiries | /InquiryService?wsdl |
| File Maintenance | /FileMaintenanceService?wsdl |
| Parameters | /ParameterService?wsdl |

---

## 8. Error Handling

### 8.1 SymXchange Error Codes

| Code | Description | Action |
|------|-------------|--------|
| 0 | Success | Process response |
| 1-99 | Warning | Log and continue |
| 100+ | Error | Retry or escalate |

### 8.2 Retry Strategy

- Maximum 3 retry attempts
- Exponential backoff (1s, 2s, 4s)
- Circuit breaker after 5 consecutive failures
- Alert to admin on persistent failures

---

## 9. Testing Strategy

### 9.1 Test Environment

Jack Henry provides a sandbox environment for SymXchange testing:
- Separate endpoint URL
- Test member accounts
- No real transactions posted

### 9.2 Test Cases

1. **Loan Disbursement**
   - Successful disbursement
   - Insufficient funds
   - Invalid account number
   - Invalid loan ID

2. **Payment Processing**
   - Successful payment
   - Insufficient share balance
   - Overpayment handling
   - Partial payment

3. **Account Inquiry**
   - Valid account lookup
   - Invalid credentials
   - Account not found

---

## 10. Next Steps for Y-12 FCU Partnership

### 10.1 Technical Requirements from Y-12 FCU

To complete the integration, Concentric Corporation needs:

1. **SymXchange Credentials**
   - Administrative password for backend operations
   - Device number assignment
   - Client number assignment

2. **Endpoint Configuration**
   - Production SymXchange URL
   - Test/sandbox SymXchange URL
   - IP whitelist requirements

3. **WSDL Access**
   - Access to Y-12 FCU's specific WSDL files
   - Any custom operations or extensions

4. **Testing Support**
   - Test member accounts
   - Sandbox environment access
   - Technical contact for integration support

### 10.2 Proposed Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Credential Setup | 1 week | SymXchange access configured |
| Integration Development | 2 weeks | Edge Functions deployed |
| Testing | 1 week | All test cases passed |
| UAT | 1 week | Y-12 FCU sign-off |
| Go-Live | 1 day | Production deployment |

**Total Estimated Timeline: 5-6 weeks**

---

## 11. Contact Information

**Concentric Corporation of America**
Dylan Baker, CEO
Email: dylan@concentriccorp.us

**Jack Henry Technical Support**
Developer Portal: https://jackhenry.dev
Documentation: https://jackhenry.dev/symxchange-api-docs/

---

*Document Version: 1.0*
*Last Updated: November 30, 2025*
*Author: Devin AI (Concentric Corporation)*
