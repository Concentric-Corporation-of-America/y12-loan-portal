// Core Banking Integration Edge Function
// Connects Y12 Loan Portal to Jack Henry Symitar via SymXchange API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SymXchange Configuration
const SYMXCHANGE_ENDPOINT = Deno.env.get("SYMXCHANGE_ENDPOINT_URL") || "";
const SYMXCHANGE_ADMIN_PASSWORD = Deno.env.get("SYMXCHANGE_ADMIN_PASSWORD") || "";
const SYMXCHANGE_DEVICE_TYPE = Deno.env.get("SYMXCHANGE_DEVICE_TYPE") || "CLIENTSYSTEM";
const SYMXCHANGE_DEVICE_NUMBER = Deno.env.get("SYMXCHANGE_DEVICE_NUMBER") || "20000";

// Supabase Configuration
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface CoreBankingRequest {
  operation: "newLoan" | "makeLoanPayment" | "getAccountInfo" | "transferFunds" | "syncBalances";
  data: Record<string, unknown>;
}

interface SymXchangeResponse {
  success: boolean;
  confirmationNumber?: string;
  statusCode: number;
  message: string;
  data?: Record<string, unknown>;
}

// XML Builder for SOAP Envelope
function buildSoapEnvelope(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:tran="http://www.symxchange.generated.symitar.com/v1/transactions"
    xmlns:inq="http://www.symxchange.generated.symitar.com/v1/inquiry"
    xmlns:com="http://www.symxchange.generated.symitar.com/v1/common/dto/common"
    xmlns:dto="http://www.symxchange.generated.symitar.com/v1/transactions/dto">
  <soapenv:Header/>
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;
}

// Build Administrative Credentials XML
function buildAdminCredentials(): string {
  return `<Credentials>
    <AdministrativeCredentials>
      <Password>${SYMXCHANGE_ADMIN_PASSWORD}</Password>
    </AdministrativeCredentials>
  </Credentials>
  <DeviceInformation DeviceType="${SYMXCHANGE_DEVICE_TYPE}" DeviceNumber="${SYMXCHANGE_DEVICE_NUMBER}"/>`;
}

// Build Home Banking Credentials XML
function buildHomeBankingCredentials(userId: string, password: string): string {
  return `<Credentials>
    <HomeBankingCredentials>
      <UserId>${userId}</UserId>
      <Password>${password}</Password>
    </HomeBankingCredentials>
  </Credentials>
  <DeviceInformation DeviceType="HOMEBANKING" DeviceNumber="1"/>`;
}

// New Loan Disbursement Request
function buildNewLoanRequest(data: {
  accountNumber: string;
  loanId: string;
  totalAmount: number;
  checkAmount: number;
  payeeName?: string;
  comment?: string;
}): string {
  const payeeSection = data.payeeName ? `
    <dto:Payee>
      <PayeeLine dto:PayeeLineNumber="1">
        <LineValue>${data.payeeName}</LineValue>
      </PayeeLine>
    </dto:Payee>` : "";

  return buildSoapEnvelope(`
    <tran:newLoan>
      <Request MessageId="newLoan-${Date.now()}">
        ${buildAdminCredentials()}
        <dto:AccountNumber>${data.accountNumber}</dto:AccountNumber>
        <dto:LoanId>${data.loanId}</dto:LoanId>
        <LoanAmounts>
          <dto:TotalAmount>${data.totalAmount.toFixed(2)}</dto:TotalAmount>
          <CheckAmount>${data.checkAmount.toFixed(2)}</CheckAmount>
        </LoanAmounts>
        <dto:CheckIssuer>Y12FCU</dto:CheckIssuer>
        <dto:Comment>${data.comment || "Loan Disbursement"}</dto:Comment>
        ${payeeSection}
      </Request>
    </tran:newLoan>
  `);
}

