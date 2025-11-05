"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
}

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [formData, setFormData] = useState<Property>({
    name: "",
    address: { street: "", city: "", state: "", zip: "" },
    purchase_price: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editFormData, setEditFormData] = useState<Property>({
    name: "",
    address: { street: "", city: "", state: "", zip: "" },
    purchase_price: 0,
    current_value: undefined,
  });

  let API_URL = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    : "http://localhost:8000";
  if (API_URL.endsWith("/")) API_URL = API_URL.slice(0, -1);
  console.log("[DEBUG] Using backend API URL:", API_URL);

  useEffect(() => {
    // Clear any text selection immediately
    if (typeof window !== 'undefined') {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
      // Also blur any focused elements
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
    
    // Check authentication first
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    // Log API URL for debugging
    console.log('Properties page - API_URL:', API_URL);
    console.log('Current origin:', typeof window !== 'undefined' ? window.location.origin : 'N/A');
    console.log('Token exists:', !!localStorage.getItem("access_token"));
    
    // Longer delay to ensure backend is ready after redirect
    const timer = setTimeout(() => {
      fetchProperties();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function fetchProperties() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/auth");
        return;
      }
      
      // First, verify backend is reachable with retry
      let healthCheckPassed = false;
      let lastHealthError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`Health check attempt ${attempt + 1}/3 at:`, `${API_URL}/health`);
          const healthResponse = await axios.get(`${API_URL}/health`, { 
            timeout: 5000,
            validateStatus: () => true // Accept any status for health check
          });
          healthCheckPassed = true;
          console.log('Backend health check passed:', healthResponse.status);
          break;
        } catch (healthErr: any) {
          lastHealthError = healthErr;
          console.error(`Health check attempt ${attempt + 1} failed:`, {
            code: healthErr.code,
            message: healthErr.message,
            response: healthErr.response?.status
          });
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }
      
      if (!healthCheckPassed) {
        const errorMsg = lastHealthError?.code === 'ERR_NETWORK' || lastHealthError?.code === 'ECONNREFUSED'
          ? `Backend server at ${API_URL} is not running. Please start it with: cd backend && python main.py`
          : `Backend at ${API_URL} is not reachable. Last error: ${lastHealthError?.message || 'Unknown'}`;
        throw new Error(errorMsg);
      }
      
      console.log('Fetching properties from:', `${API_URL}/api/properties`);
      console.log('Token length:', token?.length);
      console.log('Token preview:', token ? `${token.substring(0, 20)}...` : 'No token');
      
      // Use same pattern as auth page with timeout
      console.log('Making request to:', `${API_URL}/api/properties`);
      const { data } = await axios.get(`${API_URL}/api/properties`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        timeout: 10000, // 10 second timeout
      });
      
      console.log('Properties response received:', data);
      if (Array.isArray(data)) {
        setProperties(data);
      } else {
        console.warn("Unexpected response type:", data);
        setProperties([]);
      }
    } catch (err: any) {
      console.error("=== Fetch properties error ===");
      console.error("Error object:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      console.error("Error response:", err.response);
      console.error("Error response status:", err.response?.status);
      console.error("Error response data:", err.response?.data);
      console.error("Request config:", err.config);
      console.error("Request URL:", err.config?.url);
      console.error("=============================");
      
      let errorMessage = "Failed to load properties.";
      
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || err.message?.includes('Failed to fetch')) {
        errorMessage = `Cannot connect to backend at ${API_URL}. Please verify:
1. The backend server is running
   → Try: cd backend && python main.py
2. The backend is accessible at ${API_URL}
   → Test in browser: ${API_URL}/health
3. Check browser console for CORS errors
4. Make sure you're using the correct API URL`;
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = `Request to backend timed out. The server at ${API_URL} may be slow or unresponsive.`;
      } else if (err.response?.status) {
        const status = err.response.status;
        const detail = err.response.data?.detail || err.response.data?.message || err.response.statusText;
        errorMessage = `Backend returned ${status}: ${detail}`;
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }
      
      setError(errorMessage);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }

  async function createProperty(e: React.FormEvent) {
    e.preventDefault();
    setError(""); // Clear previous errors
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(`${API_URL}/api/properties`, formData, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 10000, // 10 second timeout
      });
      
      // Property created successfully - try to refresh the list
      // If refresh fails, we'll still show success since the property was created
      try {
        await fetchProperties();
      } catch (refreshErr: any) {
        // Refresh failed, but property was created - show warning
        console.warn("Property created but failed to refresh list:", refreshErr);
        // Add the created property to state manually so user can see it
        if (response.data && (response.data._id || response.data.id)) {
          const newProperty = {
            ...response.data,
            _id: response.data._id || response.data.id,
          };
          setProperties(prev => [...prev, newProperty]);
        }
      }
      
      setFormData({
        name: "",
        address: { street: "", city: "", state: "", zip: "" },
        purchase_price: 0,
      });
    } catch (err: any) {
      console.error("Create property error:", err);
      let errorMessage = "Error creating property.";
      
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMessage = `Cannot connect to backend at ${API_URL}. Please ensure the backend server is running.`;
      } else if (err.response?.status) {
        const status = err.response.status;
        const detail = err.response.data?.detail || err.response.data?.message || err.response.statusText;
        errorMessage = `Failed to create property: ${status} ${detail}`;
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }
      
      setError(errorMessage);
    }
  }

  function startEdit(property: Property) {
    setEditingProperty(property);
    setEditFormData({
      name: property.name,
      address: { ...property.address },
      purchase_price: property.purchase_price,
      current_value: property.current_value,
    });
    setError("");
  }

  function cancelEdit() {
    setEditingProperty(null);
    setEditFormData({
      name: "",
      address: { street: "", city: "", state: "", zip: "" },
      purchase_price: 0,
      current_value: undefined,
    });
    setError("");
  }

  async function updateProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProperty?._id) return;
    
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      
      // Prepare update data - only include fields that are provided
      const updateData: any = {};
      if (editFormData.name) updateData.name = editFormData.name;
      if (editFormData.address) updateData.address = editFormData.address;
      if (editFormData.purchase_price !== undefined) updateData.purchase_price = editFormData.purchase_price;
      if (editFormData.current_value !== undefined) updateData.current_value = editFormData.current_value;
      
      await axios.patch(`${API_URL}/api/properties/${editingProperty._id}`, updateData, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 10000,
      });
      
      // Property updated successfully - refresh the list
      try {
        await fetchProperties();
      } catch (refreshErr: any) {
        console.warn("Property updated but failed to refresh list:", refreshErr);
        // Manually update the property in state
        setProperties(prev => prev.map(p => 
          p._id === editingProperty._id ? { ...p, ...editFormData } : p
        ));
      }
      
      cancelEdit();
    } catch (err: any) {
      console.error("Update property error:", err);
      let errorMessage = "Failed to update property.";
      
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMessage = `Cannot connect to backend at ${API_URL}. Please ensure the backend server is running.`;
      } else if (err.response?.status) {
        const status = err.response.status;
        const detail = err.response.data?.detail || err.response.data?.message || err.response.statusText;
        errorMessage = `Failed to update property: ${status} ${detail}`;
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }
      
      setError(errorMessage);
    }
  }

  async function deleteProperty(id: string) {
    if (!confirm("Are you sure you want to delete this property?")) return;
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`${API_URL}/api/properties/${id}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 10000, // 10 second timeout
      });
      
      // Property deleted successfully - try to refresh the list
      // If refresh fails, manually remove the property from state
      try {
        await fetchProperties();
      } catch (refreshErr: any) {
        // Refresh failed, but property was deleted - remove it from state manually
        console.warn("Property deleted but failed to refresh list:", refreshErr);
        setProperties(prev => prev.filter(p => p._id !== id));
      }
    } catch (err: any) {
      console.error("Delete property error:", err);
      let errorMessage = "Failed to delete property.";
      
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMessage = `Cannot connect to backend at ${API_URL}. Please ensure the backend server is running.`;
      } else if (err.response?.status) {
        const detail = err.response.data?.detail || err.response.data?.message || err.response.statusText;
        errorMessage = `Failed to delete property: ${detail}`;
      }
      
      setError(errorMessage);
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    router.push("/auth");
  }

  function handleHome() {
    router.push("/cashflow");
  }

  return (
    <main 
      className="p-8"
      onMouseDown={(e) => {
        // Clear selection on mouse down if clicking on non-selectable elements
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          window.getSelection()?.removeAllRanges();
        }
      }}
    >
      {/* Header with navigation */}
      <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Property Management</h1>
            <p className="text-gray-600">Manage your real estate portfolio</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/cashflow"
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Cashflow Dashboard
            </Link>
            <div className="flex gap-4">
                 {/* Home Icon Button */}
                 <button
                   onClick={handleHome}
                   className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                   title="Dashboard"
                   aria-label="Dashboard"
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
                 
                 {/* Documents Icon Button */}
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
                 
                 {/* Logout Icon Button */}
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
      </div>
      <form onSubmit={createProperty} className="space-y-4 mb-8 border p-4 rounded">
        <input
          type="text"
          placeholder="Property Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="border p-2 w-full"
          required
        />
        <input
          type="number"
          placeholder="Purchase Price"
          value={formData.purchase_price === 0 ? "" : formData.purchase_price}
          onChange={(e) => {
            const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
            setFormData({ ...formData, purchase_price: isNaN(value) ? 0 : value });
          }}
          className="border p-2 w-full"
          min="0"
          step="0.01"
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Street"
            value={formData.address.street}
            onChange={(e) =>
              setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })
            }
            className="border p-2 w-full"
            required
          />
          <input
            type="text"
            placeholder="City"
            value={formData.address.city}
            onChange={(e) =>
              setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })
            }
            className="border p-2 w-full"
            required
          />
          <input
            type="text"
            placeholder="State"
            value={formData.address.state}
            onChange={(e) =>
              setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })
            }
            className="border p-2 w-full"
          />
          <input
            type="text"
            placeholder="ZIP"
            value={formData.address.zip}
            onChange={(e) =>
              setFormData({ ...formData, address: { ...formData.address, zip: e.target.value } })
            }
            className="border p-2 w-full"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Property
        </button>
      </form>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading properties...</p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-700 font-semibold mb-2">Error Loading Properties</p>
          <pre className="text-red-600 text-sm whitespace-pre-wrap mb-4">{error}</pre>
          <button
            onClick={() => {
              setError("");
              fetchProperties();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry Connection
          </button>
        </div>
      ) : properties.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No properties found for your account.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {properties.map((p) => (
              <li key={p._id} className="border p-4 rounded flex justify-between items-center">
                <div className="flex-1">
                  <h2 className="font-semibold">{p.name}</h2>
                  <p className="text-sm text-gray-600">
                    {p.address.street}, {p.address.city}, {p.address.state} {p.address.zip}
                  </p>
                  <p className="text-sm font-medium text-gray-700">
                    Purchase Price: ${(p.purchase_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {p.current_value && (
                    <p className="text-sm font-medium text-gray-700">
                      Current Value: ${(p.current_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(p)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProperty(p._id!)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Edit Modal */}
          {editingProperty && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Edit Property</h2>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={updateProperty} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="border p-2 w-full rounded"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Price
                    </label>
                    <input
                      type="number"
                      value={editFormData.purchase_price === 0 ? "" : editFormData.purchase_price}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
                        setEditFormData({ ...editFormData, purchase_price: isNaN(value) ? 0 : value });
                      }}
                      className="border p-2 w-full rounded"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Value (Optional)
                    </label>
                    <input
                      type="number"
                      value={editFormData.current_value === undefined || editFormData.current_value === null ? "" : editFormData.current_value}
                      onChange={(e) => {
                        const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                        setEditFormData({ ...editFormData, current_value: isNaN(value as number) ? undefined : value });
                      }}
                      className="border p-2 w-full rounded"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Street"
                        value={editFormData.address.street}
                        onChange={(e) =>
                          setEditFormData({ 
                            ...editFormData, 
                            address: { ...editFormData.address, street: e.target.value } 
                          })
                        }
                        className="border p-2 w-full rounded"
                        required
                      />
                      <input
                        type="text"
                        placeholder="City"
                        value={editFormData.address.city}
                        onChange={(e) =>
                          setEditFormData({ 
                            ...editFormData, 
                            address: { ...editFormData.address, city: e.target.value } 
                          })
                        }
                        className="border p-2 w-full rounded"
                        required
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={editFormData.address.state}
                        onChange={(e) =>
                          setEditFormData({ 
                            ...editFormData, 
                            address: { ...editFormData.address, state: e.target.value } 
                          })
                        }
                        className="border p-2 w-full rounded"
                      />
                      <input
                        type="text"
                        placeholder="ZIP"
                        value={editFormData.address.zip}
                        onChange={(e) =>
                          setEditFormData({ 
                            ...editFormData, 
                            address: { ...editFormData.address, zip: e.target.value } 
                          })
                        }
                        className="border p-2 w-full rounded"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}