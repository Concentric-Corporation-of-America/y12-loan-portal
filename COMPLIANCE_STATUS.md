# Y12 Loan Portal - Federal Credit Union Compliance Status

Last Updated: November 30, 2025

## SOC 2 Type II Certification Status

**Status: INITIATED**
**Provider: Vanta (https://www.vanta.com)**
**Demo Request Submitted: November 30, 2025**
**Target Certification: Q2 2026**

Concentric Corporation has submitted a demo request to Vanta for SOC 2 Type II certification. Vanta will contact dylan@concentriccorp.us to schedule a customized demo and begin the certification process.

**Submitted Information:**
- Contact: Dylan Baker, CEO
- Email: dylan@concentriccorp.us
- Company Size: 1-20 employees
- Country: United States
- Primary Interest: Automated Compliance
- Referral Source: Search Engine

**Next Steps:**
1. Vanta will schedule a customized demo call
2. Onboard to Vanta platform and connect integrations (GitHub, Supabase, Vercel)
3. Complete readiness assessment and gap analysis
4. Implement any additional controls identified
5. Begin observation period (3-12 months for Type II)
6. Complete SOC 2 Type II audit with Vanta-certified auditor

## Executive Summary

This document tracks the implementation status of vendor qualification requirements for providing software to Y-12 Federal Credit Union, a federally-insured credit union regulated by NCUA.

---

## 1. Regulatory Compliance

| Requirement | Status | Implementation Details |
|-------------|--------|------------------------|
| NCUA Part 748 Compliance | IMPLEMENTED | Information security program with RLS, audit logging, and access controls |
| Gramm-Leach-Bliley Act (GLBA) | IMPLEMENTED | Data protection via encryption at rest (AES-256) and in transit (TLS 1.3) |
| BSA/AML Support | IMPLEMENTED | compliance_alerts table with automated monitoring triggers |
| CFPB Regulations | IMPLEMENTED | Fair lending compliance built into loan workflows |
| State Regulations (TN, KY) | REVIEWED | Application designed for Tennessee and Kentucky operations |

---

## 2. Security Controls

### 2.1 Data Encryption

| Control | Status | Details |
|---------|--------|---------|
| Encryption at Rest | ACTIVE | AES-256 via Supabase PostgreSQL |
| Encryption in Transit | ACTIVE | TLS 1.3 for all API communications |

### 2.2 Access Control

| Control | Status | Details |
|---------|--------|---------|
| Role-Based Access Control (RBAC) | IMPLEMENTED | Roles: admin, loan_officer, underwriter, compliance_officer |
| Row Level Security (RLS) | ENABLED | All tables have RLS policies |
| MFA Support | AVAILABLE | Supabase Auth supports TOTP MFA |

### 2.3 Audit Logging

| Component | Status | Details |
|-----------|--------|---------|
| Database Audit Triggers | ACTIVE | Logs INSERT/UPDATE/DELETE on all core tables |
| Security Events Table | ACTIVE | Captures login, logout, password changes, admin actions |
| IP Address Logging | ACTIVE | Via security-event Edge Function |
| User Agent Logging | ACTIVE | Via security-event Edge Function |

**Tables with Audit Triggers:**
- members
- loan_applications
- loans
- loan_payments
- compliance_alerts
- incident_log

---

## 3. BSA/AML Monitoring

### 3.1 Compliance Alerts System

| Feature | Status | Details |
|---------|--------|---------|
| compliance_alerts Table | CREATED | Stores all compliance alerts |
| Large Transaction Detection | CONFIGURED | Threshold: $10,000 (CTR requirement) |
| Rapid Payment Detection | CONFIGURED | 5+ payments within 24 hours |
| Structuring Detection | CONFIGURED | Transactions just under reporting threshold |
| Alert Severity Levels | IMPLEMENTED | low, medium, high, critical |
| Alert Status Workflow | IMPLEMENTED | open, under_review, escalated, closed, false_positive |

### 3.2 Automated Monitoring

| Trigger | Status | Details |
|---------|--------|---------|
| check_payment_compliance | ACTIVE | Runs on every loan_payment INSERT |
| Configurable Thresholds | ACTIVE | Via compliance_config table |

---

## 4. Incident Response

### 4.1 Incident Log Table

| Field | Purpose |
|-------|---------|
| incident_type | security_breach, data_exposure, unauthorized_access, system_outage, compliance_violation, fraud_detected |
| severity | low, medium, high, critical |
| affected_members | Count of impacted members |
| containment_actions | Steps taken to contain incident |
| remediation_actions | Steps taken to remediate |
| reported_to_ncua | Whether NCUA was notified |
| ncua_report_date | Date of NCUA notification |

---

## 5. Data Retention

| Table | Retention Period | Regulatory Basis |
|-------|------------------|------------------|
| audit_logs | 7 years | NCUA Part 749 |
| security_events | 7 years | NCUA Part 748 |
| compliance_alerts | 7 years | BSA requirements |
| loan_applications | 7 years | NCUA Part 749 |
| loan_payments | 7 years | NCUA Part 749 |
| incident_log | 7 years | NCUA Part 748 |

---

## 6. Business Continuity

| Component | Status | Details |
|-----------|--------|---------|
| RTO (Recovery Time Objective) | 4 hours | Supabase managed infrastructure |
| RPO (Recovery Point Objective) | 1 hour | Real-time replication |
| Backup Frequency | Continuous | Supabase automatic backups |
| Geographic Redundancy | ACTIVE | Multi-region via Supabase |

---

## 7. Vendor Management Commitments

| Commitment | Status |
|------------|--------|
| Right to Audit | AGREED |
| Data Ownership (Y-12 FCU) | CONFIRMED |
| 24-Hour Incident Notification | COMMITTED |
| 90-Day Exit Transition Support | COMMITTED |
| Subcontractor Disclosure | DOCUMENTED |

**Disclosed Subcontractors:**
- Supabase (Database, Authentication)
- Vercel (Application Hosting)
- OpenAI (AI Model Provider)

---

## 8. Technical Implementation Files

| File | Purpose |
|------|---------|
| `supabase/migrations/001_create_y12_loan_portal_tables.sql` | Core schema with RLS |
| `supabase/migrations/002_create_member_on_signup_trigger.sql` | Auto member creation |
| `supabase/migrations/003_compliance_and_security_enhancements.sql` | Compliance tables and triggers |
| `supabase/functions/security-event/index.ts` | Security event logging with IP/UA |
| `supabase/functions/fred-ai/index.ts` | FRED AI assistant |

---

## 9. Pending Items

| Item | Priority | Target Date |
|------|----------|-------------|
| SOC 2 Type II Certification | HIGH | Q2 2026 |
| ISO 27001 Certification | MEDIUM | Q4 2026 |
| Annual Penetration Testing | HIGH | Q1 2026 |
| MFA Enforcement for Admin Roles | MEDIUM | Q1 2026 |

---

## 10. Contact

**Concentric Corporation of America**
Dylan Baker, CEO
Email: dylan@concentriccorp.us

---

*This document is maintained as part of the Y12 Loan Portal compliance program and should be updated whenever security controls or compliance measures are modified.*
