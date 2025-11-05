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
  type?: string;
  document_type?: string;
  filename: string;
  uploaded_at: string;
  statement_date?: string;
  extracted_data?: any;
}

export default function DashboardPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<string>("");
  const [error, setError] = useState("");
  const [useOCR, setUseOCR] = useState(false);

  let API_URL = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    : "http://localhost:8000";
  if (API_URL.endsWith("/")) API_URL = API_URL.slice(0, -1);

  useEffect(() => {
    // Check authentication first
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    fetchProperties();
    // Load OCR preference from localStorage
    const ocrPreference = localStorage.getItem("useOCR");
    setUseOCR(ocrPreference === "true");
  }, [router]);

  async function fetchProperties() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Not authenticated. Please log in.");
        router.push("/auth");
        return;
      }

      console.log("Fetching properties with token:", token.substring(0, 20) + "...");
      console.log("API URL:", `${API_URL}/api/properties`);

      const { data } = await axios.get(`${API_URL}/api/properties`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        timeout: 10000,
      });

      if (Array.isArray(data)) {
        setProperties(data);
        if (data.length > 0 && !selectedProperty) {
          setSelectedProperty(data[0]);
        }
      }
    } catch (err: any) {
      console.error("Fetch properties error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        localStorage.removeItem("access_token");
        setTimeout(() => router.push("/auth"), 2000);
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError(`Cannot connect to backend at ${API_URL}. Please ensure the backend is running.`);
      } else {
        setError(err.response?.data?.detail || "Failed to load properties.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchPropertyDetails(propertyId: string) {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/auth");
        return;
      }

      const { data } = await axios.get(`${API_URL}/api/properties/${propertyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setSelectedProperty(data);
    } catch (err: any) {
      console.error("Fetch property details error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/auth");
      }
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
        `${API_URL}/api/properties/${propertyId}/documents/${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          timeout: 10000,
        }
      );

      // Refresh property details to reflect the deletion
      await fetchPropertyDetails(propertyId);
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, propertyId: string, docType: string) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Not authenticated. Please log in first.");
        router.push("/auth");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", docType);

      const { data } = await axios.post(
        `${API_URL}/api/properties/${propertyId}/documents`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type manually - axios will set it with boundary
          },
          timeout: 30000,
        }
      );

      // Refresh property details
      // Refresh property details and property list after upload
      await fetchPropertyDetails(propertyId);
      await fetchProperties();
      setUploadType("");
      alert("Document uploaded successfully and cashflow data updated!");
    } catch (err: any) {
      console.error("Upload error:", err);
      if (err.response?.status === 401) {
        setError("Authentication failed. Please log in again.");
        localStorage.removeItem("access_token");
        router.push("/auth");
      } else {
        setError(err.response?.data?.detail || "Failed to upload document.");
      }
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  }

  async function handleOCRUpload(e: React.ChangeEvent<HTMLInputElement>, propertyId: string, docType: string) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Not authenticated. Please log in first.");
        router.push("/auth");
        return;
      }

      // Prepare form data for OCR endpoint
      const formData = new FormData();
      formData.append("file", file);
      formData.append("property_id", propertyId);
      formData.append("document_type", docType);

      console.log("=== OCR Upload Request ===");
      console.log("Endpoint:", `${API_URL}/api/ocr/upload`);
      console.log("Property ID:", propertyId);
      console.log("Document Type:", docType);
      console.log("File Name:", file.name);
      console.log("File Size:", file.size, "bytes");
      console.log("File Type:", file.type);
      console.log("=========================");

      const { data } = await axios.post(
        `${API_URL}/api/ocr/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type manually - axios will set it with boundary
          },
          timeout: 60000, // OCR can take longer, so 60 seconds
        }
      );

      console.log("=== OCR Upload Response ===");
      console.log("Full Response:", JSON.stringify(data, null, 2));
      console.log("OCR Status:", data.document?.extracted_data?.status);
      if (data.document?.extracted_data?.error) {
        console.error("OCR Error:", data.document.extracted_data.error);
        console.error("Error Type:", data.document.extracted_data.error_type);
        console.error("Technical Details:", data.document.extracted_data.technical_details);
      }
      console.log("==========================");

      // Refresh property details to show the new document
      await fetchPropertyDetails(propertyId);
      setUploadType("");
      
      // Show success message with OCR status
      const ocrStatus = data.document?.extracted_data?.status || "unknown";
      const ocrError = data.document?.extracted_data?.error;
      const ocrErrorType = data.document?.extracted_data?.error_type;
      
      if (ocrStatus === "ocr_success") {
        alert("Document uploaded and OCR processed successfully!");
      } else if (ocrStatus === "ocr_failed") {
        const errorMsg = ocrError || "Unknown error occurred during OCR processing.";
        // Check if it's a subscription error for a more specific message
        const isSubscriptionError = ocrErrorType === "SubscriptionRequiredException" || 
                                   errorMsg?.includes("subscription") || 
                                   errorMsg?.includes("SubscriptionRequired");
        
        if (isSubscriptionError) {
          alert(`Document uploaded successfully!\n\n⚠️ OCR Processing Failed\n\n${errorMsg}\n\nThe document has been saved, but text extraction is unavailable until AWS Textract is enabled.`);
        } else {
          alert(`Document uploaded successfully!\n\n⚠️ OCR Processing Failed\n\n${errorMsg}\n\nThe document has been saved, but text extraction was unsuccessful.`);
        }
        setError(`OCR processing failed: ${errorMsg}`);
      } else if (ocrStatus === "aws_credentials_not_configured") {
        alert(`Document uploaded successfully!\n\nℹ️ OCR Status: AWS Textract credentials not configured.\n\nOCR will be available once AWS credentials are set up.`);
      } else {
        alert("Document uploaded successfully!");
      }
    } catch (err: any) {
      console.error("OCR Upload error:", err);
      console.error("Error response:", err.response?.data);
      if (err.response?.status === 401) {
        setError("Authentication failed. Please log in again.");
        localStorage.removeItem("access_token");
        router.push("/auth");
      } else if (err.response?.status === 404) {
        setError("OCR endpoint not found. Make sure the backend is running and the route is registered.");
      } else {
        setError(err.response?.data?.detail || err.message || "Failed to upload document with OCR.");
      }
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    router.push("/auth");
  }

  const documentTypes = [
    { value: "property_document", label: "Property Document" },
    { value: "monthly_statement", label: "Monthly Statement" },
    { value: "property_insurance", label: "Property Insurance" },
    { value: "property_tax", label: "Property Tax" },
    { value: "mortgage_statement", label: "Mortgage Statement" },
  ];

  return (
    <main className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
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
            onClick={() => router.push("/cashflow")}
            className="p-2 rounded-full hover:bg-green-100 transition-colors"
            title="View Cashflow"
            aria-label="View Cashflow"
          >
            <img
              src="/cashflow.svg"
              alt="Cashflow Icon"
              className="w-6 h-6 text-green-600"
            />
          </button>
          <button
            onClick={() => router.push("/documents")}
            className="p-2 rounded-full hover:bg-blue-100 transition-colors"
            title="View Document Data"
            aria-label="View Document Data"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-blue-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <p>Loading properties...</p>
      ) : properties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No properties found.</p>
          <button
            onClick={() => router.push("/properties")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Your First Property
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Property List Column */}
          <div className="col-span-1">
            <h2 className="text-xl font-semibold mb-4">Properties</h2>
            <div className="space-y-2">
              {properties.map((property) => (
                <button
                  key={property._id}
                  onClick={() => {
                    setSelectedProperty(property);
                    fetchPropertyDetails(property._id!);
                  }}
                  className={`w-full text-left p-4 rounded border-2 transition-colors ${
                    selectedProperty?._id === property._id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <h3 className="font-semibold">{property.name}</h3>
                  <p className="text-sm text-gray-600">
                    {property.address.city}, {property.address.state}
                  </p>
                  <p className="text-sm font-medium text-gray-700 mt-1">
                    ${(property.purchase_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Property Details Column */}
          <div className="col-span-2">
            {selectedProperty ? (
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">{selectedProperty.name}</h2>
                
                {/* Property Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Property Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium">
                        {selectedProperty.address.street}, {selectedProperty.address.city}, {selectedProperty.address.state} {selectedProperty.address.zip}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Purchase Price</p>
                      <p className="font-medium">
                        ${(selectedProperty.purchase_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    {selectedProperty.current_value && (
                      <div>
                        <p className="text-sm text-gray-600">Current Value</p>
                        <p className="font-medium">
                          ${selectedProperty.current_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                    {selectedProperty.rental_income && (
                      <div>
                        <p className="text-sm text-gray-600">Rental Income</p>
                        <p className="font-medium text-green-600">
                          ${selectedProperty.rental_income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                    {selectedProperty.expenses && (
                      <div>
                        <p className="text-sm text-gray-600">Expenses</p>
                        <p className="font-medium text-red-600">
                          ${selectedProperty.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Upload Section */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">Upload Documents</h3>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        id="useOCR"
                        className="rounded"
                        checked={useOCR}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUseOCR(checked);
                          localStorage.setItem("useOCR", checked.toString());
                        }}
                      />
                      <span>Use OCR (AWS Textract)</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {documentTypes.map((docType) => (
                      <div key={docType.value} className="border rounded p-3">
                        <label className="block text-sm font-medium mb-2">
                          {docType.label}
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            if (useOCR) {
                              handleOCRUpload(e, selectedProperty._id!, docType.value);
                            } else {
                              handleFileUpload(e, selectedProperty._id!, docType.value);
                            }
                          }}
                          disabled={uploading}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                        />
                      </div>
                    ))}
                  </div>
                  {uploading && (
                    <p className="mt-2 text-sm text-gray-600">Uploading document{useOCR ? " with OCR" : ""}...</p>
                  )}
                </div>

                {/* Documents List */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Uploaded Documents</h3>
                  {selectedProperty.documents && Array.isArray(selectedProperty.documents) && selectedProperty.documents.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProperty.documents.map((doc) => (
                        <div
                          key={doc._id}
                          className="flex justify-between items-center border rounded p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{doc.filename || doc.document_type || 'Document'}</p>
                            <p className="text-sm text-gray-600">
                              {doc.document_type ? doc.document_type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) : doc.type?.replace(/_/g, " ") || 'Unknown'}
                              {doc.statement_date && (
                                <> • Statement: {new Date(doc.statement_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</>
                              )}
                              {doc.uploaded_at && (
                                <> • Uploaded: {new Date(doc.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteDocument(selectedProperty._id!, doc._id!)}
                            className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
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
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No documents uploaded yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border rounded-lg p-6 text-center text-gray-500">
                Select a property to view details
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