// Loan Payment Request
function buildLoanPaymentRequest(data: {
  accountNumber: string;
  loanId: string;
  paymentAmount: number;
  sourceShareId: string;
  userId?: string;
  password?: string;
}): string {
  const credentials = data.userId && data.password
    ? buildHomeBankingCredentials(data.userId, data.password)
    : buildAdminCredentials();

  return buildSoapEnvelope(`
    <tran:makeLoanPayment>
      <Request MessageId="loanPayment-${Date.now()}">
        ${credentials}
        <dto:AccountNumber>${data.accountNumber}</dto:AccountNumber>
        <dto:LoanId>${data.loanId}</dto:LoanId>
        <dto:PaymentAmount>${data.paymentAmount.toFixed(2)}</dto:PaymentAmount>
        <dto:SourceShareId>${data.sourceShareId}</dto:SourceShareId>
      </Request>
    </tran:makeLoanPayment>
  `);
}

// Account Inquiry Request
function buildAccountInquiryRequest(data: {
  accountNumber: string;
  includeLoans?: boolean;
  includeShares?: boolean;
}): string {
  return buildSoapEnvelope(`
    <inq:getAccountInfo>
      <Request MessageId="accountInquiry-${Date.now()}">
        ${buildAdminCredentials()}
        <dto:AccountNumber>${data.accountNumber}</dto:AccountNumber>
        <IncludeLoans>${data.includeLoans !== false}</IncludeLoans>
        <IncludeShares>${data.includeShares !== false}</IncludeShares>
      </Request>
    </inq:getAccountInfo>
  `);
}

// Fund Transfer Request
function buildTransferRequest(data: {
  fromAccountNumber: string;
  toAccountNumber: string;
  fromShareId: string;
  toShareId: string;
  amount: number;
  comment?: string;
}): string {
  return buildSoapEnvelope(`
    <tran:transferFunds>
      <Request MessageId="transfer-${Date.now()}">
        ${buildAdminCredentials()}
        <dto:FromAccountNumber>${data.fromAccountNumber}</dto:FromAccountNumber>
        <dto:ToAccountNumber>${data.toAccountNumber}</dto:ToAccountNumber>
        <dto:FromShareId>${data.fromShareId}</dto:FromShareId>
        <dto:ToShareId>${data.toShareId}</dto:ToShareId>
        <dto:Amount>${data.amount.toFixed(2)}</dto:Amount>
        <dto:Comment>${data.comment || "Fund Transfer"}</dto:Comment>
      </Request>
    </tran:transferFunds>
  `);
}

// Parse SymXchange SOAP Response
function parseSymXchangeResponse(xmlResponse: string): SymXchangeResponse {
  // Extract StatusCode
  const statusCodeMatch = xmlResponse.match(/StatusCode="(\d+)"/);
  const statusCode = statusCodeMatch ? parseInt(statusCodeMatch[1]) : -1;

  // Extract Confirmation Number
  const confirmationMatch = xmlResponse.match(/Confirmation="([^"]+)"/);
  const confirmationNumber = confirmationMatch ? confirmationMatch[1] : undefined;

  // Extract MessageId
  const messageIdMatch = xmlResponse.match(/MessageId="([^"]+)"/);
  const messageId = messageIdMatch ? messageIdMatch[1] : "";

  // Check for SOAP Fault
  const faultMatch = xmlResponse.match(/<faultstring>([^<]+)<\/faultstring>/);
  if (faultMatch) {
    return {
      success: false,
      statusCode: -1,
      message: faultMatch[1],
    };
  }

  return {
    success: statusCode === 0,
    confirmationNumber,
    statusCode,
    message: statusCode === 0 ? "Success" : `Error code: ${statusCode}`,
    data: {
      messageId,
      rawResponse: xmlResponse,
    },
  };
}

