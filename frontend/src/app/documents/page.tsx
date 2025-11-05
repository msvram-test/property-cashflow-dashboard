"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface Property {
  _id?: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  purchase_price: number;
  current_value?: number;
  rental_income?: number;
  expenses?: number;
  documents?: Document[];
}

interface Document {
  _id?: string;
  document_type: string;
  filename: string;
  uploaded_at: string;
  statement_date?: string;
  extracted_data?: {
    extracted_fields?: {
      income?: number;
      expenses?: number;
      date?: string;
      principal?: number;
      interest?: number;
      escrow?: number;
      total_payment?: number;
      tax_amount?: number;
      assessment_value?: number;
      due_date?: string;
      premium_amount?: number;
      coverage_amount?: number;
      policy_number?: string;
      expiration_date?: string;
      // Allow any additional fields from Textract
      [key: string]: any;
    };
    status?: string;
    notes?: string;
    raw_text?: string;
    error?: string;
    error_type?: string;
    technical_details?: string;
  };
}

export default function DocumentsPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const API_URL = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    : "http://localhost:8000";
  const cleanAPI_URL = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;

  useEffect(() => {
    // Check authentication first
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    // Get propertyId from URL query parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const propId = params.get("propertyId");
      setPropertyId(propId);
    }
    
    // Fetch properties regardless of propertyId (will filter inside fetchProperties)
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProperties() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/auth");
        return;
      }

      // Get current propertyId from URL or state
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const currentPropertyId = params?.get("propertyId") || propertyId;

      const { data } = await axios.get(`${cleanAPI_URL}/api/properties`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        timeout: 10000,
      });

      if (Array.isArray(data)) {
        // If propertyId is provided in URL, filter to show only that property
        if (currentPropertyId) {
          const selectedProperty = data.find((prop: Property) => prop._id === currentPropertyId);
          if (selectedProperty) {
            // Property found - show it even if no documents
            setProperties([selectedProperty]);
          } else {
            // Property not found
            setProperties([]);
            setError(`Property not found.`);
          }
        } else {
          // No propertyId specified - show all properties with documents
          const propertiesWithDocs = data.filter((prop: Property) => 
            prop.documents && Array.isArray(prop.documents) && prop.documents.length > 0
          );
          setProperties(propertiesWithDocs);
        }
      }
    } catch (err: any) {
      console.error("Fetch properties error:", err);
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        localStorage.removeItem("access_token");
        setTimeout(() => router.push("/auth"), 2000);
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError(`Cannot connect to backend at ${cleanAPI_URL}. Please ensure the backend is running.`);
      } else {
        setError(err.response?.data?.detail || "Failed to load properties.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDocument(propertyId: string, documentId: string) {
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }

    setError("");
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Not authenticated. Please log in first.");
        router.push("/auth");
        return;
      }

      await axios.delete(
        `${cleanAPI_URL}/api/properties/${propertyId}/documents/${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          timeout: 10000,
        }
      );

      // Refresh properties to reflect the deletion
      await fetchProperties();
      alert("Document deleted successfully!");
    } catch (err: any) {
      console.error("Delete document error:", err);
      if (err.response?.status === 401) {
        setError("Authentication failed. Please log in again.");
        localStorage.removeItem("access_token");
        router.push("/auth");
      } else {
        setError(err.response?.data?.detail || "Failed to delete document.");
      }
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    router.push("/auth");
  }

  function formatDocumentType(type: string): string {
    return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }

  function renderExtractedFields(doc: Document) {
    const extractedData = doc.extracted_data;
    const fields = extractedData?.extracted_fields;
    const rawText = extractedData?.raw_text;
    const status = extractedData?.status;
    
    // Define field labels for all document types
    const fieldLabels: Record<string, string> = {
      income: "Income",
      expenses: "Expenses",
      date: "Date",
      principal: "Principal",
      interest: "Interest",
      escrow: "Escrow",
      total_payment: "Total Payment",
      tax_amount: "Tax Amount",
      assessment_value: "Assessment Value",
      due_date: "Due Date",
      premium_amount: "Premium Amount",
      coverage_amount: "Coverage Amount",
      policy_number: "Policy Number",
      expiration_date: "Expiration Date",
      // Common Textract-extracted field names
      amount: "Amount",
      total: "Total",
      statement_date: "Statement Date",
      balance: "Balance",
      payment: "Payment",
    };

    // Helper function to format field names (capitalize, replace underscores)
    const formatFieldName = (key: string): string => {
      if (fieldLabels[key.toLowerCase()]) {
        return fieldLabels[key.toLowerCase()];
      }
      // Capitalize first letter and replace underscores/special chars
      return key
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    };

    // Helper function to format value (detect currency, dates, etc.)
    const formatValue = (key: string, value: any): string => {
      if (value === null || value === undefined) {
        return "Not extracted";
      }
      
      const valueStr = String(value).trim();
      const lowerKey = key.toLowerCase();
      
      // Try to detect currency amounts
      if (valueStr.match(/^\$?[\d,]+\.?\d*$/) || 
          lowerKey.includes('amount') || 
          lowerKey.includes('income') || 
          lowerKey.includes('expenses') || 
          lowerKey.includes('payment') || 
          lowerKey.includes('total') ||
          lowerKey.includes('balance') ||
          lowerKey.includes('principal') || 
          lowerKey.includes('interest') || 
          lowerKey.includes('escrow') ||
          lowerKey.includes('premium') ||
          lowerKey.includes('tax') ||
          lowerKey.includes('value')) {
        // Remove $ and commas, parse as number
        const numValue = parseFloat(valueStr.replace(/[$,]/g, ''));
        if (!isNaN(numValue)) {
          return `$${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
      }
      
      return valueStr;
    };

    // Show extracted fields if they exist
    if (fields && Object.keys(fields).length > 0) {
      const entries = Object.entries(fields);
      const hasAnyData = entries.some(([_, value]) => value !== null && value !== undefined && String(value).trim() !== '');

      return (
        <div className="mt-3 p-3 bg-gray-50 rounded">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Extracted Data:
            {status === "ocr_success" && (
              <span className="ml-2 text-xs text-green-600 font-normal">(OCR Successful)</span>
            )}
            {!hasAnyData && (
              <span className="ml-2 text-xs text-orange-600 font-normal">
                (Fields found but no values extracted)
              </span>
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {entries.map(([key, value]) => {
              const formattedValue = formatValue(key, value);
              const hasValue = value !== null && value !== undefined && String(value).trim() !== '';
              
              return (
                <div key={key} className="flex justify-between">
                  <span className="text-sm text-gray-600">{formatFieldName(key)}:</span>
                  <span className={`text-sm font-medium ${hasValue ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {hasValue ? formattedValue : <span className="text-xs">Not extracted</span>}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Show raw text if available and fields are empty or minimal */}
          {rawText && (!hasAnyData || entries.length < 3) && (
            <details className="mt-3 pt-3 border-t border-gray-200">
              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                View Full Extracted Text
              </summary>
              <div className="mt-2 p-2 bg-white rounded border text-xs text-gray-700 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                {rawText}
              </div>
            </details>
          )}
        </div>
      );
    }

    // Show raw text if available but no structured fields
    if (rawText && status === "ocr_success") {
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Extracted Data:
            <span className="ml-2 text-xs text-green-600 font-normal">(OCR Successful)</span>
          </p>
          <p className="text-xs text-gray-600 mb-2">
            Text extraction completed, but no structured fields were detected. Showing raw text:
          </p>
          <details>
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
              View Extracted Text
            </summary>
            <div className="mt-2 p-2 bg-white rounded border text-xs text-gray-700 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
              {rawText}
            </div>
          </details>
        </div>
      );
    }

    // No extracted data at all
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded">
        <p className="text-sm font-semibold text-gray-700 mb-2">Extracted Data:</p>
        {status === "ocr_success" ? (
          <p className="text-sm text-gray-500 italic">
            OCR processing completed, but no extractable fields were found in this document.
          </p>
        ) : status === "ocr_failed" ? (
          <div>
            <p className="text-sm text-red-600 mb-1">OCR processing failed.</p>
            {extractedData?.error && (
              <p className="text-xs text-red-500">{extractedData.error}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No extraction fields defined for this document type.</p>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Document Data View</h1>
              <p className="text-gray-600">View and manage your property documents</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push("/cashflow")}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                title="Cashflow Dashboard"
                aria-label="Cashflow Dashboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-red-100 transition-colors"
                title="Logout"
                aria-label="Logout"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-red-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading properties and documents...</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 text-lg mb-2">No properties with uploaded documents found.</p>
          <button
            onClick={() => router.push("/cashflow")}
            className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
          >
            Go to Cashflow Dashboard
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => (
            <div key={property._id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
              {/* Property Header */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  {property.name}
                </h2>
                <p className="text-gray-600 mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {property.address.street}, {property.address.city}, {property.address.state} {property.address.zip}
                </p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs text-gray-500 mb-1">Purchase Price</p>
                    <p className="font-semibold text-gray-800">
                      ${(property.purchase_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  {property.current_value && (
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <p className="text-xs text-gray-500 mb-1">Current Value</p>
                      <p className="font-semibold text-purple-700">
                        ${property.current_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  {property.rental_income && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                      <p className="text-xs text-gray-500 mb-1">Rental Income</p>
                      <p className="font-semibold text-green-600">
                        ${property.rental_income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  {property.expenses && (
                    <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <p className="text-xs text-gray-500 mb-1">Expenses</p>
                      <p className="font-semibold text-red-600">
                        ${property.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents List */}
              <div>
                <h3 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Uploaded Documents
                </h3>
                {property.documents && property.documents.length > 0 ? (
                  <div className="space-y-4">
                    {property.documents.map((doc, index) => (
                      <div
                        key={doc._id || index}
                        className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all duration-200 hover:border-blue-300"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                                {formatDocumentType(doc.document_type)}
                              </span>
                              {doc.statement_date && (
                                <span className="text-xs text-gray-600">
                                  Statement: {new Date(doc.statement_date).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                Uploaded: {new Date(doc.uploaded_at).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900">{doc.filename}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteDocument(property._id!, doc._id!)}
                            className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Delete Document"
                            aria-label="Delete Document"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                        </div>
                        
                        {doc.extracted_data?.notes && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-xs text-yellow-800">{doc.extracted_data.notes}</p>
                          </div>
                        )}

                        {doc.extracted_data?.status === "ocr_failed" && doc.extracted_data?.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-xs font-semibold text-red-800 mb-1">OCR Processing Failed:</p>
                            <p className="text-xs text-red-700">{doc.extracted_data.error}</p>
                            {doc.extracted_data.technical_details && (
                              <details className="mt-1">
                                <summary className="text-xs text-red-600 cursor-pointer">Technical Details</summary>
                                <p className="text-xs text-red-600 mt-1 font-mono">{doc.extracted_data.technical_details}</p>
                              </details>
                            )}
                          </div>
                        )}

                        {renderExtractedFields(doc)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">No documents uploaded for this property.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </main>
  );
}