// Send SOAP Request to SymXchange
async function sendSymXchangeRequest(
  soapRequest: string,
  servicePath: string
): Promise<SymXchangeResponse> {
  // Check if SymXchange is configured
  if (!SYMXCHANGE_ENDPOINT) {
    console.log("SymXchange not configured - returning mock response");
    return {
      success: true,
      confirmationNumber: `MOCK-${Date.now()}`,
      statusCode: 0,
      message: "Mock response - SymXchange not configured",
      data: { mock: true },
    };
  }

  const url = `${SYMXCHANGE_ENDPOINT}${servicePath}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "",
      },
      body: soapRequest,
    });

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        message: `HTTP Error: ${response.status} ${response.statusText}`,
      };
    }

    const xmlResponse = await response.text();
    return parseSymXchangeResponse(xmlResponse);
  } catch (error) {
    console.error("SymXchange request failed:", error);
    return {
      success: false,
      statusCode: -1,
      message: `Connection error: ${error.message}`,
    };
  }
}

// Log transaction to Supabase audit table
async function logTransaction(
  supabase: ReturnType<typeof createClient>,
  operation: string,
  request: Record<string, unknown>,
  response: SymXchangeResponse
): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      table_name: "core_banking",
      record_id: response.confirmationNumber || `${operation}-${Date.now()}`,
      operation: operation,
      old_data: null,
      new_data: {
        request: { ...request, password: "[REDACTED]" },
        response: {
          success: response.success,
          confirmationNumber: response.confirmationNumber,
          statusCode: response.statusCode,
          message: response.message,
        },
      },
      changed_by: "system",
    });
  } catch (error) {
    console.error("Failed to log transaction:", error);
  }
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { operation, data } = (await req.json()) as CoreBankingRequest;

    let response: SymXchangeResponse;
    let soapRequest: string;
    let servicePath: string;

    switch (operation) {
      case "newLoan":
        soapRequest = buildNewLoanRequest(data as {
          accountNumber: string;
          loanId: string;
          totalAmount: number;
          checkAmount: number;
          payeeName?: string;
          comment?: string;
        });
        servicePath = "/TransactionsService";
        response = await sendSymXchangeRequest(soapRequest, servicePath);

        // If successful, update loan status in Supabase
        if (response.success && data.loanApplicationId) {
          await supabase
            .from("loans")
            .update({
              status: "active",
              core_confirmation: response.confirmationNumber,
              disbursed_at: new Date().toISOString(),
            })
            .eq("id", data.loanApplicationId);
        }
        break;

      case "makeLoanPayment":
        soapRequest = buildLoanPaymentRequest(data as {
          accountNumber: string;
          loanId: string;
          paymentAmount: number;
          sourceShareId: string;
          userId?: string;
          password?: string;
        });
        servicePath = "/TransactionsService";
        response = await sendSymXchangeRequest(soapRequest, servicePath);

        // If successful, record payment in Supabase
        if (response.success && data.supabaseLoanId) {
          await supabase.from("loan_payments").insert({
            loan_id: data.supabaseLoanId,
            amount: data.paymentAmount,
            payment_date: new Date().toISOString().split("T")[0],
            payment_method: "core_banking",
            confirmation_number: response.confirmationNumber,
          });
        }
        break;

      case "getAccountInfo":
        soapRequest = buildAccountInquiryRequest(data as {
          accountNumber: string;
          includeLoans?: boolean;
          includeShares?: boolean;
        });
        servicePath = "/InquiryService";
        response = await sendSymXchangeRequest(soapRequest, servicePath);
        break;

      case "transferFunds":
        soapRequest = buildTransferRequest(data as {
          fromAccountNumber: string;
          toAccountNumber: string;
          fromShareId: string;
          toShareId: string;
          amount: number;
          comment?: string;
        });
        servicePath = "/TransactionsService";
        response = await sendSymXchangeRequest(soapRequest, servicePath);
        break;

      case "syncBalances":
        // Sync loan balances from core banking to Supabase
        // This would typically be called by a scheduled job
        response = {
          success: true,
          statusCode: 0,
          message: "Balance sync not yet implemented - requires account list",
        };
        break;

      default:
        response = {
          success: false,
          statusCode: -1,
          message: `Unknown operation: ${operation}`,
        };
    }

    // Log the transaction
    await logTransaction(supabase, operation, data, response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: response.success ? 200 : 400,
    });
  } catch (error) {
    console.error("Core banking error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        statusCode: -1,
        message: `Internal error: ${error.message}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
